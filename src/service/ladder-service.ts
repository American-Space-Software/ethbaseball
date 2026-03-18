import { inject, injectable } from "inversify"

import { GLICKO_SETTINGS, PLAYER_RETIREMENT_AGE, PlayerService } from "./data/player-service.js"

import { GameService } from "./data/game-service.js"
import { FinanceSeason,  RotationPitcher,  Team } from "../dto/team.js"
import {  MINIMUM_PLAYER_POOL, Rating, ContractType, Position, TeamSeasonId, DIAMONDS_PER_DAY, RewardPerTeam, OffChainEventSource, GamePlayer } from "./enums.js"
import { Game, GamePlayer as GP } from "../dto/game.js"
import { TeamService } from "./data/team-service.js"

import dayjs from "dayjs"

import glicko2 from "glicko2"
import { TeamRating } from "../repository/node/team-repository-impl.js"
import { LeagueService } from "./data/league-service.js"
import { League } from "../dto/league.js"
import { SeasonService } from "./data/season-service.js"
import { Season } from "../dto/season.js"
import { FinanceService } from "./finance-service.js"
import { TeamLeagueSeason } from "../dto/team-league-season.js"
import { TeamLeagueSeasonService } from "./data/team-league-season-service.js"
import { PlayerLeagueSeasonService } from "./data/player-league-season-service.js"
import { PlayerLeagueSeason } from "../dto/player-league-season.js"
import { v4 as uuidv4 } from 'uuid';
import { Player } from "../dto/player.js"
import { SeedService } from "./data/seed-service.js"
import { Universe } from "../dto/universe.js"
import { UniverseRepository } from "../repository/universe-repository.js"
import { StatService } from "./stat-service.js"
import { faker } from '@faker-js/faker'
import { OffchainEventService } from "./data/offchain-event-service.js"
import { GameHitResult, HitResult } from "../dto/game-hit-result.js"
import { GamePitchResult, PitchResult } from "../dto/game-pitch-result.js"
import { GameHitResultRepository } from "../repository/game-hit-result-repository.js"
import { GamePitchResultRepository } from "../repository/game-pitch-result-repository.js"
import { ethers } from "ethers"
import { TeamQueueService } from "./data/team-queue-service.js"
import { TeamQueueMatchup } from "../dto/team-queue.js"
import { RollService } from "./roll-service.js"


@injectable()
class LadderService {

    @inject("sequelize")
    private sequelize:Function

    @inject("UniverseRepository")
    private universeRepository: UniverseRepository

    @inject("GameHitResultRepository")
    private gameHitResultRepository:GameHitResultRepository

    @inject("GamePitchResultRepository")
    private gamePitchResultRepository:GamePitchResultRepository

    constructor(
        private playerService:PlayerService,
        private teamService:TeamService,
        private gameService:GameService,
        private leagueService:LeagueService,
        private seasonService:SeasonService,
        private teamLeagueSeasonService:TeamLeagueSeasonService,
        private playerLeagueSeasonService:PlayerLeagueSeasonService,
        private seedService:SeedService,
        private financeService:FinanceService,
        private statService:StatService,
        private offchainEventService:OffchainEventService,
        private teamQueueService:TeamQueueService,
        private rollService:RollService
    ) {}


    async runGameRunner(universeId:string) : Promise<string[]> {

        let s = await this.sequelize()

        let gameIds:string[] = []

        await s.transaction(async (t1) => {

            let options = { transaction: t1 }
            let rng = await this.seedService.getRNG(options)

            let universe:Universe = await this.universeRepository.get(universeId, options)

            if (!this.isDateBeforeOrEqualToToday(universe.currentDate)) return

            let leagues:League[] = await this.leagueService.listByRankAsc(options)
            let season:Season = await this.seasonService.getByDate(universe.currentDate, options)

            if (season) {

                const shouldStartDay = await this.shouldStartDay(universe)

                if (shouldStartDay) {

                    const previousDay = dayjs(universe.currentDate).format("YYYY-MM-DD")

                    // Day-level housekeeping before opening the next day.
                    if ( previousDay == dayjs(season.endDate).format("YYYY-MM-DD") && !season.isComplete ) {
                        console.time(`Finishing season...`)
                        await this.finishSeason(season, leagues, options)
                        console.timeEnd(`Finishing season...`)
                    }

                    await this.startDay(universe, options)

                    const newDay = dayjs(universe.currentDate).format("YYYY-MM-DD")
                    console.log(`Started day ${newDay} (previously ${previousDay})`)

                    // startDay() / finishSeason() may move us into a new season
                    season = await this.seasonService.getByDate(universe.currentDate, options)
                }

                let logDate = dayjs(universe.currentDate).format("YYYY/MM/DD")
                console.time(`Running game runner (${logDate})...`)

                //Start games
                for (let league of leagues) {
                    await this.startGames(universe.currentDate, league, season, rng, options)
                }
                
                // Play games
                gameIds.push(...await this.processGames(leagues, universe.currentDate, false, rng, options))

                console.timeEnd(`Running game runner (${logDate})...`)

            }

        })

        return gameIds

    }

    private async startDay(universe: Universe, options?: any) {

        universe.currentDate.setUTCDate(universe.currentDate.getUTCDate() + 1)        
        universe.changed('currentDate', true)

        await this.universeRepository.put(universe, options)

    }

    private async shouldStartDay(universe: Universe): Promise<boolean> {

        const nowUtc = dayjs.utc()

        const nextDay = dayjs(universe.currentDate).utc().add(1, "day").format("YYYY-MM-DD")
        const startTimeUtc = dayjs.tz(`${nextDay} 09:30`, "America/New_York").utc()

        return nowUtc.isSame(startTimeUtc) || nowUtc.isAfter(startTimeUtc)
    }

    private async distributeRewards(rewardsPerTeam:RewardPerTeam[], rewardTeams:Team[], rewardTlss:TeamLeagueSeason[], season:Season, source:OffChainEventSource, offChainEventTransactionId:string, options?:any) {
        
        //Distribute rewards and save.
        for (let team of rewardTeams) {

            let reward = rewardsPerTeam.find( r => r._id == team._id)

            if (reward) {

                let tls = rewardTlss.find( t => t.teamId == team._id)
                let rewardTotal = ethers.parseUnits(reward.amount.toString(), 'ether')

                await this.distributeReward(team, tls, season, rewardTotal, source, offChainEventTransactionId, options )
            
            }

        }

    }

    private async distributeReward(team:Team, tls:TeamLeagueSeason, season:Season, rewardAmount:bigint, source:OffChainEventSource, offChainEventTransactionId:string, options?:any) {

        await this.offchainEventService.createTeamMintEvent(team._id, rewardAmount.toString(), source, offChainEventTransactionId, options )

        //Calculate my season rewards
        let seasonRewards = await this.offchainEventService.getRewardsForTeamSeason(ContractType.DIAMONDS, team, season, options)
        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id, options)

        tls.financeSeason.revenue.seasonToDate.total = BigInt(seasonRewards).toString()
        tls.financeSeason.diamondBalance = BigInt(diamondBalance).toString()

        tls.changed("financeSeason", true)

    }

    private isDateBeforeOrEqualToToday(date: Date): boolean {

        const compare = new Date(date)
        const now = new Date()

        const compareUTC = Date.UTC(
            compare.getUTCFullYear(),
            compare.getUTCMonth(),
            compare.getUTCDate()
        )

        const todayUTC = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        )

        return compareUTC <= todayUTC
    }

    async processGames(leagues:League[], date:Date, completeGames:boolean, rng, options?:any) : Promise<string[]> {

        let allGameIds:string[] = []

        for (let league of leagues) {
            
            let gameIds:string[] = await this.gameService.getUnfinishedByLeagueIds(league, options)
            if (gameIds.length == 0) continue            

            allGameIds.push(...gameIds)

            console.time(`Processing ${dayjs(date).format("YYYY/MM/DD")} and league #${league.rank} (${gameIds.length} games)`)
            
            let inProgressGames:Game[] = await this.gameService.getByIds(gameIds, options)

            for (let game of inProgressGames) {
                await this.processGame(game, rng, completeGames, options)
            }

            console.timeEnd(`Processing ${dayjs(date).format("YYYY/MM/DD")} and league #${league.rank} (${gameIds.length} games)`)

        }

        return allGameIds

    }

    async processGame(game:Game, rng, completeGame:boolean, options?:any) {

        this.gameService.incrementGame(game, completeGame, rng)

        if (game.isComplete == true && game.isFinished == false) {
            await this.finishGame(game, options)
        }

        await this.gameService.put(game, options)
        
    }

    private async startGames(currentDate:Date, league:League, season:Season, rng, options?: any ) {

        let pairs:TeamQueueMatchup[] =  await this.teamQueueService.processQueuePairs(league, options)

        for (let pair of pairs) {

            //Get team1 deets
            let team1 = await this.teamService.get(pair.team1.teamId, options)
            let team1Bundle = await this.getTeamBundle(team1, season, options)
            
            //Get team2
            let team2 = await this.teamService.get(pair.team2.teamId, options)
            let team2Bundle = await this.getTeamBundle(team2, season, options)

            const [home, away] = this.rollService.getRoll(rng, 0, 1) === 0 ? [team1Bundle, team2Bundle] : [team2Bundle, team1Bundle]


            //Clear teams from queue
            await this.teamQueueService.dequeueTeam(team1, options)
            await this.teamQueueService.dequeueTeam(team2, options)


            //Calculate and distribute rewards
            const baseReward = Number(league.baseDiamondReward)

            const team1GapDown = Math.max(0, pair.team1.teamRating - pair.team2.teamRating)
            const team2GapDown = Math.max(0, pair.team2.teamRating - pair.team1.teamRating)

            const team1RewardAmount = this.calculateProjectedReward(baseReward, team1GapDown)
            const team2RewardAmount = this.calculateProjectedReward(baseReward, team2GapDown)

            //Create game
            let game:Game = await this.createGame(home, away, league, season, currentDate, options)

            //Set finances for each team so we can access it when the game finishes.
            if (game.away._id == team1._id) {
                game.away.finances.totalRevenue = team1RewardAmount.toString()
                game.home.finances.totalRevenue = team2RewardAmount.toString()
            } else {
                game.home.finances.totalRevenue = team1RewardAmount.toString()
                game.away.finances.totalRevenue = team2RewardAmount.toString()
            }

            game.changed('home', true)
            game.changed('away', true)

            await this.gameService.put(game, options)

            await this.teamLeagueSeasonService.put(team1Bundle.tls, options)
            await this.teamLeagueSeasonService.put(team2Bundle.tls, options)

        }


    }

    private async createGame( homeBundle: TeamBundle, awayBundle:TeamBundle, league: League, season: Season, date: Date,  options?: any ) {

        const game: Game = await this.gameService.scheduleGame({
            league,
            season,
            awayTLS: awayBundle.tlsPlain,
            homeTLS: homeBundle.tlsPlain,
            startDate: date,
        }, options)

        const playerIds = []
            .concat(awayBundle.plss.map(pls => pls.playerId))
            .concat(homeBundle.plss.map(pls => pls.playerId))

        const players: Player[] = await this.playerService.getByIds(playerIds, options)

        await this.gameService.createGamePlayers(game, playerIds, options)

        this.gameService.startGame({

            game,

            homeTLS: homeBundle.tls,
            awayTLS: awayBundle.tls,

            awayPlayers: awayBundle.plss,
            homePlayers: homeBundle.plss,

            away: awayBundle.team,
            home: homeBundle.team,

            awayStartingPitcher: awayBundle.startingPitcher,
            homeStartingPitcher: homeBundle.startingPitcher,

            date,

            leagueAverages: this.playerService.buildLeagueAverages()

        })

        await this.gameService.put(game, options)

        homeBundle.team.lastGamePlayed = date
        awayBundle.team.lastGamePlayed = date

        await this.teamService.put(homeBundle.team, options)
        await this.teamService.put(awayBundle.team, options)

        for (const player of players) {
            player.lastGamePlayed = game.startDate
        }

        const homePitcher = players.find(p => p._id === homeBundle.startingPitcher._id) as Player
        homePitcher.lastGamePitched = date

        const awayPitcher = players.find(p => p._id === awayBundle.startingPitcher._id) as Player
        awayPitcher.lastGamePitched = date

        await this.playerService.updateGameFields(players, options)

        return game
    }

    private async getTeamBundle( theTeam: Team, season: Season, options?: any) : Promise<TeamBundle> {

        const tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(theTeam, season, options)

        const tlsPlain: TeamLeagueSeason = tls.get({ plain: true })

        const plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(theTeam, season, options)

        const plssPlain = plss.map(pls => pls.get({ plain: true }))

        const startingPitcher: RotationPitcher = this.teamService.getStartingPitcherFromPLS( tls.lineups[0].rotation, plssPlain )

        return {
            team: theTeam,
            tls,
            tlsPlain,
            plss,
            plssPlain,
            startingPitcher
        }
    }




    async finishGame(game:Game, options?:any) {

        let season:Season = await this.seasonService.get(game.seasonId, options)
        
        let away:Team = await this.teamService.get(game.away._id, options)
        let home:Team = await this.teamService.get(game.home._id, options)

        let awayTLS:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(away, season, options)
        let homeTLS:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(home, season, options)

        let players:Player[] = await this.playerService.getByIds( [].concat(game.home.players).concat(game.away.players).map( p => p._id), options )
        let plss = await this.playerLeagueSeasonService.getMostRecentByPlayersSeason(players, season, options)

        this.gameService.finishGame(game, players, plss)

        await this.gameService.put(game, options)

        //Update results for players
        let ghr:GameHitResult[] = []
        let gpr:GamePitchResult[] = []

        for (let gp of [].concat(game.home.players).concat(game.away.players)) {
            ghr.push(this.gameService.createHitResult(game, gp))
            gpr.push(this.gameService.createPitchResult(game, gp))
        }

        await this.gameHitResultRepository.updateGameHitResults(ghr, options)
        await this.gamePitchResultRepository.updateGamePitchResults(gpr, options)
        
        if (game.seasonId != undefined) {
            await this.finishSeasonGame(away, awayTLS, home, homeTLS, season, game, players, plss, ghr, gpr, options)
        } else {
            await this.finishNonSeasonGame(away, home, game, options)
        }

    }


    private async finishSeasonGame(away:Team, awayTLS:TeamLeagueSeason, home:Team, homeTLS:TeamLeagueSeason, 
                                   season:Season, game:Game, players:Player[], 
                                   plss:PlayerLeagueSeason[], 
                                   ghr:GameHitResult[],
                                   gpr:GamePitchResult[],
                                   options?:any
                            ) {


        //Update team record.
        let homeRecord = await this.teamService.updateSeasonRecord(home, season, homeTLS, options)
        let awayRecord = await this.teamService.updateSeasonRecord(away, season, awayTLS, options)

        game.home.overallRecord.after = JSON.parse(JSON.stringify(homeRecord))
        game.away.overallRecord.after = JSON.parse(JSON.stringify(awayRecord))




        //Distribute rewards to teams.
        const txId = uuidv4()

        await this.distributeReward(away, awayTLS, season, BigInt(game.away.finances.totalRevenue), { type: "reward", rewardType: "game", fromDate: game.gameDate, fromGameId: game._id  }, txId, options)
        await this.distributeReward(home, homeTLS, season, BigInt(game.home.finances.totalRevenue), { type: "reward", rewardType: "game", fromDate: game.gameDate, fromGameId: game._id  }, txId, options)

        //Spend development budget
        const awayDevelopmentExpense = this.teamService.getDevelopmentExpenseForReward(away, BigInt(game.away.finances.totalRevenue))
        const homeDevelopmentExpense = this.teamService.getDevelopmentExpenseForReward(home, BigInt(game.home.finances.totalRevenue))

        await this.offchainEventService.createTeamBurnEventWithSource(away._id, awayDevelopmentExpense.toString(), txId, { fromGameId: game._id, type: "playerDevelopment" }, options)
        await this.offchainEventService.createTeamBurnEventWithSource(home._id, homeDevelopmentExpense.toString(), txId, { fromGameId: game._id, type: "playerDevelopment" } , options)

        const awayDevelopmentXpMultiplier = this.teamService.getDevelopmentXpMultiplier(away)
        const homeDevelopmentXpMultiplier = this.teamService.getDevelopmentXpMultiplier(home)



        const hitResultByPlayerId = new Map(ghr.map(r => [r.playerId, r]))
        const pitchResultByPlayerId = new Map(gpr.map(r => [r.playerId, r]))


        //Update the player's season and career stats
        const playerIds = players.map(p => p._id)

        const careerHitRows = await this.gameHitResultRepository.getPlayersCareerHitResults(playerIds, options)
        const seasonHitRows = await this.gameHitResultRepository.getPlayersSeasonHitResults(playerIds, season._id, options)

        const careerPitchRows = await this.gamePitchResultRepository.getPlayersCareerPitchResults(playerIds, options)
        const seasonPitchRows = await this.gamePitchResultRepository.getPlayersSeasonPitchResults(playerIds, season._id, options)

        const careerHitByPlayerId = new Map(careerHitRows.map(r => [r.playerId, r]))
        const seasonHitByPlayerId = new Map(seasonHitRows.map(r => [r.playerId, r]))

        const careerPitchByPlayerId = new Map(careerPitchRows.map(r => [r.playerId, r]))
        const seasonPitchByPlayerId = new Map(seasonPitchRows.map(r => [r.playerId, r]))

        const gamePlayers = [].concat(game.home.players).concat(game.away.players)

        for (const player of players) {

            let pls = plss.find( p => p.playerId == player._id)

            const careerHitResult:HitResult = careerHitByPlayerId.get(player._id)
            const seasonHitResult:HitResult = seasonHitByPlayerId.get(player._id)

            const careerPitchResult:PitchResult = careerPitchByPlayerId.get(player._id)
            const seasonPitchResult:PitchResult = seasonPitchByPlayerId.get(player._id)

            player.careerStats = {
                hitting: this.statService.hitResultToHitterStatLine(careerHitResult),
                pitching: this.statService.pitchResultToPitcherStatLine(careerPitchResult)
            }

            player.changed("careerStats", true)


            pls.stats = {
                hitting: this.statService.hitResultToHitterStatLine(seasonHitResult),
                pitching: this.statService.pitchResultToPitcherStatLine(seasonPitchResult)
            }

            pls.changed("stats", true)


            let gamePlayer:GamePlayer = gamePlayers.find( gp => gp._id == player._id)

            //Check if player actually played.
            if (gamePlayer.hitResult.pa > 0 || gamePlayer.pitchResult.pitches > 0) {
                
                //Update overall rating. 
                const positiveGame = player.primaryPosition == Position.PITCHER ? pitchResultByPlayerId.get(player._id).wpa > 0 : hitResultByPlayerId.get(player._id).wpa > 0

                //Calculate the base level of XP for this player.
                let gameExperience:bigint = this.playerService.getExperiencePerGame(positiveGame, player.primaryPosition == Position.PITCHER)
                
                //Modify XP by their age-based learning modifier. Aka old players learn slow.
                const learningModifier = this.playerService.getAgeLearningModifier(player.age)
                const scaledModifier = Math.round(learningModifier * 100)
                gameExperience = gameExperience * BigInt(scaledModifier) / 100n
                

                //Modify by the team's budget spend on development.
                const teamDevelopmentXpMultiplier = pls.teamId == away._id ? awayDevelopmentXpMultiplier : homeDevelopmentXpMultiplier
                gameExperience = gameExperience * teamDevelopmentXpMultiplier / 100n


                await this.offchainEventService.createPlayerExperienceEvent(pls.teamId, player._id, gameExperience.toString(), { fromGameId: game._id }, txId, options)
        
                player.totalExperience = await this.offchainEventService.getBalanceByPlayerIdAndContractType(ContractType.EXPERIENCE, player._id, options)

                player.potentialOverallRating = this.playerService.experienceToOverallRating(BigInt(player.totalExperience))

                this.playerService.updateHittingPitchingRatings(player)

                player.changed("totalExperience")

                player.changed("overallRating", true)
                player.changed("hittingRatings", true)
                player.changed("pitchRatings", true)

                player.changed("potentialOverallRating", true)
                player.changed("potentialHittingRatings", true)
                player.changed("potentialPitchRatings", true)


                pls.overallRating = player.overallRating
                pls.hittingRatings = player.hittingRatings
                pls.pitchRatings = player.pitchRatings

                pls.potentialOverallRating = player.potentialOverallRating
                pls.potentialHittingRatings = player.potentialHittingRatings
                pls.potentialPitchRatings = player.potentialPitchRatings

                pls.changed("overallRating", true)
                pls.changed("hittingRatings", true)
                pls.changed("pitchRatings", true)    
                
                pls.changed("potentialOverallRating", true)
                pls.changed("potentialHittingRatings", true)
                pls.changed("potentialPitchRatings", true)

            } 


            //Adjust stamina
            if (player.primaryPosition == Position.PITCHER) {

                //Pitchers that pitches are at .2 and others are +.2
                if (gamePlayer.pitchResult.pitches > 0) {
                    player.stamina = .2
                } else {
                    player.stamina = Math.min(1, player.stamina + 0.2)
                }

                player.changed('stamina', true)

            }


        }


        await this.playerLeagueSeasonService.updateGameFields(plss, options)
        await this.playerService.updateGameFields(players, options)

        let teams = [away, home]
        let tlss = [awayTLS, homeTLS]

        this.updateTeamRankings(teams, tlss, game)

        for (let team of teams) {
            await this.teamService.put(team, options)
        }

        for (let tls of tlss) {
            await this.teamLeagueSeasonService.put(tls, options)
        }

        game.home.seasonRating.after = home.seasonRating.rating
        game.away.seasonRating.after = away.seasonRating.rating

        game.home.longTermRating.after = home.longTermRating.rating
        game.away.longTermRating.after = away.longTermRating.rating        

        game.changed("away", true)
        game.changed("home", true)

    }


    private async finishNonSeasonGame(away:Team, home:Team,game:Game, options?:any ) {

        //Distribute 1 to teams.
        const txId = uuidv4()

        await this.offchainEventService.createTeamMintEvent(away._id, ethers.parseUnits("1", "ether").toString(), { type: "reward", rewardType: "exhibition", fromDate: game.gameDate, fromGameId: game._id  }, txId, options )
        await this.offchainEventService.createTeamMintEvent(home._id, ethers.parseUnits("1", "ether").toString(), { type: "reward", rewardType: "exhibition", fromDate: game.gameDate, fromGameId: game._id  }, txId, options )

        game.home.seasonRating.after = home.seasonRating.rating
        game.away.seasonRating.after = away.seasonRating.rating

        game.home.longTermRating.after = home.longTermRating.rating
        game.away.longTermRating.after = away.longTermRating.rating        

    }


    async finishSeason(season:Season, leagues:League[], options?:any) {

        //Distribute rewards to anyone that played at least one game and finished above the threshhold
        let teamIds = await this.teamService.getTeamIdsBySeason(season, options)
        let teamSeasonIds:TeamSeasonId[] = teamIds.map( t => { return { teamId: t, seasonId: season._id } })

        let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.getByTeamSeasonIds(teamSeasonIds, options)

        //Calculate season end rewards.
        let rewardTeams = await this.teamService.getByIds(teamIds, options)
        let rewardsPerTeam = this.financeService.calculateRewardsPerTeam(DIAMONDS_PER_DAY * 20, rewardTeams)

        let offChainEventTransactionId = uuidv4()

        await this.distributeRewards(rewardsPerTeam, rewardTeams, tlss, season, { type: "reward", rewardType:"season", fromDate: season.endDate }, offChainEventTransactionId, options)


        //Create the next season. 
        let nextSeason:Season = new Season()
        nextSeason._id = uuidv4()
        nextSeason.startDate = dayjs(season.endDate).add(1, 'days').toDate()
        nextSeason.isComplete = false
        nextSeason.isInitialized = false

        await this.seasonService.put(nextSeason, options)

        //Handle relegation
        let updatedStructure:{ league:League, teamInfo:{ cityId:string, teamId:string}[]}[] = leagues.map( l => { return { league: l, teamInfo: [] } })

        //Create next season's TLS
        for (let leagueInfo of updatedStructure) {

            let league = leagueInfo.league
            let teamIds = leagueInfo.teamInfo.map( ti => ti.teamId)

            for (let teamId of teamIds) {

                let team:Team = await this.teamService.get(teamId, options)
                let lastSeason:TeamLeagueSeason = await this.teamLeagueSeasonService.getMostRecent(team, options)

                let financeSeason:FinanceSeason = this.financeService.getDefaultFinanceSeason()
                financeSeason.diamondBalance = lastSeason.financeSeason.diamondBalance

                let tls:TeamLeagueSeason =  this.teamLeagueSeasonService.init(lastSeason, team, financeSeason)
                
                tls.leagueId = league._id
                tls.seasonId = nextSeason._id
                tls.logoId = lastSeason.logoId
                tls.longTermRating = lastSeason.longTermRating
                tls.seasonRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }


                await this.teamLeagueSeasonService.put(tls, options)

                team.longTermRating = tls.longTermRating
                team.seasonRating = tls.seasonRating

                await this.teamService.put(team, options)

            }

        }

        //Create PLS for the next season or retire players
        let currentPLS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentBySeason(season, options)
        
        for (let pls of currentPLS) {

            let player:Player = await this.playerService.get(pls.playerId, options)

            player.age += 1

            if (player.age > PLAYER_RETIREMENT_AGE) {

                player.isRetired = true

            } else {

                let nextSeasonPLS = new PlayerLeagueSeason()
                nextSeasonPLS.playerId = pls.playerId
                nextSeasonPLS.seasonId = nextSeason._id
                nextSeasonPLS.seasonIndex = 1
                nextSeasonPLS.primaryPosition = pls.primaryPosition
                nextSeasonPLS.overallRating = pls.overallRating
                nextSeasonPLS.hittingRatings = pls.hittingRatings
                nextSeasonPLS.pitchRatings = pls.pitchRatings
                nextSeasonPLS.startDate = nextSeason.startDate
                nextSeasonPLS.endDate = nextSeason.endDate
                nextSeasonPLS.age = player.age

                nextSeasonPLS.stats = {
                    //@ts-ignore
                    hitting: this.statService.mergeHitResultsToStatLine({}, {}),
                    //@ts-ignore
                    pitching: this.statService.mergePitchResultsToStatLine({}, {})
                }

                await this.playerLeagueSeasonService.put(nextSeasonPLS, options)

            }
            
            await this.playerService.put(player, options)
  
        }

        season.isComplete = true
        season.changed("promotionRelegationLog", true)

        await this.seasonService.put(season, options)

        nextSeason.isInitialized = true
        await this.seasonService.put(nextSeason, options)


    }




    updateRatings(teamRatings:{ rating:Rating, _id:string }[] , games:{ winningTeamId:string, losingTeamId:string }[]) : TeamRating[] {

        let ranking = new glicko2.Glicko2(GLICKO_SETTINGS)

        const idMap = {}
        const matches = []

        //Add all the matches
        for (let game of games) {

            let winningTR = teamRatings.find(tr => tr._id == game.winningTeamId)
            let losingTR = teamRatings.find(tr => tr._id == game.losingTeamId)

            const winningP = ranking.makePlayer(winningTR.rating.rating, winningTR.rating.ratingDeviation, winningTR.rating.volatility)
            const losingP = ranking.makePlayer(losingTR.rating.rating, losingTR.rating.ratingDeviation, losingTR.rating.volatility)

            idMap[winningP.id] = winningTR._id
            idMap[losingP.id] = losingTR._id

            matches.push([
                winningP,
                losingP,
                1
            ])

        }

        //All teams get updated not just the ones that get played. To increase their rating deviation over time.
        for (let tr of teamRatings) {

            //Check that it's not already added.
            if (idMap[tr._id] == undefined) {
                ranking.makePlayer(tr.rating.rating, tr.rating.ratingDeviation, tr.rating.volatility)
            }

        }

        ranking.updateRatings(matches)


        let updatedRatings:TeamRating[] = []

        for (let rankPlayer of ranking.getPlayers()) {

            if (idMap[rankPlayer.id]) {

                updatedRatings.push({
                    _id: idMap[rankPlayer.id],
                    rating: { rating: rankPlayer.getRating(), ratingDeviation: rankPlayer.getRd(), volatility: rankPlayer.getVol() },
                })
            }

        }

        return updatedRatings
    }

    normalizeRatings(teamRatings: TeamRating[]) {

        const baseRating = 1500 // The average rating and where new players start
        const averageNormalized = 0.50; // Normalized value for 1500

        return teamRatings.map(v => {
            const normalizedRating = (v.rating.rating / baseRating) - 1
            return {
                _id: v._id,
                rating: averageNormalized + normalizedRating // Converting to a fixed-point number for clarity
            }
        })

    }

    async updateTeamRankings(teams:Team[], tlss:TeamLeagueSeason[], result:Game)  {
        
        let results = [{ winningTeamId: result.winningTeamId, losingTeamId: result.losingTeamId }]

        let seasonRatings = teams.map( t =>  { return { rating: t.seasonRating, _id: t._id} })
        let longTermRatings = teams.map( t =>  { return { rating: t.longTermRating, _id: t._id} })

        let updatedSeasonRatings:TeamRating[] = this.updateRatings(seasonRatings, results)
        let updatedLongTermRatings:TeamRating[] = this.updateRatings(longTermRatings, results)

        let normalizedSeasonRatings = this.normalizeRatings(  updatedSeasonRatings   )
        let normalizedLongTermRatings = this.normalizeRatings(  updatedLongTermRatings  )

        //Get updated team records
        // let teamRecords = await this.teamService.getOverallRecordsBySeason(season, options)

        //Set team ratings
        for (let seasonRating of updatedSeasonRatings) {

            let team:Team = teams.find( t => t._id == seasonRating._id)
            let tls = tlss.find( tls => tls.teamId == seasonRating._id)
            // let tr = teamRecords.find( tr => tr._id == tls.teamId)
            let longTermRating = updatedLongTermRatings.find( tr => tr._id == seasonRating._id)

            let normalizedSeasonRating:number = normalizedSeasonRatings.find( tr => tr._id == seasonRating._id).rating
            let normalizedLongTermRating:number = normalizedLongTermRatings.find( tr => tr._id == seasonRating._id).rating

            team.seasonRating = seasonRating.rating
            team.longTermRating = longTermRating.rating
            team.changed("seasonRating", true)
            team.changed("longTermRating", true)

            tls.seasonRating = seasonRating.rating
            tls.longTermRating = longTermRating.rating
            // tls.overallRecord = tr.overallRecord
            
            tls.fanInterestShortTerm = normalizedSeasonRating
            tls.fanInterestLongTerm = normalizedLongTermRating

            tls.changed("seasonRating", true)
            tls.changed("longTermRating", true)
            tls.changed("overallRecord", true)

        }

    }

    getRewardMultiplier(ratingGap: number): number {

        if (ratingGap <= 25) {
            return 1
        }

        if (ratingGap <= 100) {
            const slope = -0.5 / 75
            return 1 + (ratingGap - 25) * slope
        }

        if (ratingGap <= 150) {
            const slope = -0.4 / 50
            return 0.5 + (ratingGap - 100) * slope
        }

        if (ratingGap <= 250) {
            const slope = -0.1 / 100
            return 0.1 + (ratingGap - 150) * slope
        }

        return 0
    }

    calculateProjectedReward(baseDiamondReward: number, maxRatingDiff: number): bigint {
      const multiplier = this.getRewardMultiplier(maxRatingDiff)
      const multiplierScaled = BigInt(Math.round(multiplier * 10000))
      return (BigInt(baseDiamondReward) * multiplierScaled) / 10000n
    }

    //This should probably move
    async generatePlayerPool(season:Season,  options?:any) {

        let created = 0

        while (created < MINIMUM_PLAYER_POOL ) {

            let players = await this.playerService.scoutTeam(dayjs(season.startDate).format("YYYY-MM-DD"))

            for (let player of players) {

                player.age = faker.helpers.weightedArrayElement([
                    { weight: 25, value: 24 }, 
                    { weight: 18, value: 25 },
                    { weight: 15, value: 26 },
                    { weight: 12, value: 27 },
                    { weight: 10, value: 28 },
                    { weight: 7, value: 29 },
                    { weight: 5, value: 30 },
                    { weight: 3, value: 31 },
                    { weight: 2, value: 32 },
                    { weight: 1, value: 33 },
                    { weight: 1, value: 34 },
                    { weight: 0.5, value: 35 },
                    { weight: 0.5, value: 36 }
                ])


                player.overallRating = faker.helpers.weightedArrayElement([
                    { weight: 30, value: 60 }, 
                    { weight: 20, value: 65 },
                    { weight: 15, value: 70 },
                    { weight: 12, value: 75 },
                    { weight: 10, value: 80 },
                    { weight: 6, value: 85 },
                    { weight: 5, value: 90 },
                    { weight: 2, value: 95 },
                ])


                this.playerService.updateHittingPitchingRatings( player)

                await this.playerService.put(player, options)



                let pls = await this.playerLeagueSeasonService.createPlayerLeagueSeason(player, season, 1, options)
                
                //Random contract years
                let years = faker.helpers.weightedArrayElement([
                    { weight: 20, value: 2 }, 
                    { weight: 20, value: 3 },
                    { weight: 20, value: 4 },
                    { weight: 20, value: 5 },
                    { weight: 20, value: 6 }
                ])


                // this.playerService.createFreeAgentContract(player, 65, MIN_AAV_CONTRACT * 5, years, 1)
                // pls.askingPrice = parseFloat(ethers.formatUnits(player.contract.years[0].salary, "ether")) 

                await this.playerService.put(player, options)
                await this.playerLeagueSeasonService.put(pls, options)                

                created++

            }
        }



    }

}

interface TeamBundle {
    team: Team
    tls: TeamLeagueSeason
    tlsPlain: TeamLeagueSeason
    plss: PlayerLeagueSeason[]
    plssPlain: PlayerLeagueSeason[]
    startingPitcher: RotationPitcher
}

export {
    LadderService
}



