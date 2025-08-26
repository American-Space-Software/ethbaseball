import { inject, injectable } from "inversify"

import { GLICKO_SETTINGS, PLAYER_RETIREMENT_AGE, PlayerService } from "./player-service.js"

import { GameService } from "./game-service.js"
import { RotationPitcher, Team } from "../dto/team.js"
import {  ContractYear, GamePlayer, LeagueAverageRatings, Matchup, MIN_AAV_CONTRACT, MINIMUM_PLAYER_POOL, Rating, PromotionRelegationLog, Schedule, ScheduleDetails, SERIES_LENGTH, SeriesSchedule, TEAMS_PER_TIER, LeagueBundle, ContractType } from "./enums.js"
import { Game, GamePlayer as GP } from "../dto/game.js"
import { TeamService } from "./team-service.js"

import dayjs from "dayjs"

import glicko2 from "glicko2"
import { TeamRating } from "../repository/node/team-repository-impl.js"
import { LeagueService } from "./league-service.js"
import { League } from "../dto/league.js"
import { SeasonService } from "./season-service.js"
import { Season } from "../dto/season.js"
import { FinanceService } from "./finance-service.js"
import { TeamLeagueSeason } from "../dto/team-league-season.js"
import { TeamLeagueSeasonService } from "./team-league-season-service.js"
import { PlayerLeagueSeasonService } from "./player-league-season-service.js"
import { PlayerLeagueSeason } from "../dto/player-league-season.js"
import { v4 as uuidv4 } from 'uuid';
import { Player } from "../dto/player.js"
import { SeedService } from "./seed-service.js"
import { ethers } from "ethers"
import { RollService } from "./roll-service.js"
import { Universe } from "../dto/universe.js"
import { UniverseRepository } from "../repository/universe-repository.js"
import { LineupService } from "./lineup-service.js"
import { GamePlayerRepository } from "../repository/game-player-repository.js"
import { GameTransactionService } from "./game-transaction-service.js"
import { StatService } from "./stat-service.js"
import { faker } from '@faker-js/faker'
import { OffchainEventService } from "./offchain-event-service.js"
import { GameHitResult } from "../dto/game-hit-result.js"
import { GamePitchResult } from "../dto/game-pitch-result.js"
import { GameHitResultRepository } from "../repository/game-hit-result-repository.js"
import { GamePitchResultRepository } from "../repository/game-pitch-result-repository.js"


@injectable()
class LadderService {

    @inject("sequelize")
    private sequelize:Function

    @inject("UniverseRepository")
    private universeRepository: UniverseRepository

    @inject("GamePlayerRepository")
    private gamePlayerRepository: GamePlayerRepository

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
        private lineupService:LineupService,
        private rollService:RollService,
        private statService:StatService,
        private offchainEventService:OffchainEventService,
        private gameTransactionService:GameTransactionService
    ) {}


    async runGameRunner(universeId:string) {

        let s = await this.sequelize()

        
        await s.transaction(async (t1) => {

            let options = { transaction: t1 }

            let universe:Universe = await this.universeRepository.get(universeId, options)

            let logDate = dayjs(universe.currentDate).format("YYYY/MM/DD")

            console.log(`Running game runner (${logDate})...`)

            if (this.isDateBeforeOrEqualToToday(universe.currentDate)) {

                let leagues:League[] = await this.leagueService.listByRankAsc(options)

                let season:Season = await this.seasonService.getByDate(universe.currentDate, options)

                if (season) {


                    if (dayjs(universe.currentDate).format("YYYY/MM/DD") == dayjs(season.startDate).format("YYYY/MM/DD") && !season.isInitialized) {
                        console.time(`Starting season...`)
                        await this.startSeason(season, leagues, options)
                        console.timeEnd(`Starting season...`)
                    }

                    //Play games
                    let dayComplete:boolean = await this.processDate(season, leagues, universe.currentDate, options)
                    if (dayComplete) {
    
                        if (dayjs(universe.currentDate).format("YYYY/MM/DD") == dayjs(season.endDate).format("YYYY/MM/DD") && !season.isComplete) {
                            console.time(`Finishing season...`)
                            await this.finishSeason(season, leagues, options)
                            console.timeEnd(`Finishing season...`)
                        }
    
    
                        universe.currentDate.setDate(universe.currentDate.getDate() + 1)
                        universe.changed('currentDate', true)
                        await this.universeRepository.put(universe, options)
    
                    }

                } else {

                    //If there's no season that means we're in the off-season.


                    //Get the next scheduled season.
                    let nextSeason:Season = await this.seasonService.getMostRecent(options)

                    const oneDay = 24 * 60 * 60 * 1000 // hours*minutes*seconds*milliseconds

                    const diffDays = Math.round(Math.abs((universe.currentDate.getTime() - dayjs(nextSeason.startDate).toDate().getTime()) / oneDay))

                    let multiplier = Math.max(diffDays / 6, 1)

                    console.time(`Updating free agent contracts with ${multiplier.toFixed(3)} multiplier...`)

                    //Get league bundles for last sesason.
                    let lastSeason:Season = await this.seasonService.getMostRecentCompleted(options)
                    let lastSeasonPLS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentBySeason(lastSeason, options)
                    let leagueBundles:LeagueBundle[] = this.getLeagueBundles(leagues, lastSeasonPLS)

                    let leagueBundle:LeagueBundle = leagueBundles.find( lb => lb.league.rank == 1)

                    await this.updateFreeAgentContracts(leagueBundle, nextSeason, multiplier, options)


                    console.timeEnd(`Updating free agent contracts with ${multiplier.toFixed(3)} multiplier...`)


                    //No season just go to next date.
                    universe.currentDate.setDate(universe.currentDate.getDate() + 1)
                    universe.changed('currentDate', true)
                    await this.universeRepository.put(universe, options)
                }

                
            }

        })

    }

    private async updateFreeAgentContracts(leagueBundle:LeagueBundle, season:Season, modifier:number, options?:any) {

        //Get free agents
        const plss:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getFreeAgentsBySeason(season, options)
        const freeAgentPlayers:Player[] = await this.playerService.getByIds( plss.map( pls => pls.playerId), options)

        const nonRookies = freeAgentPlayers.filter( p => !p.contract.isRookie )

        //Get all the free agent players and generate new contracts for them and change their asking price.
        for (let player of nonRookies) {

            let nextSeasonPLS:PlayerLeagueSeason = plss.find( pls => pls.playerId == player._id)

            let years = this.playerService.getYearsContractAsk(player.age)

            if (modifier == 1 && years > 2) {
                years -= 2
            }

            this.playerService.createFreeAgentContract(player, leagueBundle.laPlayerRating, leagueBundle.laSalary, years, modifier)

            nextSeasonPLS.askingPrice = parseFloat(ethers.formatUnits(player.contract.years[0].salary, "ether")) 

        }

        await this.playerLeagueSeasonService.updateGameFields(plss, options)
        await this.playerService.updateGameFields(freeAgentPlayers, options)

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


    private calculateAverages(plss:PlayerLeagueSeason[]) : PlayerLeagueSeason {

        let sumOverallRating = 0;
        let sumAge = 0;
        let sumArm = 0;
        let sumDefense = 0;
        let sumSpeed = 0;
        let sumSteals = 0;

        let sumRPlateDiscipline = 0;
        let sumRContact = 0;
        let sumRGapPower = 0;
        let sumRHomerunPower = 0;

        let sumLPlateDiscipline = 0;
        let sumLContact = 0;
        let sumLGapPower = 0;
        let sumLHomerunPower = 0;
        
        let sumPitchPower = 0;

        let sumRPitchControl = 0;
        let sumRPitchMovement = 0;

        let sumLPitchControl = 0;
        let sumLPitchMovement = 0;

        let count = 0;
    
        plss.forEach(pls => {
            sumOverallRating += pls.overallRating;
            sumAge += pls.age;
    
            // Hitting Ratings
            sumArm += pls.hittingRatings?.arm || 0;
            sumDefense += pls.hittingRatings?.defense || 0;
            sumSpeed += pls.hittingRatings?.speed || 0;
            sumSteals += pls.hittingRatings?.steals || 0;
    
            sumRPlateDiscipline += pls.hittingRatings?.vsR?.plateDiscipline || 0;
            sumRContact += pls.hittingRatings?.vsR?.contact || 0;
            sumRGapPower += pls.hittingRatings?.vsR?.gapPower || 0;
            sumRHomerunPower += pls.hittingRatings?.vsR?.homerunPower || 0;
    
            sumLPlateDiscipline += pls.hittingRatings?.vsL?.plateDiscipline || 0;
            sumLContact += pls.hittingRatings?.vsL?.contact || 0;
            sumLGapPower += pls.hittingRatings?.vsL?.gapPower || 0;
            sumLHomerunPower += pls.hittingRatings?.vsL?.homerunPower || 0;
    
            // Pitch Ratings
            sumLPitchControl += pls.pitchRatings?.vsL?.control || 0;
            sumLPitchMovement += pls.pitchRatings?.vsL?.movement || 0;

            sumRPitchControl += pls.pitchRatings?.vsR?.control || 0;
            sumRPitchMovement += pls.pitchRatings?.vsR?.movement || 0;

            sumPitchPower += pls.pitchRatings?.power || 0;
    
            count++
        })
    
        const playerLeagueSeason = new PlayerLeagueSeason();
    
        playerLeagueSeason.overallRating = sumOverallRating / count;
        playerLeagueSeason.age = sumAge / count;
    
        // Populate hittingRatings averages
        playerLeagueSeason.hittingRatings = {
            arm: sumArm / count,
            defense: sumDefense / count,
            speed: sumSpeed / count,
            steals: sumSteals / count,
            vsR: {
                plateDiscipline: sumRPlateDiscipline / count,
                contact: sumRContact / count,
                gapPower: sumRGapPower / count,
                homerunPower: sumRHomerunPower / count,
            },
            vsL: {
                plateDiscipline: sumLPlateDiscipline / count,
                contact: sumLContact / count,
                gapPower: sumLGapPower / count,
                homerunPower: sumLHomerunPower / count,
            },
        }
    
        // Populate pitchRatings averages
        playerLeagueSeason.pitchRatings = {
            vsL: {
                control: sumLPitchControl / count,
                movement: sumLPitchMovement / count,
            },

            vsR: {
                control: sumRPitchControl / count,
                movement: sumRPitchMovement / count,
            },

            power: sumPitchPower / count,
        }
    
        return playerLeagueSeason
    }


    private async getLeagueAverageRatings(leagues:League[], allPLS:PlayerLeagueSeason[], options?:any) : Promise<LeagueAverageRatings[]> {

        let leagueAverages:LeagueAverageRatings[] = []

        for (let league of leagues) {

            let averagePLS = this.calculateAverages(allPLS.filter( pls => pls.leagueId == league._id))

            leagueAverages.push({ 
                league: league, 
                hittingRatings: averagePLS.hittingRatings,
                pitchRatings: averagePLS.pitchRatings
            })
        }

        return leagueAverages
    }


    async processDate(season:Season, leagues:League[], date:Date, options?:any) : Promise<boolean> {

        let gameIds:string[] = await this.gameService.getIdsByDate(date, options)
        if (gameIds.length == 0) return true

        let dayComplete:boolean = false

        
        //Move all games forward
        console.time(`Processing ${dayjs(date).format("YYYY/MM/DD")} (${gameIds.length} games)`)


        console.time(`Preparing data for ${dayjs(date).format("YYYY/MM/DD")}`)

        let rng = await this.seedService.getRNG(options)

        let allGames:Game[] = await this.gameService.getByIds(gameIds, options)
        let allTeams:Team[] = await this.teamService.getByIds( allGames.flatMap( g => [g.home._id, g.away._id]), options)
        let allTLS:TeamLeagueSeason[] = await this.teamLeagueSeasonService.listBySeason(season, options)
        let allPLS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentBySeason(season, options)
        
        let allPlayers:Player[] = await this.playerService.getByIds(allPLS.map ( pls => pls.playerId), options)
        let leagueAverages:LeagueAverageRatings[] = await this.getLeagueAverageRatings(leagues, allPLS)


        console.timeEnd(`Preparing data for ${dayjs(date).format("YYYY/MM/DD")}`)

        
        let allGamePlayers:GP[] = []

        console.time(`Simulating leagues (${allGames.length} total games)`)

        for (let game of allGames) {

            if (game.isComplete) continue

            let league = leagues.find( l => l._id == game.leagueId)
            let leagueAverage:LeagueAverageRatings = leagueAverages.find( la => la.league._id == league._id)

            let home = allTeams.find( t=> t._id == game.home._id)
            let away = allTeams.find( t => t._id == game.away._id)

            let homeTLS = allTLS.find( t => t.teamId == game.home._id)
            let awayTLS = allTLS.find( t => t.teamId == game.away._id)


            //If the game is ready to play and it hasn't started then fix the roster/lineups
            if (this.readyToProcess(game) && !game.isStarted) {
                
                for (let team of [home, away]) {

                    let tls = allTLS.find( t => t.teamId == team._id)
                    let teamPlss = allPLS.filter( pls => pls.teamId == team._id)

                    let added = await this.teamService.fillAndValidateRoster(league, team, tls, teamPlss, season, date, true, options)  

                    //Add any added players/pls to allPlayers/allPLS
                    added.players.forEach(p => allPlayers.find(x => x._id === p._id) ? null : allPlayers.push(p))
                    added.plss.forEach(p => allPLS.find(x => x._id === p._id) ? null : allPLS.push(p))

                    //Optimize computer lineups
                    if (!team.ownerId) {
                        this.teamService.optimizeLineup(team, tls, teamPlss.map( pls => pls.get({ plain: true })), date)
                    }

                }

            }

            let homePLS = allPLS.filter( pls => pls.teamId == game.home._id)
            let awayPLS = allPLS.filter( pls => pls.teamId == game.away._id)

            let plss = [].concat(homePLS).concat(awayPLS)
            let players:Player[] = plss.map ( pls => allPlayers.find( p => p._id == pls.playerId ))

            let result = this.processGame(rng, league, home, away, homeTLS, awayTLS, homePLS, awayPLS, players, leagueAverage, game, date)

            allGamePlayers.push(...result.gamePlayers)

            await this.gameService.put(game, options)
        }

        console.timeEnd(`Simulating leagues (${allGames.length} total games)`)

        /**
         * FINISH
         */


        //Check if all of the games are finished
        let finished:Game[] =  allGames.filter(g => g.isComplete == true && g.isFinished == true)

        console.time(`Saving data ${dayjs(date).format("YYYY/MM/DD")} (${gameIds.length} games)`)

        
        //Once all the games are finished for the day.
        if (finished.length > 0 && finished.length == gameIds.length) {

            await this.updateTeamRankings(season, finished, allTeams, allTLS, options)
            await this.gameService.updateGameRatings(finished,options )

            //create offchain-events representing profit for the day for each team
            for (let team of allTeams) {

                let teamGame = allGames.find( g => g.home._id == team._id || g.away._id == team._id)
                let isHome = teamGame.home._id == team._id

                let gameFinances = isHome ? teamGame.gameFinances.home : teamGame.gameFinances.away 

                //Get TLS
                let tls = allTLS.find( tls => tls.teamId == team._id)
                let tlsPlain = tls.get({ plain: true })

                //Get PLS
                let plss = allPLS.filter( pls => pls.teamId == team._id)
                let plssPlain = plss.map( pls => pls.get( { plain: true }))

                let totalProfit = gameFinances.totalProfit 

                if (BigInt(totalProfit) != BigInt(0)) {

                    if (BigInt(totalProfit) > BigInt(0)) {
                        await this.offchainEventService.createTeamMintEvent( team.tokenId, totalProfit, teamGame._id, options )
                    } else {
                        await this.offchainEventService.createTeamBurnEvent( team.tokenId, totalProfit, teamGame._id, options)
                    } 
                }

                //Update finances for team.
                this.financeService.updateFinanceSeason(tls.financeSeason, gameFinances)
                tls.financeSeason.diamondBalance = await this.offchainEventService.getBalanceForTokenId(ContractType.DIAMONDS, team.tokenId, options)

                this.financeService.setFinancialProjections(tls, tlsPlain.league, tlsPlain.city, tlsPlain.stadium, this.financeService.calculateProjectedPayroll(plssPlain))   

            }

            let ghr:GameHitResult[] = []
            let gpr:GamePitchResult[] = []

            for (let game of finished) {

                for (let gp of [].concat(game.home.players).concat(game.away.players)) {
                    ghr.push(this.gameService.createHitResult(game, gp))
                    gpr.push(this.gameService.createPitchResult(game, gp))
                }

            }

            await this.gameHitResultRepository.updateGameHitResults(ghr, options)
            await this.gamePitchResultRepository.updateGamePitchResults(gpr, options)

            //update player projectile ratings
            let playerPercentileRatings = await this.playerService.getPlayerPercentileRatings(options)

            for (let pRating of playerPercentileRatings) {
    
                //Update player
                let player:Player = allPlayers.find( p => p._id == pRating._id)

                player.percentileRatings = pRating
                player.changed("percentileRatings", true)

                //Update pls
                let pls:PlayerLeagueSeason = allPLS.find( p => p.playerId == pRating._id)

                pls.percentileRatings = pRating
                pls.changed("percentileRatings", true)

            }


            dayComplete = true 
        }

        //Save updated data
        for (let tls of allTLS) {
            await this.teamLeagueSeasonService.put(tls, options)
        }

        for (let team of allTeams) {
            await this.teamService.put(team, options)
        }


        if (allGamePlayers?.length > 0) {
            await this.gamePlayerRepository.insertAll(allGamePlayers, options)
        }
        
        await this.playerLeagueSeasonService.updateGameFields(allPLS, options)
        await this.playerService.updateGameFields(allPlayers, options)

        console.timeEnd(`Saving data ${dayjs(date).format("YYYY/MM/DD")} (${gameIds.length} games)`)

        console.timeEnd(`Processing ${dayjs(date).format("YYYY/MM/DD")} (${gameIds.length} games)`)

        return dayComplete

    }

    readyToProcess(game:Game) {
        return (game.isComplete == false && game.isStarted == true) ||  (game.isComplete == false && game.isStarted == false && game.startDate < new Date(new Date().toUTCString())) 
    }

    processGame(rng, league:League, home:Team, away:Team, homeTLS:TeamLeagueSeason, awayTLS:TeamLeagueSeason, homePlss:PlayerLeagueSeason[], awayPlss:PlayerLeagueSeason[], players:Player[], leagueAverage:LeagueAverageRatings, game:Game, date:Date) : GameDataBundle {

        let saveGPs:GP[] = []

        //Make sure the game is in progress or ready to progress
        if ( this.readyToProcess(game) ) {

            if (!game.isStarted) {

                //Connect the game and the player 
                for (let player of players) {
                    let gp = new GP()
                    gp.gameId = game._id
                    gp.playerId = player._id
                    saveGPs.push(gp)
                }

                let homePlssPlain = homePlss.map( p => p.get({ plain: true}))
                let awayPlssPlain = awayPlss.map( p => p.get({ plain: true}))

                let homeTlsPlain = homeTLS.get( { plain: true })
                let awayTlsPlain = awayTLS.get( { plain: true })

                let homeRotationIds = homeTLS.lineups[0].rotation.map( r => r._id)
                let homeRotation:Player[] = players.filter( p => homeRotationIds.indexOf(p._id) > -1)

                let awayRotationIds = awayTLS.lineups[0].rotation.map( r => r._id)
                let awayRotation:Player[] = players.filter( p => awayRotationIds.indexOf(p._id) > -1)

                let homeStartingPitcher:RotationPitcher = this.teamService.getStartingPitcher(homeRotation, date)
                let awayStartingPitcher:RotationPitcher = this.teamService.getStartingPitcher(awayRotation, date)

                this.gameService.startGame(game, league.rank, home, homeTlsPlain, homePlssPlain, homeStartingPitcher, away, awayTlsPlain, awayPlssPlain, awayStartingPitcher, leagueAverage, date)

                //Update games remaining/played
                //Home
                homeTLS.financeSeason.homeGamesPlayed++
                homeTLS.financeSeason.totalGamesPlayed++

                homeTLS.financeSeason.homeGamesRemaining--
                homeTLS.financeSeason.totalGamesRemaining--

                //Away
                awayTLS.financeSeason.awayGamesPlayed++
                awayTLS.financeSeason.totalGamesPlayed++

                awayTLS.financeSeason.awayGamesRemaining--
                awayTLS.financeSeason.totalGamesRemaining--


                //Update players last game date
                for (let player of players) {
                    player.lastGamePlayed = date
                }

                //Updated pitch dates for starting pitchers
                let homePitcher = players.find( p => p._id == homeStartingPitcher._id)
                homePitcher.lastGamePitched = date


                let awayPitcher = players.find( p => p._id == awayStartingPitcher._id)
                awayPitcher.lastGamePitched = date

            }

            this.gameService.incrementGame(game, this.isDateBeforeToday(date), rng)

        }

        if (game.isComplete == true && game.isFinished == false) {
            let plss = [].concat(homePlss).concat(awayPlss)
            this.gameService.finishGame(game, players, plss)
        }
        

        //Set last updated for all players
        for (let player of players) {
            player.lastGameUpdate = date
        }

    
        return {
            gamePlayers: saveGPs
        }



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

    async scheduleGenerator(tlss:TeamLeagueSeason[], league:League, season:Season, options?:any) {

        let teams = tlss.map( tls => tls.get({ plain: true }).team)

        let scheduleDetails:ScheduleDetails = this.generateSchedule(teams, season.startDate)
    
        //Create games from schedule
        for (let dateName of Object.keys(scheduleDetails.schedule)) {
            await this.gameService.scheduleGames(league, season, dayjs(dateName).toDate(), scheduleDetails.schedule[dateName], tlss, options)
        }

        season.startDate = dayjs(scheduleDetails.startDate).toDate()
        season.endDate = dayjs(scheduleDetails.endDate).toDate()
        await this.seasonService.put(season, options)

    }

    async startSeason(season:Season, leagues:League[], options?:any) {

        //Generate player pool
        // await this.generatePlayerPool(season, options)

        //Start season 
        for (let league of leagues) {

                let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.listByLeagueAndSeason(league, season, options)

                //Create pre-season finances
                for (let tls of tlss) {

                    let tlsPlain = tls.get({ plain: true })

                    let team:Team = await this.teamService.get(tls.teamId, options)
                    let roster:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getByTeamSeason(team, season, options)

                    //Set projections before adjusting roster. So we have good numbers for revenue, etc.
                    let projectedPayrollTotal = this.financeService.calculateProjectedPayroll(roster.map( r => r.get({plain: true})))
                    this.financeService.setFinancialProjections(tls, league, tlsPlain.city, tlsPlain.stadium, projectedPayrollTotal)

                    await this.teamLeagueSeasonService.put(tls, options)


                    let minimumOnly:boolean = team.ownerId ? true : false //if it's an ownerless team spend some money.

                    //Fill the rosters of each team from player pool.
                    await this.teamService.fillAndValidateRoster(league, team, tls, roster, season, season.startDate, minimumOnly, options)  

                    await this.teamLeagueSeasonService.put(tls, options)

                }

        }


        season.isInitialized = true
        await this.seasonService.put(season, options)

    }

    getLeagueBundles(leagues:League[], currentPLS:PlayerLeagueSeason[]) : LeagueBundle[] {

        let leagueBundles:LeagueBundle[] = []

        for (let league of leagues) {

            let plss = currentPLS.filter( pls => pls.leagueId == league._id)

            leagueBundles.push({
                league: league,
                laPlayerRating: this.rollService.getArrayAvg(plss.map( p => p.overallRating)),
                laSalary: this.rollService.getArrayAvg(plss.map( p => parseFloat(ethers.formatUnits(p.contractYear.salary))))
            })

        }

        return leagueBundles
    }

    async finishSeason(season:Season, leagues:League[], options?:any) {

        //Create the next season. Start 30 days from now.
        let nextSeason:Season = new Season()
        nextSeason._id = uuidv4()
        nextSeason.startDate = dayjs(season.endDate).add(30, 'days').toDate()
        nextSeason.isComplete = false
        nextSeason.isInitialized = false

        await this.seasonService.put(nextSeason, options)


        //Handle relegation
        let updatedStructure:{ league:League, teamInfo:{ cityId:string, teamId:string}[]}[] = leagues.map( l => { return { league: l, teamInfo: [] } })

        season.promotionRelegationLog = []

        for (let league of leagues) {

            let leagueTLS:TeamLeagueSeason[] = await this.teamLeagueSeasonService.listByLeagueAndSeason(league, season, options)

            let teamInfo = leagueTLS.map( tls =>  { return { teamId: tls.teamId, cityId: tls.cityId } })

            let thisLeague = updatedStructure.find( r => r.league.rank == league.rank)
            let higherLeague = updatedStructure.find( r => r.league.rank == league.rank - 1)
            let lowerLeague = updatedStructure.find( r => r.league.rank == league.rank + 1)

            if (higherLeague) {

                let i =0
                let toPromote = []

                //If we're not doing the first league...the top 3 teams go up a level.
                while (toPromote.length < 3) {

                    let current = teamInfo[i]

                    let currentCityCount = higherLeague.teamInfo.filter( ti2 => ti2.cityId == current.cityId).length + toPromote.filter(ti3 => ti3.cityId == current.cityId).length

                    if (currentCityCount < 2) {
                        toPromote.push(current)
                    }

                    i++
                }

                for (let current of toPromote) {
                    //Remove from teamInfo
                    teamInfo = teamInfo.filter( ti => ti.teamId != current.teamId)
                    higherLeague.teamInfo.push(current)
                    season.promotionRelegationLog.push({ _id: current.teamId, rank: higherLeague.league.rank, previousRank: league.rank})

                }

            }

            if (lowerLeague) {

                //If we're not doing the lowest league...the bottom 3 teams go down a level.
                //No city contraints on the way down.

                while (lowerLeague.teamInfo.length < 3) {
                    let ti = teamInfo.pop()
                    lowerLeague.teamInfo.push(ti)
                    season.promotionRelegationLog.push({ _id: ti.teamId, rank: lowerLeague.league.rank, previousRank: league.rank})
                }

            }

            //The rest stay here
            thisLeague.teamInfo.push(...teamInfo)

        }

        
        //Create next season's TLS
        for (let leagueInfo of updatedStructure) {

            let league = leagueInfo.league
            let teamIds = leagueInfo.teamInfo.map( ti => ti.teamId)

            for (let teamId of teamIds) {

                let team:Team = await this.teamService.get(teamId, options)
                let lastSeason:TeamLeagueSeason = await this.teamLeagueSeasonService.getMostRecent(team, options)

                let financeSeason = this.getDefaultFinanceSeason(this.getScheduleLength(teamIds.length, SERIES_LENGTH))
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

        for (let league of leagues) {
            let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.listByLeagueAndSeason(league, nextSeason, options)
            await this.scheduleGenerator(tlss, league, nextSeason, options)
        }


        //Create PLS for the next season or retire players

        let currentPLS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentBySeason(season, options)

        let leagueBundles:LeagueBundle[] = this.getLeagueBundles(leagues, currentPLS)
        
        for (let pls of currentPLS) {

            let player:Player = await this.playerService.get(pls.playerId, options)

            player.age += 1


            if (player.age > PLAYER_RETIREMENT_AGE) {
                player.isRetired = true
            }

            let isFinalContractYear:boolean = false

            //Close out player contracts for current season.
            if (pls.contractYear) {

                //Complete the current year of their contract.
                let contractYear:ContractYear = player.contract.years.find(y => y.startDate == dayjs(season.startDate).format("YYYY-MM-DD") && y.endDate == dayjs(season.endDate).format("YYYY-MM-DD"))
                contractYear.complete = true

                pls.contractYear.complete = true
                pls.changed("contractYear", true)

                //Complete contracts. 
                if (contractYear.startDate == player.contract.years[player.contract.years.length -1].startDate) {
                    isFinalContractYear = true
                    player.completeContracts.push(player.contract)
                    player.changed('completeContracts', true)

                }

                player.changed('contract', true)

                await this.playerLeagueSeasonService.put(pls, options)

            }

            
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
                    let nextSeasonTLS:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, nextSeason, options)


                    if (isFinalContractYear) {

                        let leagueBundle = leagueBundles.find( l => l.league._id == pls.leagueId)


                        await this.gameTransactionService.dropPlayer(leagueBundle.league, team, season, player, season.endDate, options)

                        let years = this.playerService.getYearsContractAsk(player.age)
    

                        this.playerService.createFreeAgentContract(player, leagueBundle.laPlayerRating, leagueBundle.laSalary, years, 30)
                        nextSeasonPLS.askingPrice = parseFloat(ethers.formatUnits(player.contract.years[0].salary, "ether")) 
    
                        //Remove from lineup and rotation.
                        this.lineupService.lineupRemove(nextSeasonTLS.lineups[0], pls.playerId)
                        this.lineupService.rotationRemove(nextSeasonTLS.lineups[0], pls.playerId)
    
                        nextSeasonTLS.changed("lineups", true)

                        await this.teamLeagueSeasonService.put(nextSeasonTLS, options)
    
                    } else {

                        let leagueBundle = leagueBundles.find( l => l.league._id == nextSeasonTLS.leagueId)

                        //Start contract year
                        let contractYear:ContractYear = player.contract.years.find( p => !p.complete)
                        contractYear.startDate = dayjs(nextSeason.startDate).format("YYYY-MM-DD")
                        contractYear.endDate = dayjs(nextSeason.endDate).format("YYYY-MM-DD")
        
                        let rookieSalary = this.playerService.getRookieSalary(leagueBundle.league.rank)

                        if (contractYear.isPreArbitration) {
                            contractYear.salary = ethers.parseUnits(rookieSalary.toString(), 'ether').toString()
                        } else if (contractYear.isArbitration) {
                            let leagueBundle = leagueBundles.find( l => l.league._id == nextSeasonTLS.leagueId)
                            contractYear.salary = ethers.parseUnits(this.playerService.getArbitrationSalary(player.overallRating, leagueBundle.laPlayerRating, leagueBundle.laSalary, rookieSalary).toString(), 'ether').toString()
                        }

                        player.changed('contract', true)

    
                        nextSeasonPLS.contractYear = contractYear
    
                        nextSeasonPLS.teamId = nextSeasonTLS.teamId
                        nextSeasonPLS.leagueId = nextSeasonTLS.leagueId

                    }


                } else {
                    nextSeasonPLS.askingPrice = pls.askingPrice

                }



                await this.playerLeagueSeasonService.put(nextSeasonPLS, options)

            } 

            await this.playerService.put(player, options)
  
        }


        season.isComplete = true
        season.changed("promotionRelegationLog", true)

        await this.seasonService.put(season, options)

    }




    async generatePlayerPool(season:Season,  options?:any) {

        //First purge
        let purgeable = await this.playerService.getPurgeable(options)

        for (let player of purgeable) {

            let plss:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getByPlayer(player, options)

            for (let pls of plss) {
                await this.playerLeagueSeasonService.delete(pls, options)
            }

            await this.playerService.delete(player, options)

        }

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


                this.playerService.createFreeAgentContract(player, 65, MIN_AAV_CONTRACT * 5, years, 1)
                pls.askingPrice = parseFloat(ethers.formatUnits(player.contract.years[0].salary, "ether")) 

                await this.playerService.put(player, options)
                await this.playerLeagueSeasonService.put(pls, options)                

                created++

            }
        }



    }

    updateRatings(teamRatings:{ rating:Rating, _id:string }[] , games:Game[]) : TeamRating[] {

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

    async updateTeamRankings(season:Season, games:Game[], teams:Team[], tlss:TeamLeagueSeason[], options?:any)  {

        let seasonRatings = teams.map( t =>  { return { rating: t.seasonRating, _id: t._id} })
        let longTermRatings = teams.map( t =>  { return { rating: t.longTermRating, _id: t._id} })

        let updatedSeasonRatings:TeamRating[] = this.updateRatings(seasonRatings, games)
        let updatedLongTermRatings:TeamRating[] = this.updateRatings(longTermRatings, games)

        let normalizedSeasonRatings = this.normalizeRatings(  updatedSeasonRatings   )
        let normalizedLongTermRatings = this.normalizeRatings(  updatedLongTermRatings  )

        //Get updated team records
        let teamRecords = await this.teamService.getOverallRecordsBySeason(season, options)

        //Set team ratings
        for (let seasonRating of updatedSeasonRatings) {

            let team:Team = teams.find( t => t._id == seasonRating._id)
            let tls = tlss.find( tls => tls.teamId == seasonRating._id)
            let tr = teamRecords.find( tr => tr._id == tls.teamId)
            let longTermRating = updatedLongTermRatings.find( tr => tr._id == seasonRating._id)

            let normalizedSeasonRating:number = normalizedSeasonRatings.find( tr => tr._id == seasonRating._id).rating
            let normalizedLongTermRating:number = normalizedLongTermRatings.find( tr => tr._id == seasonRating._id).rating

            team.seasonRating = seasonRating.rating
            team.longTermRating = longTermRating.rating
            team.changed("seasonRating", true)
            team.changed("longTermRating", true)

            tls.seasonRating = seasonRating.rating
            tls.longTermRating = longTermRating.rating
            tls.overallRecord = tr.overallRecord
            
            tls.fanInterestShortTerm = normalizedSeasonRating
            tls.fanInterestLongTerm = normalizedLongTermRating

            tls.changed("seasonRating", true)
            tls.changed("longTermRating", true)
            tls.changed("overallRecord", true)

        }



        //Set after ratings in game and save.
        for (let game of games) {

            game.home.seasonRating.after = updatedSeasonRatings.find(tr => tr._id == game.home._id).rating.rating
            game.home.longTermRating.after = updatedLongTermRatings.find(tr => tr._id == game.home._id).rating.rating

            game.away.seasonRating.after = updatedSeasonRatings.find(tr => tr._id == game.away._id).rating.rating
            game.away.longTermRating.after = updatedLongTermRatings.find(tr => tr._id == game.away._id).rating.rating

            game.home.overallRecord.after = teamRecords.find( tr => tr._id == game.home._id).overallRecord
            game.away.overallRecord.after = teamRecords.find( tr => tr._id == game.away._id).overallRecord

            game.changed('home', true)
            game.changed('away', true)

        }

    }

    getDefaultFinanceSeason(games:number) {

        return {

            diamondBalance: "0",

            diamondsForFreeAgents: "0",
            currentTicketPrice: "0",

            homeGamesPlayed: 0,
            homeGamesRemaining: games / 2,

            awayGamesPlayed: 0,
            awayGamesRemaining: games / 2,

            totalGamesPlayed: 0,
            totalGamesRemaining: games,

            profit: {
                projectedRemaining: { total : "0"},
                projectedTotal: { total : "0"},
                seasonToDate: { total : "0"},
            },

            expenses: {
                seasonToDate: {
                    payroll: "0",
                    stadiumLease: "0",
                    total: "0"
                },

                projectedRemaining: {
                    payroll: "0",
                    stadiumLease: "0",
                    total: "0"
                },

                projectedTotal: {
                    payroll: "0",
                    stadiumLease: "0",
                    total: "0"
                }
            },

            revenue: {
                seasonToDate: {
                    seasonTickets: "0",
                    gate: "0",
                    localMedia: "0",
                    nationalMedia: "0",
                    total: "0",
                    perGame: "0"
                },

                projectedRemaining: {
                    seasonTickets: "0",
                    gate: "0",
                    perGame: "0",
                    localMedia: "0",
                    nationalMedia: "0",
                    total: "0"
                },

                projectedTotal: {
                    seasonTickets: "0",
                    gate: "0",
                    perGame: "0",
                    localMedia: "0",
                    nationalMedia: "0",
                    total: "0"
                }
            },

            attendance: {
                seasonTicketsSold: 0,

                projectedRemaining: {
                    gateTickets: 0,
                    seasonTickets: 0,
                    totalAttendance: 0
                },

                projectedTotal: {
                    gateTickets: 0,
                    seasonTickets: 0,
                    totalAttendance: 0
                },

                seasonToDate: {
                    gateTickets: 0,
                    seasonTickets: 0,
                    totalAttendance: 0
                }
            },

        }
    }

    private shuffleArray(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1))
            var temp = array[i]
            array[i] = array[j]
            array[j] = temp
        }
    }

}


interface GameDataBundle {
    // game:Game
    // home:Team
    // away:Team
    // awayTLS:TeamLeagueSeason
    // homeTLS:TeamLeagueSeason
    // homePlss:PlayerLeagueSeason[]
    // awayPlss:PlayerLeagueSeason[]
    // players:Player[]
    gamePlayers:GP[]
}

export {
    LadderService
}



