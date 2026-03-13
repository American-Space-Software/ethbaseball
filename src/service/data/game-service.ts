import { inject, injectable } from "inversify"
import { Game, GameTeam, GamePlayer as GP } from "../../dto/game.js"
import {  Player } from "../../dto/player.js"
import { Position,  GamePlayer, BaseRunners, GamePlayerBio, HalfInning, LastPlay, Score, TeamInfo, UpcomingMatchup, WPAReward, Play, PlayResult, RunnerEvent, OfficialRunnerResult, DefensiveCredit,  HomeAway, Handedness, MatchupHandedness, HitterChange, PitcherChange, RunnerResult, PitchLog, SimPitchCommand, InningEndingEvent, SimPitchResult, PitchResult, Contact, ShallowDeep, Pitch, LeagueAverageRatings, LeagueAverage, } from "../enums.js"

import { RollService,  } from "../roll-service.js"
import { GameRepository } from "../../repository/game-repository.js"
import { SeedService } from "./seed-service.js"

import { PlayerService } from "./player-service.js"
import { v4 as uuidv4 } from 'uuid';
import { Lineup, OverallRecord, RotationPitcher, Team } from "../../dto/team.js"
import dayjs from "dayjs"
import { League } from "../../dto/league.js"
import { Season } from "../../dto/season.js"
import { TeamLeagueSeason } from "../../dto/team-league-season.js"
import { PlayerLeagueSeason } from "../../dto/player-league-season.js"
import { GameTeamRepository } from "../../repository/game-team-repository.js"
import { StatService } from "../stat-service.js"
import { GamePitchResult } from "../../dto/game-pitch-result.js"
import { GameHitResult } from "../../dto/game-hit-result.js"
import { GamePlayerRepository } from "../../repository/game-player-repository.js"
import { RollChart } from "../../dto/roll-chart.js"
import { GameSharedService } from "../shared/game-shared-service.js"



@injectable()
class GameService {

    @inject("GameRepository")
    private gameRepository:GameRepository

    @inject("GameTeamRepository")
    private gameTeamRepository:GameTeamRepository

    @inject("GamePlayerRepository")
    private gamePlayerRepository: GamePlayerRepository


    constructor(
        private rollService: RollService,
        private seedService:SeedService,
        private playerService:PlayerService,
        private statService:StatService,
        private gameSharedService:GameSharedService,
        @inject('config') private _config:Function,

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

    async getByDateAndLeague(date:Date, league:League, options?:any) {

        let ids = await this.gameRepository.getByDateAndLeagueIds(date, league, options)
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

    async getGames(date:Date, league:League, options?:any) : Promise<GamesViewModel> {

        let games = await this.getByDateAndLeague(date, league, options)

        return {
            inProgress: games.filter( g => g.isComplete == false && g.isStarted == true).map( g => this.getGameSummaryViewModel(g)),
            scheduled: games.filter( g => g.isComplete == false && g.isStarted == false).map( g => this.getGameSummaryViewModel(g)),
            finished: games.filter( g => g.isComplete == true && g.isStarted == true).map( g => this.getGameSummaryViewModel(g))
        }
    }

    validateGameLineup(lineup:Lineup, plss:PlayerLeagueSeason[], startingPitcher:RotationPitcher, gameDate:Date) {

        //Make sure there are 9 spots in the order and 5 spots in the rotation
        if (lineup.order.length != 9) {
            throw new Error("Lineup must have 9 players.")
        }

        if (lineup.rotation.length != 5) {
            throw new Error("Rotation must have 5 players.")
        }

        //Make sure no one is playing a duplicate position
        let filledSpots = lineup.order.filter(o => o.position != undefined)
        let filledPositions = new Set(filledSpots.map( o => o.position))

        if (filledPositions.size != filledSpots.length) {
            throw new Error("Duplicate position players.")
        }

        let sp = plss.find( p => p.playerId == startingPitcher._id)

        if (!startingPitcher || !sp) {
            throw new Error(`No valid starting pitcher for ${dayjs(gameDate).format('YYYY-MM-DD')}`)
        }

    }

    buildTeamInfoFromTeam(leagueAverage:LeagueAverage, tls:TeamLeagueSeason, plss:PlayerLeagueSeason[], startingPitcher:RotationPitcher, color1:string, color2:string, homeAway:HomeAway, startingId:number) : TeamInfo {

        let plssPlain = plss.map( p => p.get({ plain: true } ))
        let players = plssPlain.map( pls => pls.player)

        let gamePlayer:GamePlayer[] = this.initGamePlayers(leagueAverage, players, startingPitcher, tls.teamId, color1, color2, startingId)

        let lineup:Lineup = JSON.parse(JSON.stringify(tls.lineups[0]))

        if (!startingPitcher) throw new Error("No valid starting pitcher.")

        lineup.order.find( p => p.position == Position.PITCHER)._id = startingPitcher._id

        let pitcherGP = gamePlayer.find( gp => gp._id == startingPitcher._id)

        let tlsPlain = tls.get({ plain: true })

        let teamInfo:TeamInfo = {
            logoId: tlsPlain.logoId,
            _id: tlsPlain.team._id,
            owner: {
                _id: tlsPlain.team.userId,
            },            
            finances: {},
            name: tlsPlain.team.name,
            abbrev: tlsPlain.team.abbrev,
            cityName: tlsPlain.city?.name,
            players: gamePlayer,

            seasonRating: {
                before:tlsPlain.seasonRating.rating
            },
        
            longTermRating: {
                before:tlsPlain.longTermRating.rating
            },
        
            overallRecord: {
                before:tlsPlain.overallRecord
            },

            lineupIds: lineup.order.map( op => op._id ),

            currentHitterIndex: 0,
            currentPitcherId: pitcherGP._id,

            runner1BId: undefined,
            runner2BId: undefined,
            runner3BId: undefined,

            homeAway: homeAway,

            color1: color1,
            color2: color2

        }

        //Sync players to the proper positions. Right now this is simple because 
        //a player can only play one position but it's possible we'll need to pass
        //this info in later.
        teamInfo.lineupIds.forEach( (id, idx) => {

            let player:GamePlayer = teamInfo.players.find( p => p._id == id)
            //Set spot in lineup
            if (player) player.lineupIndex = idx 

        })

        return teamInfo

    }
    
    startGame(command:StartGameCommand) {

        let game = command.game

        //Validate lineups
        this.validateGameLineup(command.awayTLS.lineups[0], command.awayPlayers, command.awayStartingPitcher, command.date)
        this.validateGameLineup(command.homeTLS.lineups[0], command.homePlayers, command.homeStartingPitcher, command.date)

        let awayInfo = this.buildTeamInfoFromTeam(command.leagueAverages, command.awayTLS,  command.awayPlayers, command.awayStartingPitcher, command.away.colors.color1, command.away.colors.color2, HomeAway.AWAY, 1)
        let homeInfo = this.buildTeamInfoFromTeam(command.leagueAverages, command.homeTLS,  command.homePlayers, command.homeStartingPitcher, command.home.colors.color1, command.home.colors.color2, HomeAway.HOME, 1 + command.awayPlayers.length)

        game.leagueAverages = command.leagueAverages

        //Set teams on game.
        game.away = awayInfo            
        game.home = homeInfo

        game.startDate = command.date
        game.count = {
            balls: 0,
            strikes: 0,
            outs: 0
        }

        game.isStarted = true
        
        game.changed('leagueAverages', true)
        game.changed('away', true)
        game.changed('home', true)
        game.changed('startDate', true)
        game.changed('isStarted', true)

        return game 
    }

    incrementGame(game:Game, completeGame:boolean, rng) {
        
        game.isStarted = true
        game.currentSimDate = new Date(new Date().toUTCString())
        
        if (completeGame) {

            //Simulate the entire rest of the game.
            while(!game.isComplete) {
                this.simPitch(game, rng)
            }

        } else {

            //Just increment a single pitch
            this.simPitch(game, rng)
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

    finishGame(game:Game, players:Player[], plss:PlayerLeagueSeason[]) : void {

        let homeWin = game.score.home > game.score.away

        let winningTeam:TeamInfo = homeWin ? game.home : game.away
        let losingTeam:TeamInfo = homeWin ? game.away : game.home

        game.winningTeamId = winningTeam._id
        game.losingTeamId = losingTeam._id

        //WPA rewards
        let rewards:WPAReward[] = this.generateWPA(game)

        //Mark player team win/loss
        for(let winGp of winningTeam.players) {

            if (winGp.currentPosition == Position.PITCHER && winGp.isPitcherOfRecord) {
                game.winningPitcherId = winGp._id
                winGp.pitchResult.wins = 1
            } 

            winGp.pitchResult.teamWins = 1
            winGp.hitResult.teamWins = 1

        }

        for (let loseGp of losingTeam.players) {

            if (loseGp.currentPosition == Position.PITCHER && loseGp.isPitcherOfRecord) {
                game.losingPitcherId = loseGp._id
                loseGp.pitchResult.losses = 1
            }

            loseGp.pitchResult.teamLosses = 1
            loseGp.hitResult.teamLosses = 1

        }

        //Get all players
        let gamePlayers:GamePlayer[] = [].concat(winningTeam.players).concat(losingTeam.players)

        //Update players
        for (let gamePlayer of gamePlayers) {

            let hittingRewards = rewards.find(r => r.hitting == true && r.playerId == gamePlayer._id)
            let pitchingRewards = rewards.find(r => r.hitting == false && r.playerId == gamePlayer._id)

            let player = players.find(p => p._id == gamePlayer._id)
            let pls = plss.find( p => p.playerId == player._id)

            this.finalizePlayer(player, pls, gamePlayer, hittingRewards, pitchingRewards)
            
        }


        //Mark game as finished
        game.isFinished = true

        game.changed('home', true)
        game.changed('away', true)
        game.changed('winningPitcherId', true)
        game.changed('losingPitcherId', true)
        game.changed('winningTeamId', true)
        game.changed('losingTeamId', true)

    }

    private finalizePlayer(player:Player, pls:PlayerLeagueSeason, gamePlayer:GamePlayer, hittingRewards:WPAReward, pitchingRewards:WPAReward) {

        if (!player) {
            throw new Error("Can not finalize invalid (null) player.")
        }

        gamePlayer.hitResult.wpa = hittingRewards?.reward || 0
        gamePlayer.pitchResult.wpa = pitchingRewards?.reward || 0

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


        pls.primaryPosition = player.primaryPosition

        pls.changed("overallRating", true)

    }

    generateWPA(game:Game) : WPAReward[] {
        
        let rewards:WPAReward[] = []

        let plays:Play[] = this.getPlays(game)

        for (let play of plays) {

            let hitter:GamePlayerBio = this.buildGamePlayerBio(this.getGamePlayer(game, play.hitterId))
            let pitcher:GamePlayerBio = this.buildGamePlayerBio(this.getGamePlayer(game, play.pitcherId))

            let playRewards = this.gameSharedService.getWPAFromPlay(play, hitter, pitcher, play == plays[plays.length -1] /* is last play*/)

            for (let reward of playRewards.rewards) {  
                              
                let existingReward = rewards.find( r => r.hitting == reward.hitting && r.playerId == reward.playerId)

                if (existingReward) {
                    existingReward.reward += reward.reward
                } else {
                    rewards.push({
                        hitting: reward.hitting,
                        playerId: reward.playerId,
                        reward: reward.reward
                    })
                }

            }

        }

        return rewards

    }





    simPitch(game:Game, rng:any) {

        let command:SimPitchCommand = this.createSimPitchCommand(game, rng)


        if (!command.play) {

            let runner1B = command.offense.players.find( p => p._id == command.offense.runner1BId)
            let runner2B = command.offense.players.find( p => p._id == command.offense.runner2BId)
            let runner3B = command.offense.players.find( p => p._id == command.offense.runner3BId)

            command.play = this.createPlay(
                game.playIndex, 
                command.hitter, 
                command.pitcher, 
                command.catcher, 
                runner1B, 
                runner2B, 
                runner3B, 
                command.matchupHandedness, 
                game.count.outs, 
                game.score, 
                game.currentInning, 
                game.isTopInning
          )

          //Add play to half inning
          command.halfInning.plays.push(command.play)

          //Just add the play.
          return

        }


        let result:SimPitchResult

        let continueAtBat = true
        let isInningEndingEvent = false

        //Do matchup
        try {
            result = this.rollService.simPitch(command, command.play.pitchLog.pitches?.length || 0)
            continueAtBat = result.continueAtBat
        } catch(ex) {
            //Ignore inning ending events errors.
            if (!(ex instanceof InningEndingEvent)) throw ex
            continueAtBat = false
            isInningEndingEvent = true
        }


        if (!continueAtBat) {
            this.finishPlay(game, command, isInningEndingEvent)
        }
        

    }

    finishPlay(game:Game, command:SimPitchCommand, isInningEndingEvent:boolean) {

        let fielderPlayer:GamePlayer

        let ballInPlay:Pitch = command.play.pitchLog.pitches.find(p => p.result == PitchResult.IN_PLAY)

        let isFieldingError = false

        if (!isInningEndingEvent) {
            
            if (ballInPlay) {

                //In play
                let pitch = ballInPlay

                //How much better than average?
                let pitchQualityChange = this.rollService.getChange(command.leagueAverages.pitchQuality, pitch.quality)

                let contactRollChart:RollChart = this.rollService.getMatchupContactRollChart(command.leagueAverages, command.hitter.hittingRatings.contactProfile, command.pitcher.pitchRatings.contactProfile)

                const pickFielder = (contact:Contact) => {

                    let ignoreList = []
                    
                    switch(contact) {
                        case Contact.LINE_DRIVE:
                            //No line drives to the catcher. 
                            ignoreList.push(Position.CATCHER)
                            break
                        
                    }

                    //Who did it get hit towards?
                    fielderPlayer = undefined

                    command.play.fielder = this.rollService.getFielder(command.rng, command.leagueAverages, command.play.matchupHandedness.hits)

                    //If we match on the ignore list get fielders until we don't.
                    while (ignoreList.includes(command.play.fielder)) {
                        command.play.fielder = this.rollService.getFielder(command.rng, command.leagueAverages, command.play.matchupHandedness.hits)
                    }

                    fielderPlayer = command.defense.players.find(p => p.currentPosition == command.play.fielder)


                }

                let hitQuality:number

                //What kind of contact? 
                command.play.contact = contactRollChart.entries.get(this.rollService.getRoll(command.rng, 0, 99)) as Contact

                pickFielder(command.play.contact)

                //Calculate team defense. We're going to use this overall average to simulate being slightly better or worse at positioning.
                let teamDefenseChange:number = this.rollService.getChange(command.leagueAverages.hittingRatings.defense, this.rollService.getTeamDefense(command.defense))
                let fielderDefenseChange:number = this.rollService.getChange(command.leagueAverages.hittingRatings.defense, fielderPlayer.hittingRatings.defense)

                //Was it high quality contact? 1-1000
                hitQuality = this.rollService.getHitQuality(command.rng, pitchQualityChange, teamDefenseChange, fielderDefenseChange, command.play.contact, pitch.guess)

                let powerRollChart:RollChart = this.rollService.getMatchupPowerRollChart(command.leagueAverages, command.hitterChange, command.pitcherChange)

                //O, 1B, 2B, 3B, or HR
                command.play.result = powerRollChart.entries.get(hitQuality) as PlayResult

                //No pop up/line drive hits to IF. 
                while (this.rollService.isInAir(command.play.contact) && !this.rollService.isToOF(command.play.fielder) && command.play.result != PlayResult.OUT) {
                    pickFielder(command.play.contact)
                }

                //No ground ball outs to the OF. Redirect to infielder.
                while (command.play.contact == Contact.GROUNDBALL && this.rollService.isToOF(command.play.fielder) && command.play.result == PlayResult.OUT) {
                    pickFielder(command.play.contact)
                }

                //No doubles or triples to infielders
                while ( (command.play.result == PlayResult.DOUBLE || command.play.result == PlayResult.TRIPLE) && this.rollService.isToInfielder(command.play.fielder)) {
                    pickFielder(command.play.contact)
                }


                if (!fielderPlayer) {
                   throw new Error(`No fielder found at position ${command.play.fielder}`)
                }

                if (this.rollService.isToOF(command.play.fielder)) {
                    command.play.shallowDeep = this.rollService.getShallowDeep(command.rng, command.leagueAverages)
                } 

                if (command.play.result == PlayResult.HR) {
                    if (command.play.contact == Contact.GROUNDBALL) {
                        command.play.contact = hitQuality > 70 ? Contact.LINE_DRIVE : Contact.FLY_BALL
                    }

                    command.play.shallowDeep = ShallowDeep.DEEP
                } 

                if (command.play.result == PlayResult.TRIPLE) {
                    command.play.shallowDeep = ShallowDeep.DEEP //Triples always deep for now.
                } 

            } else {

                //If the ball isn't in play let's make sure it's a legit reason.
                if (command.play.result != PlayResult.STRIKEOUT && command.play.result != PlayResult.BB &&  command.play.result != PlayResult.HIT_BY_PITCH && !isInningEndingEvent) {
                    throw new Error("Error with pitchlog")
                }

            }

            //Players could have moved. Grab the correct base runners.
            let runner1B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.first)
            let runner2B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.second)
            let runner3B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.third)

            if (command.play.runner.result.end.first && !runner1B) {
                throw new Error("Missing 1B runner.")
            }

            if (command.play.runner.result.end.second && !runner2B) {
                throw new Error("Missing 2B runner.")
            }

            if (command.play.runner.result.end.third && !runner3B) {
                throw new Error("Missing 3B runner.")
            }

            //Add in-play runner events
            let inPlayRunnerEvents: RunnerEvent[] = this.rollService.getRunnerEvents(command.rng, command.play.runner.result.end, command.halfInningRunnerEvents, command.play.credits, 
                                command.leagueAverages, command.play.result, command.play.contact, command.play.shallowDeep, command.hitter, fielderPlayer, runner1B, runner2B, runner3B, 
                                command.offense, command.defense, command.pitcher, command.play.pitchLog.count.pitches - 1)


            isFieldingError = inPlayRunnerEvents.filter( re => re.isError)?.length > 0

            command.play.runner.events.push(...inPlayRunnerEvents)

        }

        
        this.rollService.validateRunnerResult(command.play.runner.result.end)

        //If playResult was OUT and there was an error change playResult to ERROR.
        if (command.play.result == PlayResult.OUT && isFieldingError) {
            command.play.result = PlayResult.ERROR
        }

        command.play.officialPlayResult = this.rollService.getOfficialPlayResult(command.play.result, command.play.contact, command.play.shallowDeep, command.play.fielder,command.play.runner.events)

        command.play.fielderId = fielderPlayer?._id




        //Players could have moved. Grab the correct base runners.
        let runner1B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.first)
        let runner2B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.second)
        let runner3B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.third)


        this.rollService.logResults(command.offense, command.defense, command.hitter, command.pitcher, runner1B?._id, runner2B?._id, runner3B?._id, command.play.credits, command.play.runner.events, command.play.contact, command.play.officialPlayResult, command.play.result, command.play.pitchLog, isInningEndingEvent)

        //Reset count
        game.count.balls = 0
        game.count.strikes = 0

        //Increase outs
        game.count.outs += command.play.runner?.events.filter( re => re.movement.isOut).length

        game.playIndex++

        //Set runners
        command.offense.runner1BId = command.play.runner?.result.end.first
        command.offense.runner2BId = command.play.runner?.result.end.second
        command.offense.runner3BId = command.play.runner?.result.end.third

        //Add result to line score and gamescore
        this.updateLinescoreRuns(game, command.halfInning, command.play)
        this.updateLinescoreHits(game, command.halfInning, command.play)
        this.updateGameRuns(game, command.play)

        //Make sure the play has the end count. Clone so we don't accidentally change them.
        command.play.count.end = JSON.parse(JSON.stringify(game.count))
        command.play.score.end = JSON.parse(JSON.stringify(game.score))

        //Move lineup to next hitter except on failed stolen bases that end an inning.
        //@ts-ignore
        if (command.play.officialPlayResult != OfficialRunnerResult.CAUGHT_STEALING_2B && command.play.officialPlayResult != OfficialRunnerResult.CAUGHT_STEALING_3B) {
            this.nextHitter(command.offense)
        }

        const isWalkoff = (game.currentInning >=STANDARD_INNINGS && !game.isTopInning && game.score.home > game.score.away)

        if (game.count.outs >= 3 || isWalkoff ) {

            //Update linescore LOB
            let leftOnBase = [command.offense.runner1BId, command.offense.runner2BId, command.offense.runner3BId ].filter( r => r != undefined).length

            if (leftOnBase > 0) {
                this.updateLinescoreLOB(command.halfInning, leftOnBase)
            }

            //Clear runners
            this.clearRunners(command.offense)

            //Clear outs
            game.count.outs = 0

            //Check if game over
            game.isComplete = this.isGameOver(game)

            if (!game.isComplete) {

                const from = { inning: game.currentInning, isTop: game.isTopInning }

                if (game.isTopInning) {
                    game.isTopInning = false
                } else {
                    game.currentInning++
                    game.isTopInning = true
                }

                const to = { inning: game.currentInning, isTop: game.isTopInning }

                //Init next half inning
                game.halfInnings.push(this.initHalfInning(game.currentInning, game.isTopInning))
            } 
        }

    }


    createSimPitchCommand(game:Game, rng:any) {
        
        let halfInning:HalfInning = game.halfInnings.find(i => i.num == game.currentInning && i.top == game.isTopInning)

        if (!halfInning) {
            halfInning = this.initHalfInning(game.currentInning, game.isTopInning) 
            game.halfInnings.push(halfInning)
        }

        let offense:TeamInfo = this.getOffense(game)
        let defense:TeamInfo = this.getDefense(game)

        let matchup:UpcomingMatchup = this.getUpcomingMatchup(game)

        let halfInningRunnerEvents:RunnerEvent[] = halfInning.plays.map(p => p.runner?.events).reduce((accumulator, reArray) => accumulator.concat(reArray), []) 

        let hitter:GamePlayer = offense.players.find( p => p._id == matchup.hitter._id)
        let pitcher = defense.players.find( p => p._id == matchup.pitcher._id)
        let catcher:GamePlayer = defense.players.find( p => p.currentPosition == Position.CATCHER)

        if (!hitter) throw new Error("createSimPitchCommand: matchup.hitter not found on offense roster")
        if (!pitcher) throw new Error("createSimPitchCommand: matchup.pitcher not found on defense roster")
        if (!catcher) throw new Error("createSimPitchCommand: catcher not found on defense roster")

        let matchupHandedness: MatchupHandedness = this.getMatchupHandedness(hitter, pitcher)

        let hitterChange:HitterChange = matchupHandedness.throws == Handedness.L ? hitter.hitterChange.vsL : hitter.hitterChange.vsR
        let pitcherChange:PitcherChange = matchupHandedness.hits == Handedness.L ? pitcher.pitcherChange.vsL : pitcher.pitcherChange.vsR
        
        let allPlays:Play[] = this.getPlays(game)

        //Either grab the play in progress or create a new one.
        let play: Play

        if (allPlays?.length > 0) {
            const lastPlay = allPlays[allPlays.length - 1]

            if (!lastPlay.count?.end) {
                play = lastPlay
            }
        }

        
    
        return {

            game: game,
            play:play,

            offense:offense,
            defense:defense,

            hitter:hitter,
            pitcher:pitcher,

            hitterChange:hitterChange,
            pitcherChange:pitcherChange,

            catcher:catcher,

            halfInningRunnerEvents:halfInningRunnerEvents,
            halfInning: halfInning,
            leagueAverages: game.leagueAverages,

            matchupHandedness:matchupHandedness,

            rng:rng

        }
    }

    getMatchupHandedness(hitter:GamePlayer, pitcher:GamePlayer): MatchupHandedness {

        let pitchHand = pitcher.throws
        let batSide

        if (hitter.hits == Handedness.S) {
            batSide = pitcher.throws == Handedness.L ? Handedness.R : Handedness.L
        } else {
            batSide = hitter.hits
        }

        return {
            throws: pitchHand,
            hits: batSide,
            vsSameHand: hitter.hits == pitcher.throws
        }


    }

    buildTeamInfoFromPlayers(leagueAverage:LeagueAverage, name:string, teamId:string, players:Player[], color1:string, color2:string, startingId:number) : TeamInfo {

        let startingPitcher = players.find( p => p.primaryPosition == "P")

        let gamePlayer:GamePlayer[] = this.initGamePlayers(leagueAverage, players, { _id: startingPitcher._id, stamina: 1}, teamId, color1, color2, startingId)

        let teamInfo:TeamInfo = {
            finances: {},
            logoId: undefined,
            name: name,
            abbrev: name,
            players: gamePlayer,

            seasonRating: {
                before:1500
            },
        
            longTermRating: {
                before:1500
            },
        
            overallRecord: {
                before:{ 
                    wins: 0, 
                    losses: 0,
                    gamesBehind: 0,
                    resultLast10: [],
                    rank: 0,
                    runsAgainst: 0,
                    runsScored: 0,
                    winPercent: 0
                }
            },

            lineupIds: players.map( p =>  p._id ),

            currentHitterIndex: 0,
            currentPitcherId: undefined,

            runner1BId: undefined,
            runner2BId: undefined,
            runner3BId: undefined,

            homeAway: undefined,

            color1: color1,
            color2: color2

        }

        //Sync players to the proper positions. Right now this is simple because 
        //a player can only play one position but it's possible we'll need to pass
        //this info in later.
        teamInfo.lineupIds.forEach( (id, idx) => {

            let player:GamePlayer = teamInfo.players.find( p => p._id == id)
            //Set spot in lineup
            if (player) player.lineupIndex = idx 

        })

        teamInfo.currentPitcherId = teamInfo.players.find( p => p.currentPosition == Position.PITCHER)._id

        return teamInfo

    }

    initGamePlayers(leagueAverage:LeagueAverage, players:Player[], startingPitcher:RotationPitcher, teamId:string, color1:string, color2:string, startingId:number) : GamePlayer[] {

        let gamePlayers:GamePlayer[] = []
        
        for (let p of players) {
        
            let isStartingPitcher = p._id == startingPitcher?._id

            let hittingRatings = p.hittingRatings
            let pitchRatings = p.pitchRatings

            if (isStartingPitcher && startingPitcher.stamina != 1) {

                let modifier = Math.max(.25, startingPitcher.stamina) // minimium of .25 effective

                this.playerService.modifyRatings(hittingRatings, modifier)
                this.playerService.modifyRatings(pitchRatings, modifier)
            }

            gamePlayers.push({ 
                _id: p._id,
                coverImageCid: p.coverImageCid,
                fullName: `${p.firstName} ${p.lastName}`,
                firstName: p.firstName,
                lastName: p.lastName,
                displayName: `${p.firstName[0]}. ${p.lastName}`,

                teamId: teamId,

                age: p.age,
                
                overallRating:{
                    before: p.overallRating,
                },

                ownerId: p.ownerId,
                color1: color1,
                color2: color2,

                throws: p.throws,
                hits: p.hits,
            
                pitchRatings: pitchRatings,
                hittingRatings: hittingRatings,

                currentPosition: p.primaryPosition,
    
                hitResult: {
                    games: 0,
                    teamWins: 0,
                    teamLosses: 0,
                    pa: 0,
                    atBats: 0,
                    hits: 0,
                    singles: 0,
                    doubles: 0,
                    triples: 0,
                    homeRuns: 0,
                    runs: 0,
                    rbi: 0,
                    bb: 0,
                    sb: 0,
                    cs: 0,
                    hbp: 0,
                    so: 0,
                    lob: 0,
                    sacBunts: 0,
                    sacFlys: 0,
                    groundOuts: 0,
                    flyOuts: 0,
                    lineOuts: 0,
                    outs: 0,
                    groundBalls: 0,
                    lineDrives: 0,
                    flyBalls: 0,
                    gidp: 0,
                    po: 0,
                    assists: 0,
                    e: 0,
                    pitches: 0,
                    balls: 0,
                    strikes: 0,
                    fouls: 0,
                    swings: 0,
                    swingAtBalls: 0,
                    swingAtStrikes: 0,
                    inZone: 0,
                    ballsInPlay: 0,
                    totalPitchQuality: 0,
                    totalPitchPowerQuality: 0,
                    totalPitchLocationQuality: 0,
                    totalPitchMovementQuality: 0,
                    inZoneContact: 0,
                    outZoneContact: 0,
                    passedBalls: 0,
                    csDefense: 0,
                    doublePlays: 0,
                    sbAttempts: 0,
                    outfieldAssists: 0,
                    wpa:0
                },
    
                pitchResult: {
                    games: 0,
                    teamWins: 0,
                    teamLosses: 0,
                    outs: 0,
                    er: 0,
                    so: 0,
                    hits: 0,
                    bb: 0,
                    hbp: 0,
                    singles: 0,
                    doubles: 0,
                    triples: 0,
                    runs: 0,
                    homeRuns: 0,
                    wins: 0,
                    losses: 0,
                    saves: 0,
                    bs: 0,
                    sho: 0,
                    cg: 0,
                    battersFaced: 0,
                    atBats: 0,
                    groundOuts: 0,
                    flyOuts: 0,
                    lineOuts: 0,
                    groundBalls: 0,
                    lineDrives: 0,
                    flyBalls: 0,
                    pitches: 0,
                    balls: 0,
                    strikes: 0,
                    fouls: 0,
                    swings: 0,
                    swingAtBalls: 0,
                    swingAtStrikes: 0,
                    inZone: 0,
                    starts: p._id == startingPitcher?._id ? 1 : 0,
                    ip: '0.0',
                    sacFlys: 0,
                    ballsInPlay: 0,
                    totalPitchQuality: 0,
                    totalPitchPowerQuality: 0,
                    totalPitchLocationQuality: 0,
                    totalPitchMovementQuality: 0,
                    inZoneContact: 0,
                    outZoneContact: 0,
                    wildPitches: 0,
                    wpa:0
                },

                hitterChange: {
                    vsL: this.rollService.getHitterChange(p.hittingRatings, leagueAverage.hittingRatings, Handedness.L),
                    vsR: this.rollService.getHitterChange(p.hittingRatings, leagueAverage.hittingRatings, Handedness.R),
                },

                pitcherChange: {
                    vsL: this.rollService.getPitcherChange(p.pitchRatings, leagueAverage.pitchRatings, Handedness.L),
                    vsR: this.rollService.getPitcherChange(p.pitchRatings, leagueAverage.pitchRatings, Handedness.R),
                },
    
                lineupIndex: undefined,

                isPitcherOfRecord: isStartingPitcher
                
                
            })
        }

        return gamePlayers
    }

    buildGamePlayerBio(player:GamePlayer) : GamePlayerBio {

        return { 
                
            _id: player._id,
            fullName: player.fullName,
            // ratingBefore: player.ratingBefore,

            age: player.age,
            ownerId: player.ownerId,

            throws: player.throws,
            hits: player.hits,

            //@ts-ignore
            hitResult: this.statService.hitResultToHitterStatLine(player.hitResult),

            //@ts-ignore
            pitchResult: this.statService.pitchResultToPitcherStatLine(player.pitchResult)
        }

    }

    initGame(game:Game) {

        game._id = uuidv4()

        game.currentInning = 1
        game.isTopInning = true
        game.isStarted = false
        game.isComplete = false
        game.isFinished = false
        game.count = {
            balls: 0,
            strikes: 0,
            outs: 0
        }

        game.score = {
            away: 0,
            home: 0
        }

        game.halfInnings = []

        game.playIndex = 0
        // game.level = command.level

        return game
    }

    isGameOver(game: Game): boolean {

        //in the bottom of an inning 9+ where we're not tied. Game over.
        if (game.currentInning >= STANDARD_INNINGS && game.isTopInning == false && game.score.home != game.score.away) return true 

        //after the top of the 9+ inning where the home team is ahead. Game over.
        if (game.currentInning >= STANDARD_INNINGS && game.isTopInning == true && game.score.home > game.score.away) return true 

        return false

    }

    clearRunners(team:TeamInfo) {
        team.runner1BId = undefined
        team.runner2BId = undefined
        team.runner3BId = undefined
    }

    nextHitter(team: TeamInfo) {

        if (team.currentHitterIndex >= 8) {
            team.currentHitterIndex = 0
        } else {
            team.currentHitterIndex++
        }

    }

    getOffense(game:Game) {

        if (game.isTopInning) {
            return game.away
        } else {
            return game.home
        }
    }

    getDefense(game:Game) {

        if (game.isTopInning) {
            return game.home
        } else {
            return game.away
        }
    }

    initHalfInning(num:number, top: boolean) : HalfInning {

        let halfInning:HalfInning = {
            linescore: {
                runs: 0,
                hits: 0,
                errors: 0,
                leftOnBase: 0
            },
            num: num,
            top: top,
            plays: []
        }

        return halfInning

    }

    updateLinescoreHits(game:Game, halfInning:HalfInning, play:Play) {

        if (this.rollService.isHit(play.result)) {
            if (game.isTopInning) {
                halfInning.linescore.hits++
            } else {
                halfInning.linescore.hits++
            }
        }

    }

    updateLinescoreRuns(game:Game, halfInning:HalfInning, play:Play) {

        if (play.runner?.result?.end?.scored?.length > 0) {

            if (game.isTopInning) {
                halfInning.linescore.runs += play.runner?.result?.end?.scored?.length
            } else {
                halfInning.linescore.runs += play.runner?.result?.end?.scored?.length
            }

        }

    }

    updateLinescoreLOB(halfInning:HalfInning, lob:number) {
        halfInning.linescore.leftOnBase += lob
    }

    updateGameRuns(game:Game, play:Play) {

        if (play.runner?.result?.end?.scored?.length > 0) {

            if (game.isTopInning) {
                game.score.away += play.runner?.result?.end?.scored?.length
            } else {
                game.score.home += play.runner?.result?.end?.scored?.length
            }

        }

    }

    // return true if in range, otherwise false
    inRange(x: number, min: number, max: number) {
        return ((x - min) * (x - max) <= 0)
    }

    getBaserunners(game:Game) : BaseRunners {

        if (game.isTopInning) {

            return {
                first: game.away.runner1BId ? this.buildGamePlayerBio( game.away.players.find(p => p._id == game.away.runner1BId) ) : undefined,
                second: game.away.runner2BId ? this.buildGamePlayerBio( game.away.players.find(p => p._id == game.away.runner2BId) ) : undefined,
                third: game.away.runner3BId ? this.buildGamePlayerBio( game.away.players.find(p => p._id == game.away.runner3BId) ) : undefined,
            }


        } else {

            return {
                first: game.home.runner1BId ? this.buildGamePlayerBio( game.home.players.find(p => p._id == game.home.runner1BId) ): undefined,
                second: game.home.runner2BId ? this.buildGamePlayerBio( game.home.players.find(p => p._id == game.home.runner2BId) ) : undefined,
                third: game.home.runner3BId ? this.buildGamePlayerBio( game.home.players.find(p => p._id == game.home.runner3BId) ) : undefined,
            }

        }

    }

    getUpcomingMatchup(game:Game) : UpcomingMatchup {

        if (game.isTopInning) {

            return {
                hitter: this.buildGamePlayerBio( game.away.players.find(p => p._id == game.away.lineupIds[game.away.currentHitterIndex]) ),
                pitcher: this.buildGamePlayerBio( game.home.players.find(p => p._id == game.home.currentPitcherId) )
            }

        } else {

            return {
                hitter: this.buildGamePlayerBio(  game.home.players.find(p => p._id == game.home.lineupIds[game.home.currentHitterIndex]) ),
                pitcher: this.buildGamePlayerBio( game.away.players.find(p => p._id == game.away.currentPitcherId) )
            }


        }

    }

    getPlays(game:Game) : Play[] {
        return game.halfInnings.map((inning) => inning.plays).reduce((accumulator, playsArray) => accumulator.concat(playsArray), []) // Flatten into a single array
    }

    getLastPlays(game:Game) : LastPlay[] {

        let plays:Play[] = this.getPlays(game) // Flatten into a single array
    
        plays = plays.slice(Math.max(plays.length - 5, 0))

        let lastPlays:LastPlay[] = []

        for (let play of plays) {
            
            let hi:HalfInning = game.halfInnings.find(i => i.plays.includes(play))
            
            lastPlays.push({
                hitter: this.buildGamePlayerBio( this.getGamePlayer(game, play.hitterId) ),
                pitcher:this.buildGamePlayerBio( this.getGamePlayer(game, play.pitcherId) ),
                play: play,
                inning: hi.num,
                top: hi.top,
                first: play.runner?.result?.end.first ? this.buildGamePlayerBio(this.getGamePlayer(game, play.runner?.result?.end?.first)) : undefined,
                second: play.runner?.result?.end.second ? this.buildGamePlayerBio(this.getGamePlayer(game, play.runner?.result?.end?.second)) : undefined,
                third: play.runner?.result?.end.third ? this.buildGamePlayerBio(this.getGamePlayer(game, play.runner?.result?.end?.third)) : undefined,
            }) 
        }

        return lastPlays

    }

    getGamePlayer(game:Game, playerId:string) {

        let player = game.away.players.find(p => p._id == playerId)

        if (!player) {
            player = game.home.players.find( p => p._id == playerId)
        }

        return player

    }   

    // //*used in testing*/
    async simGame(game:Game): Promise<Game> {


        while (!game.isComplete) {

            let rng = await this.seedService.getRNG()
            this.simPitch(game, rng)
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

    getLineScore(game:Game) {

        let away = [game.away.name, '', '', '', '', '', '', '', '', '', 0, 0, 0]
        let home = [game.home.name, '', '', '', '', '', '', '', '', '', 0, 0, 0]

        //Set inning scores
        for (let halfInning of game.halfInnings) {

            if (halfInning.top) {

                if (halfInning.num > STANDARD_INNINGS) {
                    away.splice(halfInning.num, 0, 0)
                    home.splice(halfInning.num, 0, 0)
                }

                away[halfInning.num] = halfInning?.linescore?.runs ? halfInning?.linescore?.runs : 0
            } else {
                home[halfInning.num] = halfInning?.linescore.runs ? halfInning?.linescore?.runs : 0
            }

        }

        //Set total score
        away[Math.max(game.currentInning + 1, 10)] = game.score.away
        home[Math.max(game.currentInning + 1, 10)] = game.score.home

        //Set hits
        away[Math.max(game.currentInning + 2, 11)] = game.halfInnings.filter(i => i.top == true)?.map(i => i.plays.filter(p => this.isHit(p.result))?.length || 0)?.reduce((acc, num) => acc + num, 0)
        home[Math.max(game.currentInning + 2, 11)] = game.halfInnings.filter(i => i.top == false)?.map(i => i.plays.filter(p => this.isHit(p.result))?.length || 0)?.reduce((acc, num) => acc + num, 0)

        return {
            away: away,
            home: home 
        }

    }

    isHit(playResult: PlayResult) {

        switch (playResult) {
            case PlayResult.SINGLE:
            case PlayResult.DOUBLE:
            case PlayResult.TRIPLE:
            case PlayResult.HR:
                return true
        }

        return false

    }

    getGameViewModel(game:Game) : GameViewModel {

        let linescore = this.getLineScore(game)
        let baseRunners:BaseRunners = this.getBaserunners(game)
        let matchup:UpcomingMatchup = this.getUpcomingMatchup(game)
        let plays:LastPlay[] = this.getLastPlays(game)

        return {
            game: game,
            linescore: linescore,
            baseRunners: baseRunners,
            matchup: matchup,
            plays: plays
        }

    }

    getGameSummaryViewModel(game:Game) : GameSummaryViewModel {

        let linescore = this.getLineScore(game)
        let baseRunners:BaseRunners = this.getBaserunners(game)
        
        let matchup:UpcomingMatchup 

        if (game.isStarted) {
            matchup = this.getUpcomingMatchup(game)
        }

        let plays:LastPlay[] = this.getLastPlays(game)

        let play = plays?.length > 0 ? plays[plays.length -1] : undefined

        let awayPitcher = game.away.players?.find(p => p._id == game.away.currentPitcherId)
        let homePitcher = game.home.players?.find(p => p._id == game.home.currentPitcherId)

        let wpa 

        if (play?.play?.result) {
            wpa = this.gameSharedService.getWPAFromPlay(play.play, matchup.hitter, matchup.pitcher, game.isComplete)
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
   
    // async getOverallStats(options?:any) : Promise<OverallStats> {

    //     let overall = await this.gameRepository.getGameAverages(options)

    //     // let gameHitAverages = await this.gameHitResultRepository.getGameAverageHitResult(options)

    //     let stats:OverallStats = {
    //         runsPerGame: overall.averageTotalRuns,
    //         inningsPerGame: overall.averageInnings,
    //         pa: gameHitAverages.pa,
    //         atBats: gameHitAverages.atBats,

    //         rbiPerPa: gameHitAverages.rbi / gameHitAverages.pa,
    //         bbPerPa: gameHitAverages.bb / gameHitAverages.pa,
    //         soPerPa: gameHitAverages.so / gameHitAverages.pa,
    //         singlesPerPa: gameHitAverages.singles / gameHitAverages.pa,
    //         doublesPerPa: gameHitAverages.doubles / gameHitAverages.pa,
    //         triplesPerPa: gameHitAverages.triples / gameHitAverages.pa,
    //         homeRunsPerPa: gameHitAverages.homeRuns / gameHitAverages.pa,
    //         hbpPerPa: gameHitAverages.hbp / gameHitAverages.pa,

    //         lineOutsPerPa: gameHitAverages.lineOuts / gameHitAverages.pa,
    //         groundOutsPerPa: gameHitAverages.groundOuts / gameHitAverages.pa,
    //         flyOutsPerPa: gameHitAverages.flyOuts  / gameHitAverages.pa,

    //         total: gameHitAverages.bb + gameHitAverages.so + gameHitAverages.singles + gameHitAverages.doubles + gameHitAverages.triples + gameHitAverages.homeRuns + gameHitAverages.hbp + gameHitAverages.lineOuts + gameHitAverages.groundOuts + gameHitAverages.flyOuts,

    //         lineDrives: gameHitAverages.lineDrives / (gameHitAverages.atBats - gameHitAverages.so),
    //         groundballs: gameHitAverages.groundBalls / (gameHitAverages.atBats - gameHitAverages.so),
    //         flyballs: gameHitAverages.flyBalls / (gameHitAverages.atBats - gameHitAverages.so),

    //         ballsInPlayOuts: (gameHitAverages.flyOuts + gameHitAverages.groundOuts + gameHitAverages.lineOuts) / gameHitAverages.pa,
    //         ballsInPlay: gameHitAverages.atBats - gameHitAverages.so - gameHitAverages.homeRuns / gameHitAverages.pa,
    //         xbh: (gameHitAverages.doubles + gameHitAverages.triples + gameHitAverages.homeRuns) / gameHitAverages.pa,
    //         xbhToHit: (gameHitAverages.doubles + gameHitAverages.triples + gameHitAverages.homeRuns) / gameHitAverages.hits,

    //         abPerHr: gameHitAverages.pa / gameHitAverages.homeRuns,
    //         abPerSo: gameHitAverages.pa / gameHitAverages.so,
    //         abPerRbi: gameHitAverages.pa / gameHitAverages.rbi,

    //         ballsPerPa: gameHitAverages.balls / gameHitAverages.pa,
    //         strikesPerPa: gameHitAverages.strikes / gameHitAverages.pa,
    //         foulsPerPa: gameHitAverages.fouls / gameHitAverages.pa,
    //         pitchesPerPa: gameHitAverages.pitches / gameHitAverages.pa,

    //         swingRate: gameHitAverages.swings / gameHitAverages.pitches,
    //         swingsPerPa: gameHitAverages.swings / gameHitAverages.pa,
    //         swingAtBallsPerPa: gameHitAverages.swingAtBalls / gameHitAverages.pa,
    //         swingAtStrikesPerPa: gameHitAverages.swingAtStrikes / gameHitAverages.pa,

    //         inZonePerPa: gameHitAverages.inZone / gameHitAverages.pa,
    //         inZonePercent: gameHitAverages.inZone / gameHitAverages.pitches,



    //         gbToFb: gameHitAverages.groundBalls / (gameHitAverages.flyBalls + gameHitAverages.lineDrives),
    //         goToAo: gameHitAverages.groundOuts / (gameHitAverages.flyOuts + gameHitAverages.lineOuts),
    //         hrToFb: gameHitAverages.homeRuns / (gameHitAverages.flyBalls + gameHitAverages.lineDrives),

    //         obp: (gameHitAverages.hits + gameHitAverages.bb + gameHitAverages.hbp) / gameHitAverages.pa,
    //         avg: gameHitAverages.hits / gameHitAverages.pa,
    //         babip: (gameHitAverages.hits - gameHitAverages.homeRuns) / (gameHitAverages.atBats - gameHitAverages.homeRuns - gameHitAverages.so),
    //         slg: (gameHitAverages.singles + (2 * gameHitAverages.doubles) + (3 * gameHitAverages.triples) + 4 * gameHitAverages.homeRuns) / gameHitAverages.atBats,
    //         ops: 0,

    //     }

    //     stats.ops = stats.obp + stats.slg

    //     return stats


    // }

    getAverageRating(gamePlayers:GamePlayer[]) : number {
        let total = gamePlayers.map(p => p.overallRating.before).reduce((a, b) => a + b)
        return total / gamePlayers.length
    }

    getAverageAge(gamePlayers:GamePlayer[]) : number {
        let total = gamePlayers.map(p => p.age).reduce((a, b) => a + b)
        return total / gamePlayers.length
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

        this.initGame(game)

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

    createPlay(playIndex:number,
               hitter:GamePlayer, 
               pitcher:GamePlayer, 
               catcher:GamePlayer, 
               runner1B:GamePlayer|undefined,
               runner2B:GamePlayer|undefined,
               runner3B:GamePlayer|undefined,
               matchupHandedness:MatchupHandedness,
               outs:number,
               score:Score,
               inningNum: number,
               inningTop: boolean
    ) : Play {

            let runnerResult:RunnerResult = {
                first: runner1B?._id,
                second: runner2B?._id,
                third: runner3B?._id,
                scored: [],
                out: []
            }

            //Preserve starting runners to save with play data
            let startingRunnerResult = JSON.parse(JSON.stringify(runnerResult))
            let endingRunnerResult = JSON.parse(JSON.stringify(runnerResult))


            let startingCount = JSON.parse(JSON.stringify( {
                balls: 0,
                strikes: 0,
                outs: outs
            }))

            let startingScore = JSON.parse(JSON.stringify(score))


            let defensiveCredits:DefensiveCredit[] = []

            let pitchLog: PitchLog = {

                count: {
                    balls: 0,
                    strikes: 0,
                    fouls: 0,
                    pitches: 0
                },

                pitches: []
            }

            return {
                index: playIndex,
                inningNum: inningNum,
                inningTop: inningTop,
                pitchLog: pitchLog,
                credits: defensiveCredits,
                runner: {
                    events: [],
                    result: {
                        start: startingRunnerResult,
                        end: endingRunnerResult //change this one during the play
                    }
                },
                hitterId: hitter._id,
                pitcherId: pitcher._id,
                catcherId: catcher._id,
                matchupHandedness: matchupHandedness,
                count: {
                    start: startingCount
                },
                score: {
                    start: startingScore
                }
            }


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

interface GamesViewModel {
    inProgress:GameSummaryViewModel[]
    scheduled: GameSummaryViewModel[]
    finished: GameSummaryViewModel[]
}

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


const STANDARD_INNINGS = 9


interface SimGameCommand {

}



interface OverallStats {

    runsPerGame:number
    inningsPerGame:number
    
    pa:number
    atBats:number

    rbiPerPa:number

    bbPerPa:number
    soPerPa:number
    singlesPerPa:number
    doublesPerPa:number
    triplesPerPa:number
    homeRunsPerPa:number
    hbpPerPa:number
    lineOutsPerPa:number
    groundOutsPerPa:number
    flyOutsPerPa:number

    // bb:number
    // so:number
    // singles:number
    // doubles:number
    // triples:number
    // homeRuns:number
    // hbp:number
    // lineOuts:number
    // groundOuts:number
    // flyOuts:number
    // outs:number


    ballsInPlay:number
    ballsInPlayOuts:number
    lineDrives:number
    groundballs:number
    flyballs:number

    total:number


    xbh:number
    xbhToHit:number

    abPerHr:number
    abPerSo:number
    abPerRbi:number

    pitchesPerPa:number
    inZonePerPa:number

    inZonePercent:number

    ballsPerPa:number
    strikesPerPa:number
    foulsPerPa:number

    swingRate:number
    swingsPerPa:number
    swingAtBallsPerPa:number
    swingAtStrikesPerPa:number

    gbToFb:number
    goToAo:number

    hrToFb:number

    obp:number
    avg:number
    babip:number
    slg:number
    ops:number

}

interface StartGameCommand {
    game:Game, 
    home:Team, 
    homeTLS:TeamLeagueSeason, 
    homePlayers:PlayerLeagueSeason[], 
    homeStartingPitcher:RotationPitcher, 
    away:Team, 
    awayTLS:TeamLeagueSeason, 
    awayPlayers:PlayerLeagueSeason[], 
    awayStartingPitcher:RotationPitcher,
    leagueAverages:LeagueAverage
    date:Date
}





export {
    GameService, SimGameCommand, LastPlay, GameViewModel, GameSummaryViewModel
}

