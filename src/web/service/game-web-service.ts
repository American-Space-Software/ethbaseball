import { inject, injectable } from "inversify";
import axios from "axios"
import { BaseResult, Contact, GamePlayer, Handedness, MatchupHandedness, OfficialPlayResult, OfficialRunnerResult, Play, PlayResult, Position, RunnerEvent, ShallowDeep, ThrowResult } from "../../service/enums.js";
import dayjs from "dayjs";
import { Game } from "../../dto/game.js";

import { SocketWebService } from "./socket-web-service.js";


@injectable()
class GameWebService {
    
    constructor(
        private socketWebService: SocketWebService,
        @inject('env') private env:any
    ) { }

    async watchGame(_id:string, onGameUpdate:Function) {

        let socket = this.socketWebService.gameSocket

        socket.emit("watch-game", _id)

        socket.on("game", (data) => {
            // console.log(data)
            onGameUpdate(data)
        })

    }

    async unwatchGame(_id:string) {
        this.socketWebService.gameSocket.emit("unwatch-game", _id)
    }


    async getGames(dateString:string, rank:number) {

        let result = await axios.get(`/api/game/list/${rank}/${dateString}`, {
            // query URL without using browser cache
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        })

        return result.data
    }

    async get(_id: number) {

        let result = await axios.get(`/api/game/view/${_id}`, {
            // query URL without using browser cache
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        })

        return result.data
    }


    async playBot() {
        //Download it.
        let result = await axios.post(`/api/game/play/bot`)
        return result.data

    }

    async getGameViewModel(game) {

        // //Expand season and career stats
        // let allPlayers:GamePlayer[] = [].concat(game.away.players).concat(game.home.players).filter( gp => gp != undefined)

        // for (let p of allPlayers) {

        //     p.seasonStats.after = {
        //         //@ts-ignore
        //         hitting: this.statService.mergeHitResultsToStatLine(p.seasonStats?.before?.hitting, p.hitResult),
        //         //@ts-ignore
        //         pitching: this.statService.mergePitchResultsToStatLine(p.seasonStats?.before?.pitching, p.pitchResult)
        //     }

        //     p.careerStats.after = {
        //         //@ts-ignore
        //         hitting: this.statService.mergeHitResultsToStatLine(p.careerStats?.before?.hitting, p.hitResult),
        //         //@ts-ignore
        //         pitching: this.statService.mergePitchResultsToStatLine(p.careerStats?.before?.pitching, p.pitchResult)
        //     }

        // }

        let linescore = this.getLineScore(game)
        let playByPlay = this.getPlayByPlay(game)
        let play = playByPlay?.length > 0 ? playByPlay[0] : undefined

        let awayBoxscoreViewModel = {
            homeaway:"AWAY",
            teamInfo: game.away,
            isComplete: game.isComplete,
            isTopInning: game.isTopInning
        }

        let homeBoxscoreViewModel = {
            homeaway:"HOME",
            teamInfo: game.home,
            isComplete: game.isComplete,
            isTopInning: game.isTopInning
        }


        let gameViewModel = {

            game: game,

            linescoreViewModel: {
                currentInning: game.currentInning,
                isTopInning: game.isTopInning,
                isComplete: game.isComplete,
                awayName: game.away.abbrev,
                homeName: game.home.abbrev,
                linescore: linescore,
                wpa: play?.play?.wpa
            },

            awayBoxscoreViewModel: awayBoxscoreViewModel,
            homeBoxscoreViewModel: homeBoxscoreViewModel,
            atBatBoxscoreViewModel: game.isTopInning ? awayBoxscoreViewModel : homeBoxscoreViewModel,
            
            playByPlay: playByPlay,

            isTopInning: game.isTopInning,
            currentInning: game.currentInning,
            balls: game.count?.balls,
            strikes: game.count?.strikes,
            outs: game.count?.outs,
            score: game.score,

            showHitter: false,
            showLinescore: false,
            showLineup: false,


        }

        if (game.isStarted) {

            let gamePlayers = this.gamePlayers(game)
    
            let hitter = this.getHitter(game)
            let pitcher = this.getPitcher(game)
    
            let defense = this.getDefense(game)
    
            let winningPitcher
            let losingPitcher
    
            if (game.isComplete) {
                winningPitcher = gamePlayers[game.winningPitcherId]
                losingPitcher = gamePlayers[game.losingPitcherId]
            }
    
            let runner1B = gamePlayers[this.getOffense(game).runner1BId]
            let runner2B = gamePlayers[this.getOffense(game).runner2BId]
            let runner3B = gamePlayers[this.getOffense(game).runner3BId]
    
            const getDefender = (pos) => {
                return defense.players.find(p => p.currentPosition == pos)
            }
    
            let catcher = getDefender("C")
            let firstBase = getDefender("1B")
            let secondBase = getDefender("2B")
            let thirdBase = getDefender("3B")
            let ss = getDefender("SS")
            let lf = getDefender("LF")
            let cf = getDefender("CF")
            let rf = getDefender("RF")
    
            let matchupHandedness = hitter ? this.getMatchupHandedness(hitter, pitcher) : undefined
    

            Object.assign(gameViewModel, {
                runner1B: runner1B,
                runner2B: runner2B,
                runner3B: runner3B,

                hitter: hitter,
                pitcher: pitcher,
    
                showHitter: hitter != undefined ,
                showLinescore: true,
                showLineup: true,

                play: play,

                matchupHandedness: hitter ? matchupHandedness : undefined,
                matchupPitcherRatings: hitter ? this.getEffectivePitchRatings(pitcher, matchupHandedness.hits) : undefined,
                matchupHitterRatings: hitter ? this.getEffectiveHittingRatings(hitter, matchupHandedness.throws) : undefined,
    
                defense: defense,
    
                catcher: catcher,
                firstBase: firstBase,
                secondBase: secondBase,
                thirdBase: thirdBase,
                ss: ss,
                lf: lf,
                cf: cf,
                rf: rf,
    
                winningPitcher: winningPitcher,
                losingPitcher: losingPitcher
            })

        }

        return gameViewModel

    }



    getLineScore(game) {

        if (!game) return

        let away = [game.away.name, '', '', '', '', '', '', '', '', '', 0, 0, 0]
        let home = [game.home.name, '', '', '', '', '', '', '', '', '', 0, 0, 0]

        //Set inning scores
        for (let halfInning of game.halfInnings) {

            if (halfInning.top) {

                if (halfInning.num > 9) {
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

    getOffense(game) {

        if (game.isTopInning) {
            return game.away
        } else {
            return game.home
        }
    }

    getDefense(game) {

        if (game.isTopInning) {
            return game.home
        } else {
            return game.away
        }
    }

    getHitter(game) {

        if (game.isComplete) return

        if (game.isTopInning) {
            return game.away.players.find((p) => p._id == game.away.lineupIds[game.away.currentHitterIndex])
        } else {
            return game.home.players.find((p) => p._id == game.home.lineupIds[game.home.currentHitterIndex])
        }

    }

    getPitcher(game) {

        if (game.isComplete) return

        if (game.isTopInning) {
            return game.home.players.filter((p) => p._id == game.home.currentPitcherId)[0]
        } else {
            return game.away.players.filter((p) => p._id == game.away.currentPitcherId)[0]
        }

    }

    getDefenseForPlay(game, play: Play) {

        if (play.inningTop) {
            return game.home
        } else {
            return game.away
        }

    }

    getLastPlays(game, amount: number): Play[] {

        let plays: Play[] = game.halfInnings.map((inning) => inning.plays).reduce((accumulator, playsArray) => accumulator.concat(playsArray), []).reverse() // Flatten into a single array

        return plays.slice(0, Math.max(plays.length - amount, 0))

    }

    getPlayByPlay(game) {

        let halfInnings = JSON.parse(JSON.stringify(game.halfInnings))

        halfInnings.reverse()

        let results = []

        for (let hi of halfInnings) {

            let plays = JSON.parse(JSON.stringify(hi.plays))
            plays.reverse()

            for (let play of plays) {
                results.push({
                    descriptions: this.getPlayDescription(game, play),
                    play: play
                })
            }

        }

        return results

    }

    getPlayDescription(game, play: Play) {

        // let defense = this.getDefense(game)

        let gamePlayers = this.gamePlayers(game)


        let hitter: GamePlayer = gamePlayers[play.hitterId]
        let pitcher = gamePlayers[play.pitcherId]


        let fielderPlayer: GamePlayer
        if (play.fielderId) {
            fielderPlayer = gamePlayers[play.fielderId]
        }


        let mainDescription
        let descriptions = []


        let runner1bRA = play.runner?.events.find(re => re.movement.start==BaseResult.FIRST)
        let runner2bRA = play.runner?.events.find(re => re.movement.start==BaseResult.SECOND)
        let runner3bRA = play.runner?.events.find(re => re.movement.start==BaseResult.THIRD)

        // let hitterRA = play.runner?.events.find(re => re.movement.start==BaseResult.HOME)

        switch (play.result) {

            
            case PlayResult.STRIKEOUT:
                mainDescription = `<a href="/p/${hitter._id}">${hitter.fullName}</a> strikes out.`
                break
            case PlayResult.BB:
                mainDescription = `<a href="/p/${hitter._id}">${hitter.fullName}</a> draws a walk.`
                break
            case PlayResult.HIT_BY_PITCH:
                mainDescription = `<a href="/p/${hitter._id}">${hitter.fullName}</a> gets hit by a pitch.`
                break
            case PlayResult.OUT:

                let fcRunnerRA

                if (runner3bRA?.movement?.isOut) {
                    fcRunnerRA = runner3bRA
                } else if (runner2bRA?.movement?.isOut) {
                    fcRunnerRA = runner2bRA
                } else if (runner1bRA?.movement?.isOut) {
                    fcRunnerRA = runner1bRA
                }

                if (play.officialPlayResult == OfficialPlayResult.FIELDERS_CHOICE) {
                    mainDescription = `<a href="/p/${hitter._id}">${hitter.fullName}</a> hits ${this.getContactDescription(play.contact, this.isToOF(play.fielder), false)} to ${this.getPositionDescriptionNoun(play.fielder)} <a href="/p/${fielderPlayer._id}">${fielderPlayer.fullName}</a>. The throw gets the lead runner at ${fcRunnerRA?.movement?.outBase}. Fielder's choice.`
                } else if (play.officialPlayResult == OfficialPlayResult.GROUNDED_INTO_DP) {
                    mainDescription = `<a href="/p/${hitter._id}">${hitter.fullName}</a> ${this.getContactDescriptionOut(play.contact, this.isToOF(play.fielder))} to ${this.getPositionDescriptionNoun(play.fielder)} <a href="/p/${fielderPlayer._id}">${fielderPlayer.fullName}</a>. Fielder throws to ${fcRunnerRA.movement.outBase} for the first out and relays to first for the double play.`
                } else {
                    mainDescription = `<a href="/p/${hitter._id}">${hitter.fullName}</a> ${this.getContactDescriptionOut(play.contact, this.isToOF(play.fielder))} to the ${this.getPositionDescriptionNoun(play.fielder)} <a href="/p/${fielderPlayer._id}">${fielderPlayer.fullName}</a>.`
                }

                break
            case PlayResult.SINGLE:
                mainDescription = `<a href="/p/${hitter._id}">${hitter.fullName}</a> hits ${this.getContactDescription(play.contact, this.isToOF(play.fielder), this.isHit(play.result))} single to ${this.getShallowDeepDescription(play.shallowDeep)} ${this.getPositionDescription(play.fielder)}.`
                descriptions.push(`The ball is fielded by <a href="/p/${fielderPlayer._id}">${fielderPlayer.fullName}</a>.`)
                break
            case PlayResult.DOUBLE:
                mainDescription = `<a href="/p/${hitter._id}">${hitter.fullName}</a> hits ${this.getContactDescription(play.contact, this.isToOF(play.fielder), this.isHit(play.result))} double to ${this.getShallowDeepDescription(play.shallowDeep)} ${this.getPositionDescription(play.fielder)}.`
                descriptions.push(`The ball is fielded by <a href="/p/${fielderPlayer._id}">${fielderPlayer.fullName}</a>.`)
                break
            case PlayResult.TRIPLE:
                mainDescription = `<a href="/p/${hitter._id}">${hitter.fullName}</a> hits ${this.getContactDescription(play.contact, this.isToOF(play.fielder), this.isHit(play.result))} triple to ${this.getShallowDeepDescription(play.shallowDeep)} ${this.getPositionDescription(play.fielder)}.`
                descriptions.push(`The ball is fielded by <a href="/p/${fielderPlayer._id}">${fielderPlayer.fullName}</a>.`)
                break
            case PlayResult.HR:
                mainDescription = `<a href="/p/${hitter._id}">${hitter.fullName}</a> hits a home run.`
                break
        }

        //Runs?
        if (play.runner?.result?.end?.scored?.length > 0) {
            descriptions.push(`${play.runner.result.end.scored?.length} runs score.`)
            descriptions.push(`The score is ${play.score.end.away} - ${play.score.end.home}.`)
        }

        //End inning?
        if (play.runner?.result?.end?.out?.length > 0) {

            if (play.count.end.outs == 3) {
                descriptions.push(`There's 3 outs and the inning is complete.`)
            } else {
                descriptions.push(`There ${this.getOutsPhrase(play.count.end.outs)}.`)
            }

        }

        return {
            mainDescription: mainDescription,
            descriptions: descriptions,
            play: play
        }


    }

    getRunnerDescription(game:Game, runnerEvent:RunnerEvent) {

        // let startBase = this.getBase(runnerEvent.movement.start)

        let thrower = this.gamePlayers(game)[runnerEvent.throw?.from?._id]


        if (runnerEvent.movement.isOut) {
        
            if (thrower) {

                if (runnerEvent.isSBAttempt) {
                    return `caught stealing at ${runnerEvent.movement.outBase} on the throw from the ${this.getPositionDescriptionNoun(runnerEvent.throw.from.position)} ${thrower.fullName}.`

                } else {
                    return `out at ${runnerEvent.movement.outBase} on the throw from the ${this.getPositionDescriptionNoun(runnerEvent.throw.from.position)} ${thrower.fullName}.`
                }

            } else {
                return `is out.`
            }

        } else {

            if (runnerEvent.movement.end == BaseResult.HOME) {

                return `scores from ${runnerEvent.movement.start}${runnerEvent.isError ? ` [Error]` : ''}.`

            } else {

                if (runnerEvent.isSBAttempt) {
                    if (thrower) {
                        return `steals ${runnerEvent.movement.end} with a throw from ${this.getPositionDescriptionNoun(runnerEvent.throw.from.position)} ${thrower.fullName}.`
                    } else {
                        return `steals ${runnerEvent.movement.end}.`
                    }
                }

                if (runnerEvent.isPB) {
                    return `moves to ${runnerEvent.movement.end} on a passed ball.`
                }

                if (runnerEvent.isWP) {
                    return `moves to ${runnerEvent.movement.end} on a wild pitch.`
                }


                if (runnerEvent.eventType == OfficialRunnerResult.TAGGED_FIRST_TO_SECOND || 
                    runnerEvent.eventType == OfficialRunnerResult.TAGGED_SECOND_TO_THIRD || 
                    runnerEvent.eventType == OfficialRunnerResult.TAGGED_THIRD_TO_HOME ) {
                        return `tags up and advances to ${runnerEvent.movement.end} from ${runnerEvent.movement.start}.`
                    }

                return `advances to ${runnerEvent.movement.end}${runnerEvent.isError ? ` [Error]` : ''}.`
            }

        }

    }

    getShallowDeepDescription(shallowDeep: ShallowDeep) {
        if (shallowDeep == ShallowDeep.NORMAL || !shallowDeep) return ""
        return shallowDeep.toLowerCase()
    }

    getContactDescription(contact: Contact, isToOF: boolean, isHit: boolean) {

        switch (contact) {
            case Contact.FLY_BALL:
                return isToOF ? "a fly ball" : "a popup"
            case Contact.GROUNDBALL:
                return isToOF ? "a ground ball through the infield for a" : isHit ? "an infield" : "a ground ball"
            case Contact.LINE_DRIVE:
                return "a line drive"
        }

    }

    getContactDescriptionOut(contact: Contact, isToOF: boolean) {

        switch (contact) {
            case Contact.FLY_BALL:
                return isToOF ? "flies out" : "pops out"
            case Contact.GROUNDBALL:
                return "grounds out"
            case Contact.LINE_DRIVE:
                return "lines out"
        }

    }

    getPositionDescription(position: Position) {

        switch (position) {
            case Position.PITCHER:
                return "pitcher"
            case Position.CATCHER:
                return "catcher"
            case Position.FIRST_BASE:
                return "first base"
            case Position.SECOND_BASE:
                return "second base"
            case Position.THIRD_BASE:
                return "third base"
            case Position.SHORTSTOP:
                return "shortstop"
            case Position.LEFT_FIELD:
                return "left field"
            case Position.CENTER_FIELD:
                return "center field"
            case Position.RIGHT_FIELD:
                return "right field"
        }
    }

    getPositionDescriptionNoun(position: Position) {

        switch (position) {
            case Position.PITCHER:
                return "pitcher"
            case Position.CATCHER:
                return "catcher"
            case Position.FIRST_BASE:
                return "first baseman"
            case Position.SECOND_BASE:
                return "second baseman"
            case Position.THIRD_BASE:
                return "third baseman"
            case Position.SHORTSTOP:
                return "shortstop"
            case Position.LEFT_FIELD:
                return "left fielder"
            case Position.CENTER_FIELD:
                return "center fielder"
            case Position.RIGHT_FIELD:
                return "right fielder"
        }
    }

    isToOF(fielder: Position) {

        switch (fielder) {
            case Position.LEFT_FIELD:
            case Position.RIGHT_FIELD:
            case Position.CENTER_FIELD:
                return true
        }

        return false

    }

    getBase(base:BaseResult) {
        switch (base) {
            case BaseResult.FIRST:
                return "first base"
            case BaseResult.SECOND:
                return "second base"
            case BaseResult.THIRD:
                return "third base"
            case BaseResult.HOME:
                return "home"
        }
    }


    getBaseName(base:BaseResult) {

        switch (base) {
            case BaseResult.FIRST:
                return "first base"
            case BaseResult.SECOND:
                return "second base"
            case BaseResult.THIRD:
                return "third base"
            case BaseResult.HOME:
                return "home"
        }


    }


    gamePlayers(game) {

        if (!game) return {}

        let players = [].concat(game.away.players).concat(game.home.players)

        let p = {}

        for (let player of players) {
            p[player._id] = player
        }

        return p

    }

    getOutsPhrase(outs) {
        if (outs == 1) return "is one out"
        if (outs > 1) return `are ${outs} outs`
    }

    getMatchupHandedness(hitter: GamePlayer, pitcher: GamePlayer): MatchupHandedness {

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

    getEffectiveHittingRatings(hitter: GamePlayer, pitcherHandedness: Handedness) {

        if (pitcherHandedness == Handedness.R) {
            return hitter.hittingRatings.vsR
        } else {
            return hitter.hittingRatings.vsL
        }

    }

    getEffectivePitchRatings(pitcher: GamePlayer, hitterHandedness: Handedness) {

        if (hitterHandedness == Handedness.R) {
            return pitcher.pitchRatings.vsR
        } else {
            return pitcher.pitchRatings.vsL
        }

    }


    pitcherGameStats(pitcher) {

        return `
        ${pitcher.pitchResult.ip} IP, 
        ${pitcher.pitchResult.er} ER, ${pitcher.pitchResult.so} K, ${pitcher.pitchResult.bb} BB`

    }

    pitcherGameStatsShort(pitcher) {

        return `
        ${pitcher.pitchResult.ip} IP, 
        ${pitcher.pitchResult.er} ER, ${pitcher.pitchResult.so} K`

    }

    hitterGameStats(hitter) {

        let values = []

        values.push(`${hitter.hitResult.hits}/${hitter.hitResult.atBats}`)

        if (hitter.hitResult.bb > 0) {
            values.push((hitter.hitResult.bb > 0 ? `${hitter.hitResult.bb > 1 ? hitter.hitResult.bb : ''} BB` : ``).trim())
        }

        if (hitter.hitResult.hbp > 0) {
            values.push((hitter.hitResult.hbp > 0 ? `${hitter.hitResult.hbp > 1 ? hitter.hitResult.hbp : ''} HBP` : ``).trim())
        }

        if (hitter.hitResult.doubles > 0) {
            values.push((hitter.hitResult.doubles > 0 ? `${hitter.hitResult.doubles > 1 ? hitter.hitResult.doubles : ''} 2B` : ``).trim())
        }

        if (hitter.hitResult.triples > 0) {
            values.push((hitter.hitResult.triples > 0 ? `${hitter.hitResult.triples > 1 ? hitter.hitResult.triples : ''} 3B` : ``).trim())
        }

        if (hitter.hitResult.homeRuns > 0) {
            values.push((hitter.hitResult.homeRuns > 0 ? `${hitter.hitResult.homeRuns > 1 ? hitter.hitResult.homeRuns : ''} HR` : ``).trim())
        }

        if (hitter.hitResult.rbi > 0) {
            values.push((hitter.hitResult.rbi > 0 ? `${hitter.hitResult.rbi > 1 ? hitter.hitResult.rbi : ''} RBI` : ``).trim())
        }

        // values.push(`${this.statService.formatRatio(hitter.careerStats?.hitting?.avg)} AVG`)

        return `${values.length > 0 ? values.join(", ") : ''}`

    }

    hitterGameStatsShort(hitter) {

        let values = []

        values.push(`${hitter.hitResult.hits}/${hitter.hitResult.atBats}`)

        // values.push(`${this.statService.formatRatio(hitter.careerStats?.hitting?.avg)} AVG`)

        return `${values.length > 0 ? values.join(", ") : ''}`

    }



    getNumberWithOrdinal(n) {
        var s = ["th", "st", "nd", "rd"],
            v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0])
      }


    getFormattedDate(date:Date) {
        return dayjs(new Date(date).toLocaleString()).format('MMM D LT')
    }

    getBalls (total, filled){

        let result = []
  
        Array.from({ length: total }, (x, i) => {
          if ((i + 1) <= filled) {
            result.push(`🟡`)
          } else {
            result.push(`⚪`)
          }
        })
  
        return result.join('')
  
      }






}




export {
    GameWebService
}