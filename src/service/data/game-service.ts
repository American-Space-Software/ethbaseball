import { inject, injectable } from "inversify"
import { Game, GameTeam, GamePlayer as GP } from "../../dto/game.js"
import {   GamePlayer, BaseRunners, LastPlay, Score, TeamInfo, UpcomingMatchup, Play,  HomeAway, OverallRecord, } from "../enums.js"

import { RollService,  } from "../roll-service.js"
import { GameRepository } from "../../repository/game-repository.js"
import { SeedService } from "./seed-service.js"

import { PlayerService } from "./player-service.js"
import { Team } from "../../dto/team.js"
import { League } from "../../dto/league.js"
import { Season } from "../../dto/season.js"
import { TeamLeagueSeason } from "../../dto/team-league-season.js"
import { GameTeamRepository } from "../../repository/game-team-repository.js"
import { StatService } from "../stat-service.js"
import { GamePitchResult } from "../../dto/game-pitch-result.js"
import { GameHitResult } from "../../dto/game-hit-result.js"
import { GamePlayerRepository } from "../../repository/game-player-repository.js"
import { GameSharedService } from "../shared/game-shared-service.js"
import { SimSharedService } from "../shared/sim-shared-service.js"



@injectable()
class GameService {

    @inject("GameRepository")
    private gameRepository:GameRepository

    @inject("GameTeamRepository")
    private gameTeamRepository:GameTeamRepository

    @inject("GamePlayerRepository")
    private gamePlayerRepository: GamePlayerRepository


    constructor(
        private seedService:SeedService,
        private gameSharedService:GameSharedService,
        private simSharedService:SimSharedService
    ) { }

    async get(_id:string, options?:any) {
        return this.gameRepository.get(_id, options)
    }

    async getByIds(_ids:string[], options?:any) {
        return this.gameRepository.getByIds(_ids, options)
    }

    async put(game:Game, options?:any) {
        return this.gameRepository.put(game, options)
    }

    async getReadyForIncrementIds(options?:any) {
        return this.gameRepository.getReadyForIncrementIds(options)
    }

    async getLastUpdate(options?:any) : Promise<Date> {
        return this.gameRepository.getLastUpdate(options)
    }

    async getUpdatedSince(date:Date, options?:any) : Promise<Game[]> {

        let ids = await this.gameRepository.getIdsUpdatedSince(date, options)
        if (ids.length == 0) return []

        let games:Game[] = await this.gameRepository.getByIds(ids, options)
        
        //Sort so it matches ids order
        games.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })

        return games

    }

    async getRecentScheduledDate(options?:any) : Promise<Date> {
        return this.gameRepository.getRecentScheduledDate(options)
    }

    async getByLeague(league:League, options?:any) {

        let ids = await this.gameRepository.getByLeagueIds(league, options)
        if (ids.length == 0) return []

        let games:Game[] = await this.gameRepository.getByIds(ids, options)
        
        //Sort so it matches ids order
        games.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })

        return games
    }

    async getByDateAndTeam(date:Date, team:Team, options?:any) {

        let ids = await this.gameRepository.getByDateAndTeamIds(date, [team], options)
        if (ids.length == 0) return []

        let games:Game[] = await this.gameRepository.getByIds(ids, options)
        
        //Sort so it matches ids order
        games.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })

        return games
    }

    async getByDatesAndTeam(dates:Date[], team:Team, options?:any) {

        let ids = await this.gameRepository.getByDatesAndTeamIds(dates, [team], options)
        if (ids.length == 0) return []

        let games:Game[] = await this.gameRepository.getByIds(ids, options)
        
        //Sort so it matches ids order
        games.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })

        return games
    }

    async getByDateAndTeams(date:Date, teams:Team[], options?:any) {

        let ids = await this.gameRepository.getByDateAndTeamIds(date, teams, options)
        if (ids.length == 0) return []

        let games:Game[] = await this.gameRepository.getByIds(ids, options)
        
        //Sort so it matches ids order
        games.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })

        return games
    }

    async getRecentByTeam(team:Team, options?:any) {

        let ids = await this.gameRepository.getRecentIdsByTeam(team, options.limit, options.offset, options)
        if (ids.length == 0) return []

        let games:Game[] = await this.gameRepository.getByIds(ids, options)
        
        //Sort so it matches ids order
        games.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })

        return games
    }

    async getByDatesAndTeams(dates:Date[], teams:Team[], options?:any) {

        let ids = await this.gameRepository.getByDatesAndTeamIds(dates, teams, options)
        if (ids.length == 0) return []

        let games:Game[] = await this.gameRepository.getByIds(ids, options)
        
        //Sort so it matches ids order
        games.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })

        return games
    }

    async getByTeamAndSeason(team:Team, season:Season, options?:any) {

        let ids = await this.gameRepository.getIdsByTeamAndSeason(team, season, options)
        if (ids.length == 0) return []

        let games:Game[] = await this.gameRepository.getByIds(ids, options)
        
        //Sort so it matches ids order
        games.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })

        return games
    }

    async getNoSummary(options?:any) {

        let ids = await this.gameRepository.getIdsNoSummary(options)
        if (ids.length == 0) return []

        let games:Game[] = await this.gameRepository.getByIds(ids, options)
        
        //Sort so it matches ids order
        games.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })

        return games
    }

    async getIdsByDate(date:Date, options?:any) {
        return this.gameRepository.getByDateIds(date, options)
    }

    async getInProgressByTeam(team:Team, options?:any) : Promise<Game[]> {

        let ids = await this.gameRepository.getInProgressIdsByTeam(team, options)
        if (ids.length == 0) return []

        let games:Game[] = await this.gameRepository.getByIds(ids, options)
        
        //Sort so it matches ids order
        games.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })

        return games

    }

    async getUnfinishedByDateIds(date:Date, options?:any): Promise<string[]> {
        return this.gameRepository.getUnfinishedByDateIds(date, options)
    }

    async getUnfinishedByDateAndLeagueIds(date:Date, league:League, options?:any): Promise<string[]> {
        return this.gameRepository.getUnfinishedByDateAndLeagueIds(date, league, options)
    }

    async getUnfinishedByLeagueIds(league:League, options?:any): Promise<string[]> {
        return this.gameRepository.getUnfinishedByLeagueIds(league, options)
    }

    async getResultsByDate(date:Date, options?:any) : Promise<{ winningTeamId:string, losingTeamId:string }[]>  {
        return this.gameRepository.getResultsByDate(date, options)
    }

    async getPreviousDatesWithUnfinishedGames(date:Date, options?:any): Promise<string[]> {
        return this.gameRepository.getPreviousDatesWithUnfinishedGames(date, options)
    }

    async getCompleteAndUnfinishedByDateIds(date:Date, options?:any): Promise<string[]> {
        return this.gameRepository.getCompleteAndUnfinishedByDateIds(date, options)
    }

    async getInProgressIdsByDate(date:Date, options?:any) : Promise<string[]> {
        return this.gameRepository.getInProgressIdsByDate(date, options)
    }

    async updateGameRatings(games:Game[], options?:any) {
        return this.gameRepository.updateGameRatings(games, options)
    }

    async getGameCountsByTeamSeason(team:Team, season:Season, date:Date, options?:any) {
        return this.gameRepository.getGameCountsByTeamSeason(team, season, date, options)
    }

    async getGames(league:League, options?:any) : Promise<GameSummaryViewModel[]> {

        let games = await this.getByLeague(league, options)

        return games.map( g => this.getGameSummaryViewModel(g))

    }

    incrementGame(game:Game, completeGame:boolean, rng) {
        
        game.isStarted = true
        game.currentSimDate = new Date(new Date().toUTCString())
        
        if (completeGame) {

            //Simulate the entire rest of the game.
            while(!game.isComplete) {
                this.simSharedService.simPitch(game, rng)
            }

        } else {

            //Just increment a single pitch
            this.simSharedService.simPitch(game, rng)
        }

        game.changed('home', true)
        game.changed('away', true)
        game.changed('halfInnings', true)
        game.changed('count', true)
        game.changed('score', true)
        game.changed('isComplete', true)
        game.changed('isStarted', true)
        game.changed('currentSimDate', true)
        
    }

    getGameViewModel(game:Game) : GameViewModel {

        let linescore = this.simSharedService.getLineScore(game)
        let baseRunners:BaseRunners = this.simSharedService.getBaserunners(game)
        let matchup:UpcomingMatchup = this.simSharedService.getUpcomingMatchup(game)
        let plays:LastPlay[] = this.simSharedService.getLastPlays(game)

        return {
            game: game,
            linescore: linescore,
            baseRunners: baseRunners,
            matchup: matchup,
            plays: plays
        }

    }

    getGameSummaryViewModel(game:Game) : GameSummaryViewModel {

        let linescore = this.simSharedService.getLineScore(game)
        let baseRunners:BaseRunners = this.simSharedService.getBaserunners(game)
        
        let matchup:UpcomingMatchup 

        if (game.isStarted) {
            matchup = this.simSharedService.getUpcomingMatchup(game)
        }

        let plays:LastPlay[] = this.simSharedService.getLastPlays(game)

        let play = plays?.length > 0 ? plays[plays.length -1] : undefined

        let awayPitcher = game.away.players?.find(p => p._id == game.away.currentPitcherId)
        let homePitcher = game.home.players?.find(p => p._id == game.home.currentPitcherId)

        let wpa 

        if (play?.play?.result) {
            wpa = this.simSharedService.getWPAFromPlay(play.play, matchup.hitter, matchup.pitcher, game.isComplete)
        }

        let result:GameSummaryViewModel = {
            _id: game._id,
            isStarted: game.isStarted,
            isFinished: game.isFinished,
            isTopInning: game.isTopInning,
            currentInning: game.currentInning,
            score: game.score,
            away: {
                _id: game.away._id,
                logoId: game.away.logoId,
                name: game.away.name,
                cityName: game.away.cityName,
                abbrev: game.away.abbrev,
                seasonRating: game.away.seasonRating,
                longTermRating: game.away.longTermRating,
                overallRecord: {
                    before: game.away.overallRecord.before,
                    after: game.away.overallRecord.after
                },
                owner: game.away.owner,
                color1: game.away.color1,
                color2: game.away.color2
            },

            home: {
                _id: game.home._id,
                logoId: game.home.logoId,
                name: game.home.name,
                cityName: game.home.cityName,
                abbrev: game.home.abbrev,
                seasonRating: game.home.seasonRating,
                longTermRating: game.home.longTermRating,
                overallRecord: {
                    before: game.home.overallRecord.before,
                    after: game.home.overallRecord.after
                },
                owner: game.home.owner,
                color1: game.home.color1,
                color2: game.home.color2
            },
            startDate: game.startDate,
            baseRunners: baseRunners,
            matchup: matchup,
            play: play,

            linescoreViewModel: {
                currentInning: game.currentInning,
                isTopInning: game.isTopInning,
                isComplete: game.isComplete,
                awayName: game.away.name,
                homeName: game.home.name,
                linescore: linescore,
                wpa: wpa
            }
        }

        if (awayPitcher) {
            result.away.pitcher = {
                _id: awayPitcher._id,
                name: awayPitcher.displayName
            } 
        }

        if (homePitcher) {
            result.home.pitcher = {
                _id: homePitcher._id,
                name: homePitcher.displayName
            } 
        }


        return result

    }
   
    buildTeamInfo(tls:TeamLeagueSeason, color1:string, color2:string, homeAway:HomeAway) : TeamInfo {

        let teamInfo:TeamInfo = {
            finances: {},
            logoId: tls.logoId,
            _id: tls.team._id,
            name: tls.team.name,
            abbrev: tls.team.abbrev,
            cityName: tls.city?.name,


            seasonRating: {
                before:tls.seasonRating.rating
            },
        
            longTermRating: {
                before:tls.longTermRating.rating
            },
        
            overallRecord: {
                before: tls.overallRecord,
            },

            currentHitterIndex: 0,

            runner1BId: undefined,
            runner2BId: undefined,
            runner3BId: undefined,

            homeAway: homeAway,

            color1: color1,
            color2: color2

        }


        return teamInfo

    }
    
    async scheduleGame(command:GameScheduleCommand, options?:any) : Promise<Game> {
        
        let game:Game = new Game()

        this.simSharedService.initGame(game)

        //Set teams on game.
        game.away = this.buildTeamInfo(command.awayTLS, command.awayTLS.team.colors.color1, command.awayTLS.team.colors.color2, HomeAway.AWAY)            
        game.home = this.buildTeamInfo(command.homeTLS, command.homeTLS.team.colors.color1, command.homeTLS.team.colors.color2, HomeAway.HOME)

        game.startDate = command.startDate
        game.gameDate = command.startDate
        game.seasonId = command.season._id
        game.leagueId = command.league._id
        game.stadiumId = command.homeTLS.stadiumId

        await this.put(game, options)


        //Create association to teams        
        let homeGameTeam = new GameTeam()
        homeGameTeam.gameId = game._id
        homeGameTeam.teamId = game.home._id

        let awayGameTeam = new GameTeam()
        awayGameTeam.gameId = game._id
        awayGameTeam.teamId = game.away._id

        await this.gameTeamRepository.put(homeGameTeam, options)
        await this.gameTeamRepository.put(awayGameTeam, options)

        return game        
    }

    createHitResult(game:Game, player:GamePlayer) : GameHitResult {

        let ghr = new GameHitResult()

        ghr.gameId = game._id
        ghr.playerId = player._id
        ghr.teamId = player.teamId
        ghr.age = player.age
        ghr.startDate = game.startDate

        Object.assign(ghr, player.hitResult)


        ghr.overallRatingBefore = player.overallRating.before

        return ghr

    }

    createPitchResult(game:Game, player:GamePlayer) : GamePitchResult {

        let gpr = new GamePitchResult()
        gpr.gameId = game._id
        gpr.playerId = player._id
        gpr.teamId = player.teamId
        gpr.age = player.age
        gpr.startDate = game.startDate

        Object.assign(gpr, player.pitchResult)
        
        gpr.overallRatingBefore = player.overallRating.before

        return gpr
    }

    async createGamePlayers(game:Game, playerIds:string[], options?:any) {

        let gamePlayers:GP[] = []

        for (let id of playerIds) {
            let gp = new GP()
            gp.gameId = game._id
            gp.playerId = id
            gamePlayers.push(gp)
        }

        await this.gamePlayerRepository.insertAll(gamePlayers, options)

    }

    // //*used in testing*/
    async simGame(game:Game): Promise<Game> {


        while (!game.isComplete) {

            let rng = await this.seedService.getRNG()
            this.simSharedService.simPitch(game, rng)
        }        


        for (let player of [].concat(game.away.players).concat(game.home.players)) {

            // //Hit
            // await this.updateHitResult(game, player)

            // //Pitch
            // await this.updatePitchResult(game, player)

        }

        // await this.finishGame(game)

        return game
    }


    getPlayByPlay(game) {
        return this.gameSharedService.getPlayByPlay(game)
    }

    getPlayMetadata(game, play:Play) {
        return this.gameSharedService.getPlayMetadata(game, play)
    }


}



interface GameScheduleCommand {
    awayTLS:TeamLeagueSeason
    homeTLS:TeamLeagueSeason
    startDate?:Date
    season:Season
    league:League
}


interface GameViewModel {
    game:Game
    linescore
    baseRunners:BaseRunners
    matchup:UpcomingMatchup
    plays:LastPlay[]
}

interface GameSummaryViewModel {
    _id:string
    isStarted:boolean
    isFinished:boolean
    away:TeamSummary
    home:TeamSummary
    startDate:Date
    baseRunners:BaseRunners
    matchup:UpcomingMatchup
    play:LastPlay
    linescoreViewModel
    score:Score
    isTopInning:boolean
    currentInning:number

}

// interface GamesViewModel {
//     inProgress:GameSummaryViewModel[]
//     scheduled: GameSummaryViewModel[]
//     finished: GameSummaryViewModel[]
// }

interface TeamSummary {
    _id:string
    logoId:string
    name:string
    abbrev:string
    cityName:string
    pitcher?: {
        _id:string
        name:string
    }
    seasonRating:{
        before?:number
        after?:number
    }
    longTermRating: {
        before?:number
        after?:number
    }
    overallRecord:{
        before:OverallRecord
        after:OverallRecord
    }
    color1:string
    color2:string
    owner?:{ _id:string }
}





interface SimGameCommand {

}

export {
    GameService, SimGameCommand, LastPlay, GameViewModel, GameSummaryViewModel
}

