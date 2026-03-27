import { inject, injectable } from "inversify"
import { StatService } from "../stat-service.js";
import { PlayerSharedService } from "./player-shared-service.js";

import { StartGameCommand, Game, RotationPitcher, LeagueAverage, TeamInfo, Player, Play, LastPlay, GamePlayerBio, UpcomingMatchup, GamePlayer, ThrowRoll, RunnerResult, RunnerEvent, PlayResult, DefensiveCredit, ShallowDeep, Contact, Score, HalfInning } from "baseball-sim-engine"

import { simService } from "baseball-sim-engine";

@injectable()
class SimSharedService {

    winExpectancy:WinExpectancy
    gamePlayers:GamePlayers
    gameInfo:GameInfo

    constructor(
        private statService:StatService,
        private playerSharedService:PlayerSharedService,
        @inject("winExpectancyChart") private winExpectancyChart:any[]

    ) {
        this.gamePlayers = new GamePlayers(this.playerSharedService, this.statService)
        this.winExpectancy = new WinExpectancy(this.gamePlayers,this.winExpectancyChart)
        this.gameInfo = new GameInfo(this.gamePlayers)
    }

    startGame(command:StartGameCommand) {
        return simService.startGame(command)
    }

    finishGame(game:Game) : void {
        return simService.finishGame(game)
    }



    /*
    Passthrough/public stuff. 

    */

    simPitch(game:Game, rng:any) {
        return simService.simPitch(game, rng)
    }

    buildTeamInfoFromPlayers (leagueAverage:LeagueAverage, name:string, teamId:string, players:Player[], color1:string, color2:string, startingId:number) {
        return simService.buildTeamInfoFromPlayers(leagueAverage, name, teamId, players, color1, color1, startingId)
    }

    getLastPlays(game:Game) : LastPlay[] {
        return this.gameInfo.getLastPlays(game)
    }

    getWPAFromPlay(play:Play, hitter:GamePlayer|GamePlayerBio, pitcher:GamePlayer|GamePlayerBio, isLastPlay:boolean) : WPA {
        return this.winExpectancy.getWPAFromPlay(play, hitter, pitcher, isLastPlay)
    }

    getUpcomingMatchup(game:Game) : UpcomingMatchup {
        return simService.getUpcomingMatchup(game)
    }

    buildGamePlayerBio(player:GamePlayer) : GamePlayerBio {
        return this.gamePlayers.buildGamePlayerBio(player)
    }

    // getThrowResult(gameRNG, overallSafeChance:number) : ThrowRoll {
    //     return simService.getThrowResult(gameRNG, overallSafeChance)
    // }

    // getRunnerEvents(gameRNG, runnerResult:RunnerResult, halfInningRunnerEvents:RunnerEvent[], defensiveCredits:DefensiveCredit[], leagueAverages: LeagueAverage, playResult: PlayResult, 
    //                 contact: Contact|undefined, shallowDeep: ShallowDeep|undefined, hitter:GamePlayer, fielderPlayer: GamePlayer|undefined, 
    //                 runner1B:GamePlayer|undefined, runner2B:GamePlayer|undefined, runner3B:GamePlayer|undefined, offense:TeamInfo, defense:TeamInfo, pitcher:GamePlayer, pitchIndex:number) : RunnerEvent[] {
    // }

    // getChanceRunnerSafe(leagueAverages: LeagueAverage, armRating:number, runnerSpeed:number, defaultSuccess:number) {
    // }
    
    //Exposed in tests.
    initGamePlayers(leagueAverage:LeagueAverage, players:Player[], startingPitcher:RotationPitcher, teamId:string, color1:string, color2:string, startingId:number) : GamePlayer[] {
        return simService.initGamePlayers(leagueAverage, players, startingPitcher, teamId, color1, color2, startingId)
    }
    

}

class GameInfo {

    constructor(
        private gamePlayers:GamePlayers
    ) {}

    
    static getPlays(game:Game) : Play[] {
        return game.halfInnings.map((inning) => inning.plays).reduce((accumulator, playsArray) => accumulator.concat(playsArray), []) // Flatten into a single array
    }

    getLastPlays(game:Game) : LastPlay[] {

        let plays:Play[] = GameInfo.getPlays(game) // Flatten into a single array
    
        plays = plays.slice(Math.max(plays.length - 5, 0))

        let lastPlays:LastPlay[] = []

        for (let play of plays) {
            
            let hi:HalfInning = game.halfInnings.find(i => i.plays.includes(play))
            
            lastPlays.push({
                hitter:  this.gamePlayers.buildGamePlayerBio( this.gamePlayers.getGamePlayer(game, play.hitterId) ),
                pitcher: this.gamePlayers.buildGamePlayerBio( this.gamePlayers.getGamePlayer(game, play.pitcherId) ),
                play: play,
                inning: hi.num,
                top: hi.top,
                first: play.runner?.result?.end.first ? this.gamePlayers.buildGamePlayerBio(this.gamePlayers.getGamePlayer(game, play.runner?.result?.end?.first)) : undefined,
                second: play.runner?.result?.end.second ? this.gamePlayers.buildGamePlayerBio(this.gamePlayers.getGamePlayer(game, play.runner?.result?.end?.second)) : undefined,
                third: play.runner?.result?.end.third ? this.gamePlayers.buildGamePlayerBio(this.gamePlayers.getGamePlayer(game, play.runner?.result?.end?.third)) : undefined,
            }) 
        }

        return lastPlays

    }


}

class WinExpectancy {

    constructor(
        private gamePlayers:GamePlayers,
        private winExpectancyChart:any[]
    ) {}

    generateWPA(game:Game) : WPAReward[] {
        
        let rewards:WPAReward[] = []

        let plays:Play[] = GameInfo.getPlays(game)

        for (let play of plays) {

            let hitter:GamePlayerBio = this.gamePlayers.buildGamePlayerBio(this.gamePlayers.getGamePlayer(game, play.hitterId))
            let pitcher:GamePlayerBio = this.gamePlayers.buildGamePlayerBio(this.gamePlayers.getGamePlayer(game, play.pitcherId))

            let playRewards = this.getWPAFromPlay(play, hitter, pitcher, play == plays[plays.length -1] /* is last play*/)

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

    getWPAFromPlay(play:Play, hitter:GamePlayer|GamePlayerBio, pitcher:GamePlayer|GamePlayerBio, isLastPlay:boolean) : WPA {

        let expectancyBefore = this.getWinExpectancy(play.inningNum, play.inningTop, play.runner.result.start.first != undefined, play.runner.result.start.second != undefined, play.runner.result.start.third != undefined, play.count.start.outs, play.score.start, false)
        
        let inningTop = play.inningTop
        let inningNum = play.inningNum
        let outs = play.count.end.outs


        if (play.count.end.outs >= 3) {

            if (inningTop) {
                inningTop = false
            } else {
                inningNum++
                inningTop = true
            }

            outs = 0
        }
                
        let expectancyAfter = this.getWinExpectancy(inningNum, inningTop, play.runner.result.end.first != undefined, play.runner.result.end.second != undefined, play.runner.result.end.third != undefined, outs, play.score.end, isLastPlay )
        
        let total = expectancyAfter - expectancyBefore

        return {
            expectancyBefore: expectancyBefore,
            expectancyAfter: expectancyAfter,
            total: total,
            rewards: this.getWinExpectancyRewards(play.inningTop, total, { hitter: hitter, pitcher: pitcher}, play.credits)
        }

    }

    getWinExpectancy(inning:number, top:boolean, runner1B:boolean, runner2B:boolean, runner3B:boolean, outs:number, score:Score, isComplete:boolean) : number {

        if (!this.winExpectancyChart) {
            throw new Error("win expectancy chart not configured")
        }


        if (isComplete) {

            if (score.home > score.away) return 1
            if (score.away > score.home) return 0

            throw new Error("Error calculating WPA at end of game")

        }

        let baseSit:number

        if (!runner1B && !runner2B && !runner3B) baseSit = 1
        if (runner1B && !runner2B && !runner3B) baseSit = 2
        if (!runner1B && runner2B && !runner3B) baseSit = 3
        if (runner1B && runner2B && !runner3B) baseSit = 4
        if (!runner1B && !runner2B && runner3B) baseSit = 5
        if (runner1B && !runner2B && runner3B) baseSit = 6
        if (!runner1B && runner2B && runner3B) baseSit = 7
        if (runner1B && runner2B && runner3B) baseSit = 8

        if (inning > 9) inning = 9        
        
        let weRow = this.winExpectancyChart.filter(r => r.inning == inning && r.top == (top == true ? 'Top' : 'Bottom') && r.basesit == baseSit && r.outs == outs)[0]

        let homeDiff = score.home - score.away
        
        if (homeDiff < -15) homeDiff = -15
        if (homeDiff > 15) homeDiff = 15

        if (homeDiff == 0) {
            return weRow.zero
        } else if (homeDiff < 0) {
            return weRow[homeDiff.toString().replace("-", "neg")]
        } else if (homeDiff > 0) {
            return weRow[`pos${homeDiff.toString()}`]
        } 

    }

    getWinExpectancyRewards(isTopInning:boolean, wpaTotal:number, matchup, defensiveCredits:DefensiveCredit[]) : WPAReward[] {
        
        let rewards:WPAReward[] = []

        //wpaTotal represents the total amount of wpa awarded to the home team.

        let homePlayerId = isTopInning ? matchup.pitcher._id : matchup.hitter._id
        let awayPlayerId = isTopInning ? matchup.hitter._id : matchup.pitcher._id

        if (wpaTotal == 0) {
                //no change
                rewards.push({ playerId: matchup.pitcher._id, hitting: false, reward: wpaTotal })
                rewards.push({ playerId: matchup.hitter._id, hitting: true, reward: wpaTotal })

        } else {

            //WPA applied for home team
            rewards.push({ playerId: homePlayerId, hitting: homePlayerId == matchup.hitter._id, reward: wpaTotal })

            //Negative WPA for away team
            rewards.push({ playerId: awayPlayerId, hitting: awayPlayerId == matchup.hitter._id, reward: wpaTotal * -1 })
        }




        return rewards


    }

}

class GamePlayers {

    constructor(
        private playerSharedService:PlayerSharedService,
        private statService:StatService
    ) {}

    getGamePlayer(game:Game, playerId:string) {

        let player = game.away.players.find(p => p._id == playerId)

        if (!player) {
            player = game.home.players.find( p => p._id == playerId)
        }

        return player

    }   

    buildGamePlayerBio(player:GamePlayer) : GamePlayerBio {

        return { 
                
            _id: player._id,
            fullName: player.fullName,

            age: player.age,
            ownerId: player.ownerId,

            throws: player.throws,
            hits: player.hits,

            hitResult: this.statService.hitResultToHitterStatLine(player.hitResult),
            pitchResult: this.statService.pitchResultToPitcherStatLine(player.pitchResult)
        }

    }
}

interface WPA {

    expectancyBefore?:number
    expectancyAfter?:number

    total?:number

    rewards?:WPAReward[]

}

interface WPAReward {
    playerId:string
    reward:number
    hitting:boolean
}


export {
    SimSharedService
}

