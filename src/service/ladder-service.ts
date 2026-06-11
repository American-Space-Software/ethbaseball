import { inject, injectable } from "inversify"

import { PlayerService } from "./data/player-service.js"

import { GameService } from "./data/game-service.js"
import { Team } from "../dto/team.js"
import {  MINIMUM_PLAYER_POOL, Rating, ContractType, TeamSeasonId, DIAMONDS_PER_DAY, RewardPerTeam, OffChainEventSource, PLAYER_LEAGUE_AVERAGE_RATING, GLICKO_SETTINGS, PLAYER_RETIREMENT_AGE, FinanceSeason, WIN_EXPECTANCY_CHART, DEFAULT_PLAYER_STARTING_AGE, Lineup, DEFAULT_MAX_PITCH_COUNT, NotificationEntityType, NotificationEventType, NotificationChannel, NotificationStatus } from "./enums.js"
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
import { GameHitResult } from "../dto/game-hit-result.js"
import { GamePitchResult } from "../dto/game-pitch-result.js"
import { GameHitResultRepository } from "../repository/game-hit-result-repository.js"
import { GamePitchResultRepository } from "../repository/game-pitch-result-repository.js"
import { ethers } from "ethers"
import { TeamQueueService } from "./data/team-queue-service.js"
import { TeamQueueMatchup } from "../dto/team-queue.js"
import { GamePlayer, HitResultCount, PitchResultCount, Position, Rolls, RotationPitcher, Player as SimPlayer, Lineup as SimLineup, PitchingRoleType }  from '../baseball-sim-engine/index.js';
import { SimSharedService, WPAReward } from "./shared/sim-shared-service.js"
import { PlayerSharedService } from "./shared/player-shared-service.js"
import { NotificationService } from "./data/notification-service.js"
import { Notification } from "../dto/notification.js"
import { NotificationRepository } from "../repository/notification-repository.js"


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

    @inject("NotificationRepository")
    private notificationsRepository:NotificationRepository //just need to get around a circular dependency issue. not great.

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
        private simSharedService:SimSharedService,
        private playerSharedService:PlayerSharedService
    ) {}


    async runGameRunner(universeId:string) : Promise<{ allGameIds: string[], startedGameIds: string[]}> {

        let s = await this.sequelize()

        let allGameIds:string[] = []
        let startedGameIds:string[] = []

        await s.transaction(async (t1) => {

            let options = { transaction: t1 }
            let rng = await this.seedService.getRNG()

            let universe:Universe = await this.universeRepository.get(universeId, options)

            if (!this.isDateBeforeOrEqualToToday(universe.currentDate)) return

            let leagues:League[] = await this.leagueService.listByRankAsc(options)
            let season:Season = await this.seasonService.getByDate(universe.currentDate, options)

            if (!season) {
                
                let mostRecentSeason:Season = await this.seasonService.getMostRecent(options)

                if (mostRecentSeason.isComplete) {
                    throw new Error("Season is complete but no new season has been created. Something went wrong.")
                }

                console.time(`Finishing season...`)
                await this.finishSeason(mostRecentSeason, leagues, options)
                console.timeEnd(`Finishing season...`)

                // startDay() / finishSeason() may move us into a new season
                season = await this.seasonService.getByDate(universe.currentDate, options)

            }


            const shouldStartDay = await this.shouldStartDay(universe)

            if (shouldStartDay) {
                await this.startDay(universe, options)
            }

            let logDate = dayjs(universe.currentDate).format("YYYY/MM/DD")
            console.time(`Running game runner (${logDate})...`)

            //Start games
            for (let league of leagues) {
                startedGameIds.push(...await this.startGames(universe.currentDate, league, season, rng, options))
            }
            
            // Play games
            allGameIds.push(...await this.processGames(leagues, universe.currentDate, false, rng, options))

            console.timeEnd(`Running game runner (${logDate})...`)

        })

        return {
            allGameIds: allGameIds,
            startedGameIds: startedGameIds
        }

    }

    private async startDay(universe: Universe, options?: any) {

        universe.currentDate.setUTCDate(universe.currentDate.getUTCDate() + 1)        
        universe.changed('currentDate', true)

        await this.universeRepository.put(universe, options)

        const newDay = dayjs(universe.currentDate).format("YYYY-MM-DD")
        console.log(`Started day ${newDay} `)


    }

    private async shouldStartDay(universe: Universe): Promise<boolean> {

        const nowEt = dayjs().tz("America/New_York")
        const todayEt = nowEt.startOf("day")

        const currentDateEt = dayjs(universe.currentDate).tz("America/New_York").startOf("day")
       
        if (currentDateEt.isBefore(todayEt, "day")) return true

        const nextDay = currentDateEt.add(1, "day").format("YYYY-MM-DD")
        const startTimeEt = dayjs.tz(`${nextDay} 09:30`, "America/New_York")

        return nowEt.isSame(startTimeEt) || nowEt.isAfter(startTimeEt)

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

    private async startGames(currentDate:Date, league:League, season:Season, rng, options?: any ) : Promise<string[]> {

        let gameIds:string[] = []

        let pairs:TeamQueueMatchup[] =  await this.teamQueueService.processQueuePairs(league, options)

        for (let pair of pairs) {

            //Get team1 deets
            let team1 = await this.teamService.get(pair.team1.teamId, options)
            let team1Bundle = await this.getTeamBundle(team1, season, options)
            
            //Get team2
            let team2 = await this.teamService.get(pair.team2.teamId, options)
            let team2Bundle = await this.getTeamBundle(team2, season, options)

            const [home, away] = Rolls.getRoll(rng, 0, 1) === 0 ? [team1Bundle, team2Bundle] : [team2Bundle, team1Bundle]


            //Clear teams from queue
            await this.teamQueueService.dequeueTeam(team1, options)
            await this.teamQueueService.dequeueTeam(team2, options)


            //Calculate and distribute rewards
            const baseReward = Number(league.baseDiamondReward)

            const team1GapDown = Math.max(0, pair.team1.teamRating - pair.team2.teamRating)
            const team2GapDown = Math.max(0, pair.team2.teamRating - pair.team1.teamRating)

            const team1RewardAmount = this.teamService.calculateProjectedReward(baseReward, team1GapDown)
            const team2RewardAmount = this.teamService.calculateProjectedReward(baseReward, team2GapDown)

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


            let notification = Object.assign(new Notification(), {
                entityType: NotificationEntityType.GAME,
                entityId: game._id,
                eventType: NotificationEventType.GAME_STARTED,
                channel: NotificationChannel.DISCORD,
                status: NotificationStatus.PENDING
            })

            await this.notificationsRepository.put(notification, options)


            await this.teamLeagueSeasonService.put(team1Bundle.tls, options)
            await this.teamLeagueSeasonService.put(team2Bundle.tls, options)

            gameIds.push(game._id)

        }

        return gameIds
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


        const getTeamOptions = (teamBundle:TeamBundle) => {

            return {

                logoId: teamBundle.tls.logoId,
                owner: {
                    _id: teamBundle.team.userId,
                },
                finances: {},
                cityName: teamBundle.tls?.city?.name,

                seasonRating: {
                    before:teamBundle.team.seasonRating.rating
                },
            
                longTermRating: {
                    before:teamBundle.team.longTermRating.rating
                },
            
                overallRecord: {
                    before:teamBundle.tls.overallRecord
                }           
            }
        }


        const awayPlayers = awayBundle.plss.map(pls => pls.get({ plain: true }).player).map(player => this.translatePlayerToSimPlayer(player))
        const homePlayers = homeBundle.plss.map(pls => pls.get({ plain: true }).player).map(player => this.translatePlayerToSimPlayer(player))

        const awayLineup = this.translateLineupToSimLineup(awayBundle.tls.lineups[0], awayBundle.startingPitcher) 
        const homeLineup = this.translateLineupToSimLineup(homeBundle.tls.lineups[0], homeBundle.startingPitcher) 


        this.simSharedService.startGame({

            game,

            awayPlayers: awayPlayers,
            homePlayers: homePlayers,

            away: awayBundle.team,
            awayTeamOptions: getTeamOptions(awayBundle),
            awayLineup: awayLineup,
            awayAvailablePitchers: awayBundle.tls.lineups[0].availablePitchers,

            home: homeBundle.team,
            homeTeamOptions: getTeamOptions(homeBundle),
            homeLineup: homeLineup,
            homeAvailablePitchers: homeBundle.tls.lineups[0].availablePitchers,

            awayStartingPitcher: awayBundle.startingPitcher,
            homeStartingPitcher: homeBundle.startingPitcher,

            pitchEnvironmentTarget: league.pitchEnvironmentTarget,

            date

        })

        game.changed('pitchEnvironmentTarget', true)
        game.changed('away', true)
        game.changed('home', true)
        game.changed('startDate', true)
        game.changed('isStarted', true)
        game.changed('substitutions', true)

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

    private translateLineupToSimLineup(lineup:Lineup, startingPitcher:RotationPitcher) : SimLineup {

        let order = JSON.parse(JSON.stringify(lineup.order))

        order.find(o => o.position === Position.PITCHER)._id = startingPitcher._id

        return {
            order: order,
            valid: lineup.valid
        }

    }

    private translatePlayerToSimPlayer(player: Player) : SimPlayer {

        return {
            _id: player._id,
            tokenId: player.tokenId,
            transactionHash: player.transactionHash,

            firstName: player.firstName,
            lastName: player.lastName,

            fullName: player.fullName,
            displayName: player.displayName,

            primaryPosition: player.primaryPosition,
            zodiacSign: player.zodiacSign,

            throws: player.throws,
            hits: player.hits,

            isRetired: player.isRetired,

            stamina: player.stamina,
            maxPitchCount: player.maxPitchCount,
            overallRating: player.overallRating,

            pitchRatings: JSON.parse(JSON.stringify(player.pitchRatings)),
            hittingRatings: JSON.parse(JSON.stringify(player.hittingRatings)),

            age: player.age,

            lastGamePitched: player.lastGamePitched,
            lastGamePlayed: player.lastGamePlayed,
            lastTeamChange: player.lastTeamChange,

            lastUpdated: player.lastUpdated,
            dateCreated: player.dateCreated
        } 
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

        let players:Player[] = []
        let plss:PlayerLeagueSeason[] = []

        for (let team of [game.home, game.away]) {

            let teamPlayers = await this.playerService.getByIds( team.players.map( p => p._id), options )
            let t = [home, away].find( t => t._id == team._id)
            
            players.push(...teamPlayers)
            plss.push(...await this.playerLeagueSeasonService.getMostRecentByPlayersTeamSeason(teamPlayers, t,  season, options))

        }

        this.simSharedService.finishGame(game)


        //WPA rewards
        let rewards:WPAReward[] = this.simSharedService.generateWPA(game)

        let gamePlayers:GamePlayer[] = [].concat(game.away.players).concat(game.home.players)

        for (let gamePlayer of gamePlayers) {

            let hittingRewards = rewards.find(r => r.hitting == true && r.playerId == gamePlayer._id)
            let pitchingRewards = rewards.find(r => r.hitting == false && r.playerId == gamePlayer._id)

            gamePlayer.hitResult.wpa = hittingRewards?.reward || 0
            gamePlayer.pitchResult.wpa = pitchingRewards?.reward || 0
            
        }



        game.changed('home', true)
        game.changed('away', true)
        game.changed('winningPitcherId', true)
        game.changed('losingPitcherId', true)
        game.changed('winningTeamId', true)
        game.changed('losingTeamId', true)        
        game.changed('substitutions', true)

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


    private async finishSeasonGame(away: Team, awayTLS: TeamLeagueSeason, home: Team, homeTLS: TeamLeagueSeason,
                                season: Season, game: Game, players: Player[],
                                plss: PlayerLeagueSeason[],
                                ghr: GameHitResult[],
                                gpr: GamePitchResult[],
                                options?: any
                            ) {

        //Update team record.
        let homeRecord = await this.teamService.updateSeasonRecord(home, season, homeTLS, options)
        let awayRecord = await this.teamService.updateSeasonRecord(away, season, awayTLS, options)

        game.home.overallRecord.after = JSON.parse(JSON.stringify(homeRecord))
        game.away.overallRecord.after = JSON.parse(JSON.stringify(awayRecord))

        //Distribute rewards to teams.
        const txId = uuidv4()

        await this.distributeReward(away, awayTLS, season, BigInt(game.away.finances.totalRevenue), { type: "reward", rewardType: "game", fromDate: game.gameDate, fromGameId: game._id }, txId, options)
        await this.distributeReward(home, homeTLS, season, BigInt(game.home.finances.totalRevenue), { type: "reward", rewardType: "game", fromDate: game.gameDate, fromGameId: game._id }, txId, options)

        //Spend development budget
        const awayDevelopmentExpense = this.teamService.getDevelopmentExpenseForReward(away, BigInt(game.away.finances.totalRevenue))
        const homeDevelopmentExpense = this.teamService.getDevelopmentExpenseForReward(home, BigInt(game.home.finances.totalRevenue))

        await this.offchainEventService.createTeamBurnEventWithSource(away._id, awayDevelopmentExpense.toString(), txId, { fromGameId: game._id, type: "playerDevelopment" }, options)
        await this.offchainEventService.createTeamBurnEventWithSource(home._id, homeDevelopmentExpense.toString(), txId, { fromGameId: game._id, type: "playerDevelopment" }, options)

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

        const careerHitByPlayerId = new Map((careerHitRows as any).map(r => [r.playerId, r]))
        const seasonHitByPlayerId = new Map((seasonHitRows as any).map(r => [r.playerId, r]))

        const careerPitchByPlayerId = new Map((careerPitchRows as any).map(r => [r.playerId, r]))
        const seasonPitchByPlayerId = new Map((seasonPitchRows as any).map(r => [r.playerId, r]))

        const gamePlayers = [].concat(game.home.players).concat(game.away.players)

        for (const player of players) {

            let pls = plss.find(p => p.playerId == player._id)

            const careerHitResult: HitResultCount = careerHitByPlayerId.get(player._id) as HitResultCount
            const seasonHitResult: HitResultCount = seasonHitByPlayerId.get(player._id) as HitResultCount

            const careerPitchResult: PitchResultCount = careerPitchByPlayerId.get(player._id) as PitchResultCount
            const seasonPitchResult: PitchResultCount = seasonPitchByPlayerId.get(player._id) as PitchResultCount

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

            let gamePlayer: GamePlayer = gamePlayers.find(gp => gp._id == player._id)

            let xpPercent = 0n

            if (player.primaryPosition == Position.PITCHER) {

                let pitchesThrown = gamePlayer.pitchResult?.pitches || 0
                let pitchingRole = this.gameService.getPitchingRole(game, gamePlayer)
                
                if (pitchesThrown > 0) {

                    if (pitchingRole == PitchingRoleType.STARTER) {

                        let maxPitchCount = player.maxPitchCount || DEFAULT_MAX_PITCH_COUNT

                        xpPercent = BigInt(
                            Math.min(
                                100,
                                Math.round((pitchesThrown / maxPitchCount) * 100)
                            )
                        )

                    } else {

                        let maxPitchCount = player.maxPitchCount || 30

                        xpPercent = BigInt(
                            Math.max(
                                5,
                                Math.round((pitchesThrown / maxPitchCount) * 20)
                            )
                        )

                    }

                } else if (pitchingRole != PitchingRoleType.STARTER) {

                    xpPercent = 5n

                }

            } else {

                xpPercent = gamePlayer.hitResult.pa > 0 ? 100n : 50n

            }

            if (xpPercent > 0n) {

                //Update overall rating.
                const positiveGame = player.primaryPosition == Position.PITCHER ? pitchResultByPlayerId.get(player._id).wpa > 0 : hitResultByPlayerId.get(player._id).wpa > 0

                //Calculate the base level of XP for this player.
                let gameExperience: bigint = this.playerService.getExperiencePerGame(positiveGame, player.primaryPosition == Position.PITCHER)

                gameExperience = gameExperience * xpPercent / 100n

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
            await this.adjustPitcherStamina(game, gamePlayer, player)

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


        let notification = Object.assign(new Notification(), {
            entityType: NotificationEntityType.GAME,
            entityId: game._id,
            eventType: NotificationEventType.GAME_FINISHED,
            channel: NotificationChannel.DISCORD,
            status: NotificationStatus.PENDING
        })

        await this.notificationsRepository.put(notification, options)

    }

    public adjustPitcherStamina(game: Game, gamePlayer: GamePlayer, player: Player) {

        if (player.primaryPosition != Position.PITCHER) {
            return
        }

        let role = this.gameService.getPitchingRole(game, gamePlayer)

        let targetMaxPitchCount = role == PitchingRoleType.STARTER
            ? DEFAULT_MAX_PITCH_COUNT
            : this.playerService.getMaxPitchCountForBullpenRole(role)

        let recovery = role == PitchingRoleType.STARTER ? 0.2 : 0.33

        let pitchesThrown = gamePlayer.pitchResult?.pitches ?? 0
        let currentMaxPitchCount = player.maxPitchCount ?? DEFAULT_MAX_PITCH_COUNT

        if (pitchesThrown > 0) {

            player.stamina = Math.max(0, (currentMaxPitchCount - pitchesThrown) / currentMaxPitchCount)

            if (pitchesThrown >= currentMaxPitchCount && currentMaxPitchCount < targetMaxPitchCount) {
                player.maxPitchCount = Math.min(targetMaxPitchCount, currentMaxPitchCount + 10)
                player.changed("maxPitchCount", true)
            }

        } else {
            player.stamina = Math.min(1, player.stamina + recovery)
        }

        player.stamina = Number(player.stamina.toFixed(2))

        player.changed("stamina", true)

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

    async buildNextSeasonLeagueStructure(season: Season, leagues: League[], teamsToMove: number, options?: any): Promise<{ structure: { league: League, teamInfo: { cityId: string, teamId: string, previousRank: number, previousLeagueId: string }[] }[], promotionRelegationLog: { _id: string, rank: number, previousRank: number }[] }> {

        let sortedLeagues = [...leagues].sort((a, b) => a.rank - b.rank)

        for (let i = 1; i < sortedLeagues.length; i++) {
            if (sortedLeagues[i].rank != sortedLeagues[i - 1].rank + 1) {
                throw new Error("League ranks must be contiguous.")
            }
        }

        let allTls = await this.teamLeagueSeasonService.listBySeason(season, options)

        let originalStructure = sortedLeagues.map(league => {

            let leagueTLS = allTls
                .filter(tls => tls.leagueId == league._id)
                .sort((a, b) => {
                    let aRank = a.overallRecord?.rank ?? Number.MAX_SAFE_INTEGER
                    let bRank = b.overallRecord?.rank ?? Number.MAX_SAFE_INTEGER

                    return aRank - bRank
                })

            return {
                league: league,
                teamInfo: leagueTLS.map(tls => {
                    return {
                        cityId: tls.cityId,
                        teamId: tls.teamId,
                        previousRank: league.rank,
                        previousLeagueId: league._id
                    }
                })
            }

        })

        let updatedStructure = originalStructure.map(leagueInfo => {
            return {
                league: leagueInfo.league,
                teamInfo: [...leagueInfo.teamInfo]
            }
        })

        let promotionRelegationLog: { _id: string, rank: number, previousRank: number }[] = []
        let plannedMoves: { teamInfo: { cityId: string, teamId: string, previousRank: number, previousLeagueId: string }, fromIndex: number, toIndex: number }[] = []
        let movedTeamIds = new Set<string>()

        for (let i = 0; i < sortedLeagues.length - 1; i++) {

            let higherOriginal = originalStructure[i]
            let lowerOriginal = originalStructure[i + 1]

            let higherAfterPlannedMoves = [
                ...higherOriginal.teamInfo,
                ...plannedMoves
                    .filter(move => move.toIndex == i)
                    .map(move => move.teamInfo)
            ].filter(teamInfo => {
                return !plannedMoves.some(move => move.fromIndex == i && move.teamInfo.teamId == teamInfo.teamId)
            })

            let toPromote: { cityId: string, teamId: string, previousRank: number, previousLeagueId: string }[] = []

            for (let candidate of lowerOriginal.teamInfo) {
                if (toPromote.length >= teamsToMove) {
                    break
                }

                if (movedTeamIds.has(candidate.teamId)) {
                    continue
                }

                let currentCityCount = higherAfterPlannedMoves.filter(ti => ti.cityId == candidate.cityId).length + toPromote.filter(ti => ti.cityId == candidate.cityId).length

                if (currentCityCount < 2) {
                    toPromote.push(candidate)
                }
            }

            let toRelegate = [...higherOriginal.teamInfo]
                .reverse()
                .filter(candidate => !movedTeamIds.has(candidate.teamId))
                .slice(0, teamsToMove)

            for (let teamInfo of toPromote) {
                movedTeamIds.add(teamInfo.teamId)

                plannedMoves.push({
                    teamInfo: teamInfo,
                    fromIndex: i + 1,
                    toIndex: i
                })

                promotionRelegationLog.push({
                    _id: teamInfo.teamId,
                    rank: higherOriginal.league.rank,
                    previousRank: teamInfo.previousRank
                })
            }

            for (let teamInfo of toRelegate) {
                movedTeamIds.add(teamInfo.teamId)

                plannedMoves.push({
                    teamInfo: teamInfo,
                    fromIndex: i,
                    toIndex: i + 1
                })

                promotionRelegationLog.push({
                    _id: teamInfo.teamId,
                    rank: lowerOriginal.league.rank,
                    previousRank: teamInfo.previousRank
                })
            }

        }

        for (let move of plannedMoves) {
            updatedStructure[move.fromIndex].teamInfo = updatedStructure[move.fromIndex].teamInfo.filter(ti => ti.teamId != move.teamInfo.teamId)
            updatedStructure[move.toIndex].teamInfo.push(move.teamInfo)
        }

        return {
            structure: updatedStructure,
            promotionRelegationLog: promotionRelegationLog
        }

    }

    async finishSeason(season: Season, leagues: League[], options?: any) {

        const TEAMS_TO_RELEGATE = 3

        let rewardTlss: TeamLeagueSeason[] = []

        for (let league of leagues) {
            rewardTlss.push(...await this.teamLeagueSeasonService.listQualifyingTeamsByLeagueAndSeason(league, season, season.endDate, options))
        }

        let leagueById = new Map<string, League>(leagues.map(league => [league._id, league]))

        let offChainEventTransactionId = uuidv4()

        for (let tls of rewardTlss) {

            let team: Team = await this.teamService.get(tls.teamId, options)
            let league: League = leagueById.get(tls.leagueId)

            if (!league) {
                throw new Error(`Could not find league ${tls.leagueId} for season end reward.`)
            }

            let wins = BigInt(tls.overallRecord.wins)
            let baseDiamondReward = BigInt(league.baseDiamondReward)
            let rewardAmount = (baseDiamondReward * wins) / 2n

            if (rewardAmount <= 0n) {
                continue
            }

            await this.distributeReward(
                team,
                tls,
                season,
                rewardAmount,
                {
                    type: "reward",
                    rewardType: "season",
                    fromDate: season.endDate
                },
                offChainEventTransactionId,
                options
            )

        }

        let nextSeason = new Season()

        nextSeason._id = uuidv4()
        nextSeason.startDate = dayjs(season.endDate).add(1, "days").toDate()
        nextSeason.endDate = dayjs(nextSeason.startDate).add(161, "day").toDate()
        nextSeason.isComplete = false
        nextSeason.isInitialized = false

        await this.seasonService.put(nextSeason, options)

        let nextLeagueStructure = await this.buildNextSeasonLeagueStructure(season, leagues, TEAMS_TO_RELEGATE, options)

        season.promotionRelegationLog = nextLeagueStructure.promotionRelegationLog

        let nextLeagueByTeamId = new Map<string, League>()

        for (let leagueInfo of nextLeagueStructure.structure) {
            for (let teamInfo of leagueInfo.teamInfo) {
                nextLeagueByTeamId.set(teamInfo.teamId, leagueInfo.league)
            }
        }

        let rolloverTeamIds = Array.from(nextLeagueByTeamId.keys())

        let currentPLSIds = await this.playerLeagueSeasonService.getMostRecentIdsBySeason(season, options)
        let currentPLSSByTeamId = new Map<string, PlayerLeagueSeason[]>()
        let freeAgentPLSS: PlayerLeagueSeason[] = []

        for (let plsId of currentPLSIds) {

            let pls: PlayerLeagueSeason = await this.playerLeagueSeasonService.getById(plsId, options)

            if (!pls.teamId) {
                freeAgentPLSS.push(pls)
                continue
            }

            if (!currentPLSSByTeamId.has(pls.teamId)) {
                currentPLSSByTeamId.set(pls.teamId, [])
            }

            currentPLSSByTeamId.get(pls.teamId).push(pls)

        }

        for (let teamId of rolloverTeamIds) {

            let team: Team = await this.teamService.get(teamId, options)

            let teamSeasonId: TeamSeasonId = {
                teamId: teamId,
                seasonId: season._id
            }

            let lastSeason: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeasonId(teamSeasonId, options)

            if (!lastSeason) {
                throw new Error(`Team ${teamId} does not have a league season record for season ${season._id}.`)
            }

            let nextLeague: League = nextLeagueByTeamId.get(teamId) ?? leagues.find(league => league._id == lastSeason.leagueId)

            if (!nextLeague) {
                throw new Error(`Could not determine next league for team ${teamId}.`)
            }

            await this.rolloverTeamToNextSeason(
                team,
                season,
                nextSeason,
                nextLeague,
                currentPLSSByTeamId.get(teamId) || [],
                options
            )

        }

        await this.rolloverFreeAgentsToNextSeason(freeAgentPLSS, nextSeason, options)

        season.isComplete = true
        season.changed("promotionRelegationLog", true)

        await this.seasonService.put(season, options)

        nextSeason.isInitialized = true

        await this.seasonService.put(nextSeason, options)

    }

    async rolloverTeamToNextSeason(team: Team, season: Season, nextSeason: Season, nextLeague: League, currentPLSS: PlayerLeagueSeason[], options?: any): Promise<{ tls: TeamLeagueSeason, plss: PlayerLeagueSeason[] }> {

        let teamSeasonId: TeamSeasonId = {
            teamId: team._id,
            seasonId: season._id
        }

        let lastSeason: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeasonId(teamSeasonId, options)

        if (!lastSeason) {
            throw new Error("Team does not have a league season record for the previous season.")
        }

        let tls: TeamLeagueSeason = await this.createTeamLeagueSeasonForNextSeason(team, lastSeason, nextSeason, nextLeague, options)

        let nextPLSS: PlayerLeagueSeason[] = []

        for (let pls of currentPLSS) {
            let player: Player = await this.playerService.get(pls.playerId, options)

            let existingPLSS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getByPlayersSeason([player], nextSeason, options)
            let existingPLS: PlayerLeagueSeason = existingPLSS.find(existing => existing.playerId == pls.playerId)

            if (existingPLS) {
                nextPLSS.push(existingPLS)
                continue
            }

            let nextPLS: PlayerLeagueSeason = await this.createPlayerLeagueSeasonForNextSeason(
                pls,
                player,
                nextSeason,
                nextLeague._id,
                options
            )

            if (nextPLS) {
                nextPLSS.push(nextPLS)
            }
        }

        return {
            tls: tls,
            plss: nextPLSS
        }

    }

    public getGameExperiencePercent(player: Player, gamePlayer: GamePlayer, pitchingRole?: PitchingRoleType): bigint {

        if (player.primaryPosition != Position.PITCHER) {
            return gamePlayer.hitResult?.pa > 0 ? 100n : 50n
        }

        let pitchesThrown = gamePlayer.pitchResult?.pitches || 0

        if (pitchesThrown <= 0) {
            return pitchingRole && pitchingRole != PitchingRoleType.STARTER ? 5n : 0n
        }

        if (pitchingRole == PitchingRoleType.STARTER) {

            let maxPitchCount = player.maxPitchCount || DEFAULT_MAX_PITCH_COUNT

            return BigInt(
                Math.min(
                    100,
                    Math.round((pitchesThrown / maxPitchCount) * 100)
                )
            )

        }

        let maxPitchCount = player.maxPitchCount || 30

        return BigInt(
            Math.max(
                5,
                Math.round((pitchesThrown / maxPitchCount) * 20)
            )
        )

    }


    private async rolloverFreeAgentsToNextSeason(freeAgentPLSS: PlayerLeagueSeason[], nextSeason: Season, options?: any): Promise<PlayerLeagueSeason[]> {

        let nextPLSS: PlayerLeagueSeason[] = []

        for (let pls of freeAgentPLSS) {
            let player: Player = await this.playerService.get(pls.playerId, options)

            let existingPLSS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getByPlayersSeason([player], nextSeason, options)
            let existingPLS: PlayerLeagueSeason = existingPLSS.find(existing => existing.playerId == pls.playerId)

            if (existingPLS) {
                nextPLSS.push(existingPLS)
                continue
            }

            let nextPLS: PlayerLeagueSeason = await this.createPlayerLeagueSeasonForNextSeason(
                pls,
                player,
                nextSeason,
                pls.leagueId,
                options
            )

            if (nextPLS) {
                nextPLSS.push(nextPLS)
            }
        }

        return nextPLSS

    }

    private async createTeamLeagueSeasonForNextSeason(team: Team, lastSeason: TeamLeagueSeason, nextSeason: Season, league: League, options?: any): Promise<TeamLeagueSeason> {

        let existing: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, nextSeason, options)

        if (existing) {
            return existing
        }

        let financeSeason: FinanceSeason = this.financeService.getDefaultFinanceSeason()
        financeSeason.diamondBalance = lastSeason.financeSeason.diamondBalance

        let tls: TeamLeagueSeason = this.teamLeagueSeasonService.init(lastSeason, team, financeSeason)

        tls.leagueId = league._id
        tls.league = league
        tls.seasonId = nextSeason._id
        tls.season = nextSeason
        tls.logoId = lastSeason.logoId
        tls.longTermRating = lastSeason.longTermRating
        tls.seasonRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }

        tls.changed("leagueId", true)
        tls.changed("seasonId", true)
        tls.changed("seasonRating", true)
        tls.changed("longTermRating", true)
        tls.changed("overallRecord", true)
        tls.changed("financeSeason", true)

        await this.teamLeagueSeasonService.put(tls, options)

        team.longTermRating = tls.longTermRating
        team.seasonRating = tls.seasonRating

        await this.teamService.put(team, options)

        return tls

    }

    private async createPlayerLeagueSeasonForNextSeason(pls: PlayerLeagueSeason, player: Player, nextSeason: Season, leagueId: string, options?: any): Promise<PlayerLeagueSeason> {

        let playerSeasons = await this.playerLeagueSeasonService.getUniqueSeasonCountByPlayer(player, options)

        player.age = DEFAULT_PLAYER_STARTING_AGE + playerSeasons

        if (player.age > PLAYER_RETIREMENT_AGE) {
            player.isRetired = true
            await this.playerService.put(player, options)
            return undefined
        }

        let nextSeasonPLS = new PlayerLeagueSeason()

        nextSeasonPLS._id = uuidv4()
        nextSeasonPLS.playerId = pls.playerId
        nextSeasonPLS.seasonId = nextSeason._id
        nextSeasonPLS.leagueId = leagueId
        nextSeasonPLS.teamId = pls.teamId
        nextSeasonPLS.userId = pls.userId
        nextSeasonPLS.seasonIndex = 1
        nextSeasonPLS.primaryPosition = pls.primaryPosition
        nextSeasonPLS.overallRating = pls.overallRating
        nextSeasonPLS.hittingRatings = pls.hittingRatings
        nextSeasonPLS.pitchRatings = pls.pitchRatings
        nextSeasonPLS.potentialOverallRating = pls.potentialOverallRating
        nextSeasonPLS.potentialHittingRatings = pls.potentialHittingRatings
        nextSeasonPLS.potentialPitchRatings = pls.potentialPitchRatings
        nextSeasonPLS.startDate = nextSeason.startDate
        nextSeasonPLS.endDate = nextSeason.endDate
        nextSeasonPLS.age = player.age

        nextSeasonPLS.stats = {
            //@ts-ignore
            hitting: this.statService.mergeHitResultsToStatLine({}, {}),
            //@ts-ignore
            pitching: this.statService.mergePitchResultsToStatLine({}, {})
        }

        let savedPLS: PlayerLeagueSeason = await this.playerLeagueSeasonService.put(nextSeasonPLS, options)

        await this.playerService.put(player, options)

        return savedPLS

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



