import { inject, injectable } from "inversify"

import { GLICKO_SETTINGS, PLAYER_RETIREMENT_AGE, PlayerService } from "./data/player-service.js"

import { GameService } from "./data/game-service.js"
import { FinanceSeason, RotationPitcher, Team } from "../dto/team.js"
import {  GamePlayer, LeagueAverageRatings, Matchup, MINIMUM_PLAYER_POOL, Rating, Schedule, ScheduleDetails, SERIES_LENGTH, SeriesSchedule, ContractType, Position, TeamSeasonId, DIAMONDS_PER_DAY, RewardPerTeam, OffChainEventSource } from "./enums.js"
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
        private teamQueueService:TeamQueueService
    ) {}


    async runGameRunner(universeId:string) : Promise<string[]> {

        let s = await this.sequelize()

        let gameIds:string[] = []

        await s.transaction(async (t1) => {

            let options = { transaction: t1 }
            let rng = await this.seedService.getRNG(options)

            let universe:Universe = await this.universeRepository.get(universeId, options)

            if (!this.isDateBeforeOrEqualToToday(universe.currentDate)) return

            let logDate = dayjs(universe.currentDate).format("YYYY/MM/DD")

            console.time(`Running game runner (${logDate})...`)

            let leagues:League[] = await this.leagueService.listByRankAsc(options)
            let season:Season = await this.seasonService.getByDate(universe.currentDate, options)

            if (season) {

                //Check if we should start the games for the day.
                const shouldStartDay = await this.shouldStartDay(universe, options)

                if (shouldStartDay) {

                    for(let league of leagues) {

                        const queued = await this.teamQueueService.listByLeague(league, 1000000, 0, options)

                        if (queued.length > 0) {

                            const queuedTeams: Team[] = await this.teamService.getByIds(queued.map(q => q.teamId), options)

                            let teamBundles:TeamBundle[] = []

                            for (let team of queuedTeams) {
                                teamBundles.push(await this.getTeamBundle(team, season, options))
                            }

                            // Catch-up phase (before scheduling today's games)
                            await this.playMakeupGames(teamBundles, league, season, universe.currentDate, rng, options)

                            if (queuedTeams.length > 0) {
                                await this.createDayGames(universe.currentDate, league, season, teamBundles, options)
                            }

                        }

                    }

                    await this.teamQueueService.clear(options)

                }


                //Play games
                gameIds.push(...await this.processGames(leagues, universe.currentDate, false, rng, options))
                
                //Check if we've moved past universe.currentDate AND that all games from that day have ended.
                if (this.isDateBeforeToday(universe.currentDate)) {

                    let inProgressGameIds = await this.gameService.getUnfinishedByDateIds(universe.currentDate, options) 

                    if (inProgressGameIds?.length == 0) {
                        await this.finishDay(universe, leagues, season, options)
                    }

                }


            } 

            console.timeEnd(`Running game runner (${logDate})...`)


        })

        return gameIds

    }

    private async playMakeupGames(teamBundles:TeamBundle[], league:League, season:Season, universeDate:Date, rng, options?:any) : Promise<void> {

        const getSeasonDayNumber = (d: Date): number => {
            const start = dayjs(season.startDate).startOf('day')
            const cur = dayjs(d).startOf('day')
            return cur.diff(start, 'day') + 1
        }

        const getGamesPlayed = (b: TeamBundle): number =>
            (b.tls.overallRecord.wins + b.tls.overallRecord.losses)

        // Must be caught up through yesterday before scheduling today's games
        const yesterday = dayjs(universeDate).subtract(1, 'day').startOf('day')

        const universeDayNumber = getSeasonDayNumber(universeDate)
        const requiredGamesByYesterday = Math.max(0, universeDayNumber - 1)

        const getMakeupGamesNeeded = (b: TeamBundle): number =>
            Math.max(0, requiredGamesByYesterday - getGamesPlayed(b))

        let maxMakeupNeeded = 0
        for (const b of teamBundles) {
            maxMakeupNeeded = Math.max(maxMakeupNeeded, getMakeupGamesNeeded(b))
        }

        if (maxMakeupNeeded <= 0) return

        // Oldest makeup day we need to simulate (inclusive)
        const firstMakeupDate = yesterday.clone().subtract(maxMakeupNeeded - 1, 'day').startOf('day')

        // Loop historic days oldest -> yesterday
        for (let d = firstMakeupDate.clone(); d.isSame(yesterday) || d.isBefore(yesterday); d = d.add(1, 'day')) {

            const makeupDate = d.toDate()
            const dayNumber = getSeasonDayNumber(makeupDate)

            // A team needs to play on this historic day if gamesPlayed < dayNumber
            const needingToday: TeamBundle[] = []

            for (const b of teamBundles) {
                if (getGamesPlayed(b) < dayNumber) needingToday.push(b)
            }

            if (needingToday.length === 0) continue

            // Create + play this day's makeup games 
            let games:Game[] = await this.createDayGames(makeupDate, league, season, needingToday, options)

            for (let game of games) {
               await this.processGame(game, rng, true, options)
            }
            


            // Refresh any bundles that played, in-place in the original array
            for (let i = 0; i < teamBundles.length; i++) {
                const played = needingToday.find(x => x.team._id === teamBundles[i].team._id)
                if (!played) continue
                teamBundles[i] = await this.getTeamBundle(teamBundles[i].team, season, options)
            }

        }

    }

    private async shouldStartDay(universe: Universe, options?: any): Promise<boolean> {

        const nowUtc = dayjs.utc()

        const startDay = dayjs(universe.currentDate).utc().format("YYYY-MM-DD")
        const startTimeUtc = dayjs.tz(`${startDay} 13:00`, "America/New_York").utc()

        const shouldStartDayByTime = nowUtc.isSame(startTimeUtc) || nowUtc.isAfter(startTimeUtc)

        if (!shouldStartDayByTime) return false

        const existingGameIds = await this.gameService.getIdsByDate(universe.currentDate, {
            ...options,
            limit: 1
        })

        return !existingGameIds?.length
    }

    private async getTeamBundle( theTeam: Team, season: Season, options?: any) : Promise<TeamBundle> {

        const tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(theTeam, season, options)

        const tlsPlain: TeamLeagueSeason = tls.get({ plain: true })

        const plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeam(theTeam, options)

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

    private async createDayGames( currentDate: Date, league: League,  season: Season, teamBundles: TeamBundle[], options?: any ) {

        const games:Game[] = []

        const getRating = (t: Team): number =>
            (t.longTermRating.rating + t.seasonRating.rating) / 2

        const isBundleEligible = (bundle: TeamBundle): boolean => {
            try {
                this.teamService.validateLineup(
                    bundle.team,
                    bundle.tls.lineups[0],
                    bundle.plssPlain,
                    bundle.startingPitcher,
                    currentDate
                )
                return true
            } catch {
                return false
            }
        }

        const buildClosestPairs = async ( bundles: TeamBundle[] ): Promise<{ home: TeamBundle; away: TeamBundle }[]> => {

            const eligible: TeamBundle[] = bundles.filter(isBundleEligible)

            const remaining: TeamBundle[] = eligible
                .slice()
                .sort((a, b) => getRating(b.team) - getRating(a.team))

            const pairs: { home: TeamBundle; away: TeamBundle }[] = []

            while (remaining.length >= 2) {

                const home: TeamBundle = remaining.shift() as TeamBundle
                const homeRating = getRating(home.team)

                let bestIdx = 0
                let bestDiff = Math.abs(
                    homeRating - getRating(remaining[0].team)
                )

                for (let i = 1; i < remaining.length; i++) {
                    const diff = Math.abs(
                        homeRating - getRating(remaining[i].team)
                    )
                    if (diff < bestDiff) {
                        bestDiff = diff
                        bestIdx = i
                    }
                }

                const away: TeamBundle = remaining.splice(bestIdx, 1)[0]

                pairs.push({ home: home, away: away })
            }

            if (remaining.length === 1) {

                const bye: TeamBundle = remaining[0]

                const bot: Team = await this.teamService.getClosetRatedBot(  bye.team.longTermRating.rating, options )

                const botBundle = await this.getTeamBundle(bot, season, options)

                if (isBundleEligible(botBundle)) {
                    pairs.push({ home: bye, away: botBundle })
                }
            }

            return pairs
        }

        const pairs = await buildClosestPairs(teamBundles)

        for (const { home, away } of pairs) {
            games.push(await this.createGame(home, away, league, season, currentDate, options))
        }

        return games

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
            leagueAverageRatings: league.averageRating
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

    private async finishDay(universe:Universe, leagues:League[], season:Season, options?:any) {

        //Tasks to finish day.
        let teamIds:string[] = await this.teamService.getTeamIdsByGameDate(universe.currentDate, options)
        let playerIds:string[] = await this.playerService.getPlayerIdsByGameDate(universe.currentDate, options)

        if (playerIds?.length > 0) {

            //Update player ratings.
            let players:Player[] = await this.playerService.getByIds(playerIds, options)
            let plss = await this.playerLeagueSeasonService.getByPlayersSeason(players, season, options)

            for (let player of players) {

                let pls = plss.find( p => p.playerId == player._id)

                //Update overall rating
                //Get player's full results for the day. If WPA is positive they go up. Otherwise, down. Recalculate ratings after.
                if (player.primaryPosition == Position.PITCHER) {
                    let gprSums = await this.gamePitchResultRepository.getSumsByPlayerAndDate(player, universe.currentDate, options)
                    player.overallRating = this.playerService.updateOverallRating(player.overallRating, gprSums.wpa > 0, player.age, true)
                } else {

                    let ghrSums = await this.gameHitResultRepository.getSumsByPlayerAndDate(player, universe.currentDate, options)
                    player.overallRating = this.playerService.updateOverallRating(player.overallRating, ghrSums.wpa > 0, player.age, false)
                }

                await this.playerService.updateHittingPitchingRatings(player)

                player.changed("overallRating", true)
                player.changed("displayRating", true)
                player.changed("hittingRatings", true)
                player.changed("pitchRatings", true)

                pls.overallRating = player.overallRating
                pls.hittingRatings = player.hittingRatings
                pls.pitchRatings = player.pitchRatings
                
                pls.changed("overallRating", true)
                pls.changed("displayRating", true)
                pls.changed("hittingRatings", true)
                pls.changed("pitchRatings", true)

                await this.playerService.put(player, options)
                await this.playerLeagueSeasonService.put(pls, options)

            }

            //Distribute team rewards
            let teams:Team[] = await this.teamService.getByIds(teamIds, options)

            let teamSeasonIds:TeamSeasonId[] = teamIds.map( t => { return { teamId: t, seasonId: season._id } })

            let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.getByTeamSeasonIds(teamSeasonIds, options)

            //Calculate daily rewards. Only to teams that played.
            let rewardsPerTeam = this.financeService.calculateRewardsPerTeam(DIAMONDS_PER_DAY, teams)

            await this.distributeRewards(rewardsPerTeam, teams, tlss, season, { type: "reward", rewardType:"daily", fromDate: universe.currentDate }, options)
            
            //save.
            for (let team of teams) {
                await this.teamService.put(team, options)
            }

            //Save
            for (let tls of tlss) {
                await this.teamLeagueSeasonService.put(tls, options)
            }

            //Update league average player ratings.
            await this.leagueService.updateLeagueAveragePlayerRatings(leagues, season, options)

            if (dayjs(universe.currentDate).format("YYYY/MM/DD") == dayjs(season.endDate).format("YYYY/MM/DD") && !season.isComplete) {
                console.time(`Finishing season...`)
                await this.finishSeason(season, leagues, options)
                console.timeEnd(`Finishing season...`)
            }


        }

        universe.currentDate.setDate(universe.currentDate.getDate() + 1)
        universe.changed('currentDate', true)
        await this.universeRepository.put(universe, options)


    }

    private async distributeRewards(rewardsPerTeam:RewardPerTeam[], rewardTeams:Team[], rewardTlss:TeamLeagueSeason[], season:Season, source:OffChainEventSource, options?:any) {
        
        //Distribute rewards and save.
        for (let team of rewardTeams) {

            let reward = rewardsPerTeam.find( r => r._id == team._id)

            if (reward) {

                let tls = rewardTlss.find( t => t.teamId == team._id)
                let rewardTotal = ethers.parseUnits(reward.amount.toString(), 'ether')

                await this.distributeReward(team, tls, season, rewardTotal, source, options )
            
            }

        }

    }

    private async distributeReward(team:Team, tls:TeamLeagueSeason, season:Season, rewardAmount:bigint, source:OffChainEventSource, options?:any) {

        await this.offchainEventService.createTeamMintEvent(team._id, rewardAmount.toString(), source, options )

        //Calculate my season rewards
        let seasonRewards = await this.offchainEventService.getRewardsForTeamSeason(ContractType.DIAMONDS, team, season, options)
        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id, options)

        tls.financeSeason.revenue.seasonToDate.total = BigInt(seasonRewards).toString()
        tls.financeSeason.diamondBalance = BigInt(diamondBalance).toString()

        tls.changed("financeSeason", true)

    }

    private isDateBeforeOrEqualToToday(date:Date) : boolean {

        var compareDate = new Date(date.getTime())
        let today =  new Date(new Date().toUTCString())

        compareDate.setHours(0,0,0,0)
        today.setHours(0,0,0,0)

        return compareDate <= today

    }

    private isDateBeforeToday(date:Date) : boolean {

        var compareDate = new Date(date.getTime())
        let today =  new Date(new Date().toUTCString())

        compareDate.setHours(0,0,0,0)
        today.setHours(0,0,0,0)

        return compareDate < today

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

    async finishGame(game:Game, options?:any) {

        let season:Season = await this.seasonService.get(game.seasonId, options)
        
        let away:Team = await this.teamService.get(game.away._id, options)
        let home:Team = await this.teamService.get(game.home._id, options)

        let awayTLS:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(away, season, options)
        let homeTLS:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(home, season, options)

        let players = await this.playerService.getByIds( [].concat(game.home.players).concat(game.away.players).map( p => p._id), options )
        let plssIds = await this.playerLeagueSeasonService.getIdsByPlayersSeason(players, season, options)

        let plss = await this.playerLeagueSeasonService.getByIds(plssIds, options)

        this.gameService.finishGame(game, players, plss)

        await this.gameService.put(game, options)

        let homeRecord = await this.teamService.updateSeasonRecord(home, season, homeTLS, options)
        let awayRecord = await this.teamService.updateSeasonRecord(away, season, awayTLS, options)

        game.home.overallRecord.after = JSON.parse(JSON.stringify(homeRecord))
        game.away.overallRecord.after = JSON.parse(JSON.stringify(awayRecord))

        game.changed("away", true)
        game.changed("home", true)

        //Update results for players
        let ghr:GameHitResult[] = []
        let gpr:GamePitchResult[] = []

        for (let gp of [].concat(game.home.players).concat(game.away.players)) {
            ghr.push(this.gameService.createHitResult(game, gp))
            gpr.push(this.gameService.createPitchResult(game, gp))
        }

        await this.gameHitResultRepository.updateGameHitResults(ghr, options)
        await this.gamePitchResultRepository.updateGamePitchResults(gpr, options)

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

    }

    getScheduleLength(teamCount:number, seriesLength:number) {
        return ((teamCount - 1) * 2 * seriesLength) 
    }

    generateSchedule(teams:Team[], date:Date) : ScheduleDetails {

        let startDate = dayjs(date).format('YYYY/MM/DD')

        let schedule:Schedule = {}
        let seriesSchedule:SeriesSchedule = {}

        const matchupCount = teams.length/2

        let homeTeams:Team[] = JSON.parse(JSON.stringify(teams.slice(0,matchupCount)))
        let awayTeams:Team[] = JSON.parse(JSON.stringify(teams.slice(matchupCount)))

        if (homeTeams.length != awayTeams.length) throw new Error("Invalid number of teams.")

        for (let series = 0; series < teams.length - 1 ; series++) {

            const matchups: Matchup[] = []

            for (let [index, homeTeam] of homeTeams.entries()) {
                if (homeTeam._id == awayTeams[index]._id) continue
                matchups.push({ home: homeTeam._id, away: awayTeams[index]._id})
            }

            if (matchups.length != matchupCount) throw new Error("Invalid scheduling matchups.")

            for (let game=0; game < SERIES_LENGTH; game++) {

                seriesSchedule[series] = []

                for (let matchup of matchups) {
                    seriesSchedule[series].push( { homeId: matchup.home, awayId: matchup.away })
                }

            }

            //Round robin

            //Move the second in the home array to first in the away array
            awayTeams.unshift(homeTeams.splice(1, 1)[0])


            //Move the last in the away array to last in the home array
            homeTeams.push(awayTeams.pop())

        }

        //Repeat the same schedule but swap home/away
        for (let series of Object.keys(seriesSchedule)) {

            let s = parseInt(series)

            seriesSchedule[s + teams.length - 1] = seriesSchedule[s].map( g => {
                return { homeId: g.awayId, awayId: g.homeId }
            })

        }

        //Generate schedule with dates from series schedule
        for (let series of Object.keys(seriesSchedule)) {

            let games = seriesSchedule[series]

            for (let i=0; i < SERIES_LENGTH; i++) {

                let dateName = dayjs(date).format('YYYY/MM/DD')
                schedule[dateName] = []

                for (let game of games) {
                    schedule[dateName].push(game)
                }

                // Increment the date by one day
                date.setDate(date.getDate() + 1)
            }

        }
        
        //Count every team's home games. 
        const homeGamesCount = teams.reduce((counts, team) => {
            counts[team._id] = Object.values(schedule).flat().filter(game => game.homeId === team._id).length
            return counts;
        }, {} as Record<string, number>)

        //Count every team's away games.
        const awayGamesCount = teams.reduce((counts, team) => {
            counts[team._id] = Object.values(schedule).flat().filter(game => game.awayId === team._id).length
            return counts;
        }, {} as Record<string, number>)

        let targetGameCount = this.getScheduleLength(teams.length, SERIES_LENGTH) / 2

        // Verify that every team has exactly targetGameCount home and away games
        teams.forEach(team => {

            const homeCount = homeGamesCount[team._id] || 0
            const awayCount = awayGamesCount[team._id] || 0

            if (homeCount !== targetGameCount) {
                throw new Error(`Team ${team.name} does not have ${targetGameCount} home games. Found: ${homeCount}`)
            }

            if (awayCount !== targetGameCount) {
                throw new Error(`Team ${team.name} does not have ${targetGameCount} away games. Found: ${awayCount}`)
            }

        })

        return {
            startDate: startDate,
            endDate: dayjs(date).format('YYYY/MM/DD'),
            schedule: schedule
        }


    }
    
    // async scheduleGenerator(tlss:TeamLeagueSeason[], league:League, season:Season, options?:any) {

    //     let teams = tlss.map( tls => tls.get({ plain: true }).team)

    //     let scheduleDetails:ScheduleDetails = this.generateSchedule(teams, season.startDate)
    
    //     //Create games from schedule
    //     for (let dateName of Object.keys(scheduleDetails.schedule)) {
    //         await this.gameService.scheduleGames(league, season, dayjs(dateName).toDate(), scheduleDetails.schedule[dateName], tlss, options)
    //     }

    //     season.startDate = dayjs(scheduleDetails.startDate).toDate()
    //     season.endDate = dayjs(scheduleDetails.endDate).toDate()
    //     await this.seasonService.put(season, options)

    // }

    async finishSeason(season:Season, leagues:League[], options?:any) {

        //Distribute rewards to anyone that played at least one game and finished above the threshhold
        let teamIds = await this.teamService.getTeamIdsBySeason(season, options)
        let teamSeasonIds:TeamSeasonId[] = teamIds.map( t => { return { teamId: t, seasonId: season._id } })

        let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.getByTeamSeasonIds(teamSeasonIds, options)

        //Calculate season end rewards.
        let rewardTeams = await this.teamService.getByIds(teamIds, options)
        let rewardsPerTeam = this.financeService.calculateRewardsPerTeam(DIAMONDS_PER_DAY * 20, rewardTeams)

        await this.distributeRewards(rewardsPerTeam, rewardTeams, tlss, season, { type: "reward", rewardType:"season", fromDate: season.endDate }, options)


        //Create the next season. 
        let nextSeason:Season = new Season()
        nextSeason._id = uuidv4()
        nextSeason.startDate = dayjs(season.endDate).add(1, 'days').toDate()
        nextSeason.isComplete = false
        nextSeason.isInitialized = false

        await this.seasonService.put(nextSeason, options)

        //Handle relegation
        let updatedStructure:{ league:League, teamInfo:{ cityId:string, teamId:string}[]}[] = leagues.map( l => { return { league: l, teamInfo: [] } })

        // season.promotionRelegationLog = []

        // for (let league of leagues) {

        //     let leagueTLS:TeamLeagueSeason[] = await this.teamLeagueSeasonService.listByLeagueAndSeason(league, season, options)

        //     let teamInfo = leagueTLS.map( tls =>  { return { teamId: tls.teamId, cityId: tls.cityId } })

        //     let thisLeague = updatedStructure.find( r => r.league.rank == league.rank)
        //     let higherLeague = updatedStructure.find( r => r.league.rank == league.rank - 1)
        //     let lowerLeague = updatedStructure.find( r => r.league.rank == league.rank + 1)

        //     if (higherLeague) {

        //         let i =0
        //         let toPromote = []

        //         //If we're not doing the first league...the top 3 teams go up a level.
        //         while (toPromote.length < 3) {

        //             let current = teamInfo[i]

        //             let currentCityCount = higherLeague.teamInfo.filter( ti2 => ti2.cityId == current.cityId).length + toPromote.filter(ti3 => ti3.cityId == current.cityId).length

        //             if (currentCityCount < 2) {
        //                 toPromote.push(current)
        //             }

        //             i++
        //         }

        //         for (let current of toPromote) {
        //             //Remove from teamInfo
        //             teamInfo = teamInfo.filter( ti => ti.teamId != current.teamId)
        //             higherLeague.teamInfo.push(current)
        //             season.promotionRelegationLog.push({ _id: current.teamId, rank: higherLeague.league.rank, previousRank: league.rank})

        //         }

        //     }

        //     if (lowerLeague) {

        //         //If we're not doing the lowest league...the bottom 3 teams go down a level.
        //         //No city contraints on the way down.

        //         while (lowerLeague.teamInfo.length < 3) {
        //             let ti = teamInfo.pop()
        //             lowerLeague.teamInfo.push(ti)
        //             season.promotionRelegationLog.push({ _id: ti.teamId, rank: lowerLeague.league.rank, previousRank: league.rank})
        //         }

        //     }

        //     //The rest stay here
        //     thisLeague.teamInfo.push(...teamInfo)

        // }
        
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

        // for (let league of leagues) {
        //     let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.listByLeagueAndSeason(league, nextSeason, options)
        //     await this.scheduleGenerator(tlss, league, nextSeason, options)
        // }

        //Create PLS for the next season or retire players
        let currentPLS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentBySeason(season, options)
        
        for (let pls of currentPLS) {

            let player:Player = await this.playerService.get(pls.playerId, options)

            player.age += 1


            if (player.age > PLAYER_RETIREMENT_AGE) {
                player.isRetired = true
            }

            // let isFinalContractYear:boolean = false

            // //Close out player contracts for current season.
            // if (pls.contractYear) {

            //     //Complete the current year of their contract.
            //     let contractYear:ContractYear = player.contract.years.find(y => y.startDate == dayjs(season.startDate).format("YYYY-MM-DD") && y.endDate == dayjs(season.endDate).format("YYYY-MM-DD"))
            //     contractYear.complete = true

            //     pls.contractYear.complete = true
            //     pls.changed("contractYear", true)

            //     //Complete contracts. 
            //     if (contractYear.startDate == player.contract.years[player.contract.years.length -1].startDate) {
            //         isFinalContractYear = true
            //         player.completeContracts.push(player.contract)
            //         player.changed('completeContracts', true)

            //     }

            //     player.changed('contract', true)

            //     await this.playerLeagueSeasonService.put(pls, options)

            // }

            
            if (!player.isRetired) {
                
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



                if (pls.teamId) {

                    let team:Team = await this.teamService.get(pls.teamId, options)
                    // let nextSeasonTLS:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, nextSeason, options)


                    // if (isFinalContractYear) {

                    //     let leagueBundle = leagueBundles.find( l => l.league._id == pls.leagueId)


                    //     await this.gameTransactionService.dropPlayer(leagueBundle.league, team, season, player, season.endDate, options)

                    //     let years = this.playerService.getYearsContractAsk(player.age)
    

                    //     this.playerService.createFreeAgentContract(player, leagueBundle.laPlayerRating, leagueBundle.laSalary, years, 30)
                    //     nextSeasonPLS.askingPrice = parseFloat(ethers.formatUnits(player.contract.years[0].salary, "ether")) 
    
                    //     //Remove from lineup and rotation.
                    //     this.lineupService.lineupRemove(nextSeasonTLS.lineups[0], pls.playerId)
                    //     this.lineupService.rotationRemove(nextSeasonTLS.lineups[0], pls.playerId)
    
                    //     nextSeasonTLS.changed("lineups", true)

                    //     await this.teamLeagueSeasonService.put(nextSeasonTLS, options)
    
                    // } else {

                    //     let leagueBundle = leagueBundles.find( l => l.league._id == nextSeasonTLS.leagueId)

                    //     //Start contract year
                    //     let contractYear:ContractYear = player.contract.years.find( p => !p.complete)
                    //     contractYear.startDate = dayjs(nextSeason.startDate).format("YYYY-MM-DD")
                    //     contractYear.endDate = dayjs(nextSeason.endDate).format("YYYY-MM-DD")
        
                    //     let rookieSalary = this.playerService.getRookieSalary(leagueBundle.league.rank)

                    //     if (contractYear.isPreArbitration) {
                    //         contractYear.salary = ethers.parseUnits(rookieSalary.toString(), 'ether').toString()
                    //     } else if (contractYear.isArbitration) {
                    //         let leagueBundle = leagueBundles.find( l => l.league._id == nextSeasonTLS.leagueId)
                    //         contractYear.salary = ethers.parseUnits(this.playerService.getArbitrationSalary(player.overallRating, leagueBundle.laPlayerRating, leagueBundle.laSalary, rookieSalary).toString(), 'ether').toString()
                    //     }

                    //     player.changed('contract', true)

    
                    //     nextSeasonPLS.contractYear = contractYear
    
                    //     nextSeasonPLS.teamId = nextSeasonTLS.teamId
                    //     nextSeasonPLS.leagueId = nextSeasonTLS.leagueId

                    // }


                } else {
                    // nextSeasonPLS.askingPrice = pls.askingPrice

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

    // returns "YYYY-MM-DD" for the date users are queueing for right now
    getQueueForDate(currentDate:Date) : string {

        const nowUtc = dayjs.utc()
        const universeDay = dayjs(currentDate).utc().format("YYYY-MM-DD")
        const cutoffUtc = dayjs.tz(`${universeDay} 13:00`, "America/New_York").utc()
        return nowUtc.isBefore(cutoffUtc)
            ? universeDay
            : dayjs(universeDay).add(1, "day").format("YYYY-MM-DD")

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



