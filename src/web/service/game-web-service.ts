import { inject, injectable } from "inversify";
import axios from "axios"
import { BaseResult, Contact, Count, DefensiveCredit, GamePlayer, Handedness, MatchupHandedness, OfficialPlayResult, OfficialRunnerResult, Pitch, PitchResult, PitchZone, Play, PlayResult, Position, RunnerEvent, RunnerResult, Score, ShallowDeep, ThrowResult } from "../../service/enums.js";
import dayjs from "dayjs";

import { SocketWebService } from "./socket-web-service.js";
import { PlayerWebService } from "./player-web-service.js";
import { TeamWebService } from "./team-web-service.js";


@injectable()
class GameWebService {
    
    private gameHandlers = new Map<string, (g:any) => void>()

    constructor(
        private socketWebService: SocketWebService,
        private playerWebService:PlayerWebService,
        private teamWebService:TeamWebService,
        @inject('env') private env:any
    ) { }

    
    async watchGame(_id: string, onGameUpdate: (g:any)=>void) {
        const socket = this.socketWebService.gameSocket

        // If we were already watching this game, remove the old handler
        const prev = this.gameHandlers.get(_id)
        if (prev) socket.off("game", prev)

        // Store handler so unwatch can remove it later
        this.gameHandlers.set(_id, onGameUpdate)

        socket.on("game", onGameUpdate)
        this.socketWebService.watch(_id)
    }

    async unwatchGame(_id: string) {

        const socket = this.socketWebService.gameSocket

        const handler = this.gameHandlers.get(_id)
        if (handler) {
            socket.off("game", handler)
            this.gameHandlers.delete(_id)
        }

        this.socketWebService.unwatch(_id)

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

    getLastPlay(game) {
        let plays:Play[] = this.getPlays(game)
        return plays?.length > 0 ?  plays.find( p => p.result != undefined) : undefined
    }

    getCurrentPlay(game) {
        let plays:Play[] = this.getPlays(game)
        return plays?.length > 0 ?  plays.find( p => !p.result) : undefined
    }

    getGameViewModel(game) {

        let linescore = this.getLineScore(game)

        let currentPlay = this.getCurrentPlay(game)

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
                // wpa: lastPlay?.play?.wpa
            },

            awayBoxscoreViewModel: awayBoxscoreViewModel,
            homeBoxscoreViewModel: homeBoxscoreViewModel,
            atBatBoxscoreViewModel: game.isTopInning ? awayBoxscoreViewModel : homeBoxscoreViewModel,
            
            // playByPlay: playByPlay,

            isTopInning: game.isTopInning,
            currentInning: game.currentInning,
            balls: game.count?.balls,
            strikes: game.count?.strikes,
            outs: game.count?.outs,
            score: game.score,

            showHitter: false,
            showLinescore: false
        }

        if (game.isStarted) {

            let gamePlayers = this.gamePlayers(game)
    
            let hitter = this.getHitter(game, currentPlay)
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

                homePlayer: game.isTopInning ? pitcher : hitter,
                awayPlayer: game.isTopInning ? hitter : pitcher,
    
                showHitter: hitter != undefined ,
                showPitcher: pitcher != undefined,
                showLinescore: true,

                // lastPlay: lastPlay,
                // currentPlay: currentPlay,

                matchupHandedness: hitter ? matchupHandedness : undefined,
    
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

    getHitter(game, currentPlay) {

        if (game.isComplete || !currentPlay) return

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


    
    getPlays(game): Play[] {

        let plays: Play[] = []

        if (game.halfInnings?.length > 0) {
            plays.push(...game.halfInnings?.map((inning) => inning.plays).reduce((accumulator, playsArray) => accumulator.concat(playsArray), []).reverse())
        } 

        return plays

    }


    isFirstPlayOfHalfInning(game, play: Play): boolean {
        const half = game.halfInnings?.find(h => h.num === play.inningNum && h.top === play.inningTop)
        if (!half || half.plays.length === 0) return false
        return half.plays[0].index === play.index
    }

    isGameEndingPlay(game, play: Play): boolean {
        return !!game.isFinished && play.index === game.playIndex
    }


    getGameRecapDescriptions(game, play: Play): PlayDescription[] {

        const descriptions: PlayDescription[] = []

        const hash = (s: string) => {
            let h = 2166136261
            for (let i = 0; i < s.length; i++) {
                h ^= s.charCodeAt(i)
                h = Math.imul(h, 16777619)
            }
            return h >>> 0
        }

        const seed =
            (play?.index ?? 0) * 1009 +
            hash(String(game?._id ?? "")) * 3 +
            hash(String(play?.inningNum ?? "")) * 7 +
            (play?.inningTop ? 11 : 13) +
            hash(`${play?.score?.end?.away ?? ""}-${play?.score?.end?.home ?? ""}`) * 17

        const pick = <T>(list: T[], n: number) => list[Math.abs(n) % list.length]

        const awayName = this.teamWebService.getTeamName(game.away)
        const homeName = this.teamWebService.getTeamName(game.home)

        const away = play.score.end?.away ?? play.score.start.away
        const home = play.score.end?.home ?? play.score.start.home

        const winnerName =
            away === home ? null :
            away > home ? awayName : homeName

        const finalScoreSentence = `The final score is ${away} - ${home}.`

        const ballgamePhrases = [
            () => `That's the ballgame.`,
            () => `And this one is over.`,
            () => `Ballgame.`
        ]

        const winnerPhrases = winnerName
            ? [
                () => `${winnerName} win it.`,
                () => `${winnerName} come away with the win.`,
                () => `${winnerName} take this one.`,
                () => `Final: ${winnerName} on top.`
            ]
            : [
                () => `This one ends in a tie.`,
                () => `They finish even.`,
                () => `All square at the end.`
            ]

        const margin = Math.abs(away - home)
        const gameTagPhrases =
            away === home ? [] :
            margin === 1 ? [
                () => `A one-run game to the end.`,
                () => `A tight one-run finish.`
            ] :
            margin >= 6 ? [
                () => `A comfortable win in the end.`,
                () => `They pull away for the win.`
            ] : [
                () => `A solid win in the end.`,
                () => `They get it done today.`
            ]

        descriptions.push({
            type: PlayDescriptionType.RECAP,
            text: pick(ballgamePhrases, seed)()
        })

        descriptions.push({
            type: PlayDescriptionType.RECAP,
            text: pick(winnerPhrases, seed + 23)()
        })

        if (gameTagPhrases.length > 0) {
            descriptions.push({
                type: PlayDescriptionType.RECAP,
                text: pick(gameTagPhrases, seed + 41)()
            })
        }

        descriptions.push({
            type: PlayDescriptionType.RECAP,
            text: finalScoreSentence
        })

        return descriptions
    }

    getGameStartDescriptions(game): PlayDescription[] {

        const descriptions: PlayDescription[] = []

        const awayName = this.teamWebService.getTeamName(game.away)
        const homeName = this.teamWebService.getTeamName(game.home)

        const gamePlayers = this.gamePlayers(game)
        

        // Infer the *other* starter by team
        const awayPitcher:GamePlayer = 
            Object.values(gamePlayers).find(
                (p: GamePlayer) =>
                    p._id == game.away.currentPitcherId
            ) as GamePlayer

        const homePitcher:GamePlayer =
            Object.values(gamePlayers).find(
                (p: GamePlayer) =>
                    p._id == game.home.currentPitcherId
            ) as GamePlayer


        // 1) Matchup headline
        descriptions.push({
            type: PlayDescriptionType.RECAP,
            text: `${awayName} at ${homeName}.`
        })

        // 2) Starting pitchers (both teams, once)
        descriptions.push({
            type: PlayDescriptionType.RECAP,
            text: `${awayPitcher.fullName} gets the start for ${awayName}.`
        })

        descriptions.push({
            type: PlayDescriptionType.RECAP,
            text: `${homePitcher.fullName} gets the start for ${homeName}.`
        })


        return descriptions
    }



    getInningStartDescriptions(play: Play): PlayDescription[] {

        const descriptions: PlayDescription[] = []

        const hash = (s: string) => {
            let h = 2166136261
            for (let i = 0; i < s.length; i++) {
                h ^= s.charCodeAt(i)
                h = Math.imul(h, 16777619)
            }
            return h >>> 0
        }

        const seed =
            (play?.index ?? 0) * 1009 +
            hash(String(play?.inningNum ?? "")) * 3 +
            (play?.inningTop ? 7 : 11) +
            hash(`${play?.score?.start?.away ?? ""}-${play?.score?.start?.home ?? ""}`) * 13 +
            hash(JSON.stringify(play?.runner?.result?.start ?? {})) * 17 +
            hash(String(play?.count?.start?.outs ?? 0)) * 19

        const pick = <T>(list: T[], n: number) => list[Math.abs(n) % list.length]

        const half = play.inningTop ? "top" : "bottom"
        const inning = play.inningNum

        const away = play.score.start.away
        const home = play.score.start.home

        const scorePhrase =
            away === home ? `It's tied ${away}-${home}` :
            away > home ? `The visitors lead ${away}-${home}` :
            `The home team leads ${home}-${away}`

        const outs = play.count.start.outs
        const outsPhrase =
            outs === 0 ? "no outs" :
            outs === 1 ? "one out" :
            outs === 2 ? "two outs" :
            `${outs} outs`

        const outsSentence =
            outs === 1 ? `There's ${outsPhrase}` : `There are ${outsPhrase}`

        const runnersPhrase = (() => {
            const { first, second, third } = play.runner.result.start

            if (first && second && third) return "the bases loaded"
            if (first && second) return "runners on first and second"
            if (first && third) return "runners on first and third"
            if (second && third) return "runners on second and third"
            if (first) return "a runner on first"
            if (second) return "a runner on second"
            if (third) return "a runner on third"
            return "the bases empty"
        })()

        const inningOrd = ordinal(play.inningNum)

        const phrases = [
            () => `We move to the ${half} of the ${inningOrd}. ${scorePhrase}. ${outsSentence} and ${runnersPhrase}.`,
            () => `Now in the ${half} of the ${inningOrd}. ${scorePhrase}. ${outsSentence} with ${runnersPhrase}.`,
            () => `To the ${half} of the ${inningOrd} we go. ${scorePhrase}. ${outsSentence}; ${runnersPhrase}.`,
            () => `Here in the ${half} of the ${inningOrd}. ${scorePhrase}. ${outsSentence} and ${runnersPhrase}.`,
            () => `${half[0].toUpperCase() + half.slice(1)} ${inningOrd}. ${scorePhrase}. ${outsSentence} and ${runnersPhrase}.`
        ]

        descriptions.push({
            type: PlayDescriptionType.RECAP,
            text: pick(phrases, seed)()
        })

        return descriptions
    }

    getCurrentDescriptions(vm) : PlayDescription[] {

        let descriptions:PlayDescription[] = []

        let atBatState = this.getAtBatState(vm)
        let play = atBatState == AtBatState.ENDED ? this.getLastPlay(vm.game) : this.getCurrentPlay(vm.game)

        

        const isFirst = this.isFirstPlayOfHalfInning(vm.game, play)

        if (vm.game.halfInnings?.length == 0) {
            descriptions.push(...this.getGameStartDescriptions(vm.game))
        } else {
            descriptions.push(...this.getInningStartDescriptions(play))
        }

        if (play) {
            
            descriptions.push(...this.getPlayDescriptions(vm.game, play))

        }
        

        return descriptions

    }

    getPlayDescriptions(game, play:Play) {

        let descriptions = []

        let gamePlayers = this.gamePlayers(game)

        const hitter:GamePlayer =   Object.values(gamePlayers).find((p: GamePlayer) => p._id == play.hitterId) as GamePlayer

        descriptions.push({
            type: PlayDescriptionType.RECAP,
            text: this.getMatchupDescription(play, hitter)
        })


        /** pitches */

        const isBatterRunnerPrimaryEvent = (e: RunnerEvent) =>
            e.runner?._id === play.hitterId &&
            e.movement?.start === BaseResult.HOME

        let i=0
        for (let pitch of play.pitchLog.pitches) {

            descriptions.push({
                type: PlayDescriptionType.RECAP,
                text: this.getPitchDescription(pitch)
            })

            // Runner events that occurred on this pitch
            const runnerEvents = play.runner?.events?.filter(e => e.pitchIndex === i) ?? []

            for (const runnerEvent of runnerEvents) {

                // Prevent duplicate X is out. / X advances to 1B. for the hitter
                if (isBatterRunnerPrimaryEvent(runnerEvent)) continue

                const runnerText = this.getRunnerDescription(game, runnerEvent)
                if (runnerText) {
                    descriptions.push({
                    type: PlayDescriptionType.RECAP,
                    text: runnerText
                    })
                }

            }

            i++
        }
        /** pitches */


        let fielderPlayer: GamePlayer
        if (play.fielderId) {
            fielderPlayer = gamePlayers[play.fielderId]
        }


        descriptions.push(...this.getPlayResultDescription(play, hitter, fielderPlayer))

        
        descriptions.push(...this.getRunnerRecapDescription(game, play))


        let announcedScoreThisPlay = false

        //Runs?
        const runs = play.runner?.result?.end?.scored?.length ?? 0
        if (runs > 0) {
            descriptions.push({
                type: PlayDescriptionType.RECAP,
                text: runs === 1 ? "1 run scores." : `${runs} runs score.`
            })

            // announce score change immediately
            descriptions.push({
                type: PlayDescriptionType.RECAP,
                text: `The score is ${play.score.end.away} - ${play.score.end.home}.`
            })

            announcedScoreThisPlay = true
        }

        //End inning?
        if (play.runner?.result?.end?.out?.length > 0) {

            if (play.count.end.outs == 3) {

                descriptions.push({
                    type: PlayDescriptionType.RECAP,
                    text: `There's 3 outs and the inning is complete.`
                })

                if (this.isGameEndingPlay(game, play)) {

                    descriptions.push(...this.getGameRecapDescriptions(game, play))

                } else {

                    const half = play.inningTop ? "top" : "bottom"
                    const inning = play.inningNum

                    // Always announce inning-end score.
                    // If we already announced "The score is X - Y." on this play, use a different sentence here.
                    const inningEndScoreLine = announcedScoreThisPlay
                    ? `End of the ${half} of the ${ordinal(inning)}. It's ${play.score.end.away} - ${play.score.end.home}.`
                    : `We'll switch sides. The score is ${play.score.end.away} - ${play.score.end.home}.`


                    descriptions.push({ type: PlayDescriptionType.RECAP, text: inningEndScoreLine })

                }

            } else {

                descriptions.push({
                    type: PlayDescriptionType.RECAP,
                    text: `There ${this.getOutsPhrase(play.count.end.outs)}.`
                })

            }
        }


        let playMeta = {
            result: play.result,
            runner: play.runner.result.end,
            score: play.score.end
        }

        descriptions[descriptions.length - 1].meta = playMeta

        return descriptions
    }



    getPlayResultDescription(play: Play, hitter: GamePlayer, fielderPlayer?: GamePlayer) {

        const descriptions: PlayDescription[] = []

        const hash = (s: string) => {
            let h = 2166136261
            for (let i = 0; i < s.length; i++) {
                h ^= s.charCodeAt(i)
                h = Math.imul(h, 16777619)
            }
            return h >>> 0
        }

        const seed =
            (play?.index ?? 0) * 1009 +
            hash(String(play?.hitterId ?? "")) +
            hash(String(play?.pitcherId ?? "")) * 3 +
            hash(String(play?.fielderId ?? "")) * 7 +
            hash(String(play?.result ?? "")) * 11 +
            hash(String(play?.officialPlayResult ?? "")) * 13

        const pick = <T>(list: T[], n: number) => list[Math.abs(n) % list.length]

        const tidy = (s: string) => s.replace(/\s+/g, " ").trim()

        const hitterName = hitter?.fullName ?? "The batter"
        const fielderName = fielderPlayer?.fullName ?? "the fielder"

        const fielderPosNoun = play.fielder ? this.getPositionDescriptionNoun(play.fielder) : "fielder"
        const fielderPos = play.fielder ? this.getPositionDescription(play.fielder) : "field"

        // "in" sounds right for OF; "at" sounds right for IF/battery.
        const positionPrep = (pos?: Position) => {
            switch (pos) {
                case Position.LEFT_FIELD:
                case Position.CENTER_FIELD:
                case Position.RIGHT_FIELD:
                    return "in"
                default:
                    return "at"
            }
        }

        // --- Contact helpers (adjust the matching if your enum differs) ---
        const contactTypeRaw = (play as any)?.contact?.type ?? (play as any)?.contact

        const isGroundBall =
            contactTypeRaw === "GROUND_BALL" || contactTypeRaw === "GB" || contactTypeRaw === "GROUND" || contactTypeRaw === 0
        const isPopup =
            contactTypeRaw === "POPUP" || contactTypeRaw === "PU" || contactTypeRaw === "POP_FLY"
        const isLineDrive =
            contactTypeRaw === "LINE_DRIVE" || contactTypeRaw === "LD"
        const isFlyBall =
            contactTypeRaw === "FLY_BALL" || contactTypeRaw === "FB" || contactTypeRaw === "FLY"

        const isOutfieldTarget = this.isToOF(play.fielder)
        const sd = () => this.getShallowDeepDescription(play.shallowDeep)

        const rawContactDesc = () =>
            this.getContactDescription(play.contact, isOutfieldTarget, this.isHit(play.result))?.trim?.() ?? ""

        // For hits, convert contact type to a hit-safe adjective.
        const hitModifier = () => {
            if (isPopup) return "blooper"
            if (isLineDrive) return "line-drive"
            if (isGroundBall) return "ground-ball"
            if (isFlyBall) return "fly-ball"

            // fallback: if rawContactDesc is something like "hard-hit", keep it, but strip articles.
            let s = rawContactDesc()
            s = s.replace(/^(a|an)\s+/i, "")
            s = s.replace(/\s+ball$/i, "")
            s = tidy(s)
            return s
        }

        const contactOutDesc = () => this.getContactDescriptionOut(play.contact, isOutfieldTarget)

        // For hits, don’t say "into the first base". Only use OF locations with shallow/deep.
        const hitTarget = () => {
            if (isOutfieldTarget) return tidy(`to the ${sd()} ${fielderPos}`)
            // infield target: generic phrasing reads better than "to second base"
            if (isGroundBall) return "through the infield"
            return "past the infield"
        }

        const runner1bRA = play.runner?.events.find(re => re.movement.start == BaseResult.FIRST)
        const runner2bRA = play.runner?.events.find(re => re.movement.start == BaseResult.SECOND)
        const runner3bRA = play.runner?.events.find(re => re.movement.start == BaseResult.THIRD)

        const getLeadOutRunner = () => {
            if (runner3bRA?.movement?.isOut) return runner3bRA
            if (runner2bRA?.movement?.isOut) return runner2bRA
            if (runner1bRA?.movement?.isOut) return runner1bRA
            return undefined
        }

        // --- Result phrases ---
        const strikeoutPhrases = [
            () => `${hitterName} strikes out.`,
            () => `${hitterName} goes down on strikes for the strikeout.`,
            () => `Strike three. ${hitterName} strikes out.`
        ]

        const walkPhrases = [
            () => `${hitterName} draws a walk.`,
            () => `${hitterName} takes ball four for a walk.`,
            () => `Ball four. ${hitterName} reaches on a walk.`
        ]

        const hbpPhrases = [
            () => `${hitterName} gets hit by a pitch.`,
            () => `Hit by pitch. ${hitterName} takes first.`,
            () => `${hitterName} is clipped and will head to first base.`
        ]

        const outPhrases = [
            () => `${hitterName} ${contactOutDesc()} to ${fielderPosNoun} ${fielderName}.`,
            () => `${hitterName} ${contactOutDesc()} to ${fielderName} ${positionPrep(play.fielder)} ${fielderPos}.`,
            () => `${hitterName} ${contactOutDesc()} and ${fielderName} makes the play.`
        ].map(fn => () => tidy(fn()))

        // Singles: split grounders vs everything else
        const singleGrounderPhrases = [
            () => `${hitterName} chops a ground ball through the infield for a single.`,
            () => `${hitterName} bounces a grounder through the right side for a single.`,
            () => `${hitterName} hits a grounder that finds a hole for a single.`
        ]

        const singleOtherPhrases = [
            () => `${hitterName} hits a ${hitModifier()} single ${hitTarget()}.`,
            () => `${hitterName} lines a ${hitModifier()} single ${hitTarget()}.`,
            () => `${hitterName} drops a ${hitModifier()} single ${hitTarget()}.`
        ].map(fn => () => tidy(fn()))

        const doublePhrases = [
            () => `${hitterName} hits a ${hitModifier()} double ${hitTarget()}.`,
            () => `${hitterName} drives a ${hitModifier()} double ${hitTarget()}.`,
            () => `${hitterName} rips a ${hitModifier()} double ${hitTarget()}.`
        ].map(fn => () => tidy(fn()))

        const triplePhrases = [
            () => `${hitterName} hits a ${hitModifier()} triple ${hitTarget()}.`,
            () => `${hitterName} drives a ${hitModifier()} triple ${hitTarget()}.`,
            () => `${hitterName} legs out a ${hitModifier()} triple ${hitTarget()}.`
        ].map(fn => () => tidy(fn()))

        const hrPhrases = [
            () => `${hitterName} hits a home run.`,
            () => `${hitterName} launches a home run.`,
            () => `Home run for ${hitterName}.`
        ]

        const fcPhrases = [
            (outBase: string) =>
                `${hitterName} puts it in play to ${fielderPosNoun} ${fielderName}. The lead runner is out at ${outBase}. Fielder's choice.`,
            (outBase: string) =>
                `${hitterName} puts it on the ground to ${fielderPosNoun} ${fielderName}. The throw goes to ${outBase} for the out. Fielder's choice.`,
            (outBase: string) =>
                `${hitterName} ${contactOutDesc()} to ${fielderPosNoun} ${fielderName}. They get the lead runner at ${outBase}. Fielder's choice.`
        ].map(fn => (outBase: string) => tidy(fn(outBase)))

        const gidpPhrases = [
            (outBase: string) =>
                `${hitterName} ${contactOutDesc()} to ${fielderPosNoun} ${fielderName}. Throw to ${outBase} for one, relay to first for the double play.`,
            (outBase: string) =>
                `${hitterName} rolls it to ${fielderPosNoun} ${fielderName}. ${outBase} gets the lead runner, and the relay completes the double play.`,
            (outBase: string) =>
                `${hitterName} ${contactOutDesc()} and it's turned. Out at ${outBase}, and the double play to first.`
        ].map(fn => (outBase: string) => tidy(fn(outBase)))

        switch (play.result) {
            case PlayResult.STRIKEOUT:
                descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(strikeoutPhrases, seed)() })
                break

            case PlayResult.BB:
                descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(walkPhrases, seed)() })
                break

            case PlayResult.HIT_BY_PITCH:
                descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(hbpPhrases, seed)() })
                break

            case PlayResult.OUT: {
                const lead = getLeadOutRunner()
                const outBase = lead?.movement?.outBase

                if (play.officialPlayResult == OfficialPlayResult.FIELDERS_CHOICE && outBase) {
                    descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(fcPhrases, seed)(outBase) })
                } else if (play.officialPlayResult == OfficialPlayResult.GROUNDED_INTO_DP && outBase) {
                    descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(gidpPhrases, seed)(outBase) })
                } else {
                    descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(outPhrases, seed)() })
                }
                break
            }

            case PlayResult.SINGLE: {
                const phrases = isGroundBall ? singleGrounderPhrases : singleOtherPhrases
                descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(phrases, seed)() })
                break
            }

            case PlayResult.DOUBLE:
                descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(doublePhrases, seed)() })
                break

            case PlayResult.TRIPLE:
                descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(triplePhrases, seed)() })
                break

            case PlayResult.HR:
                descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(hrPhrases, seed)() })
                break
        }

        // Final tidy pass (safety)
        for (const d of descriptions) d.text = tidy(d.text)

        
        return descriptions
    }

    getMatchupDescription(play: Play, hitter: GamePlayer): string {

        const hitterName = hitter?.fullName ?? "The batter"

        const outs = play.count.start.outs
        const outsPhrase =
            outs === 0 ? "no outs" :
            outs === 1 ? "one out" :
            outs === 2 ? "two outs" :
            `${outs} outs`

        const outsSentence =
            outs === 1 ? `There's ${outsPhrase}` : `There are ${outsPhrase}`

        const runnersPhrase = (() => {
            const { first, second, third } = play.runner.result.start
            if (first && second && third) return "the bases loaded"
            if (first && second) return "runners on first and second"
            if (first && third) return "runners on first and third"
            if (second && third) return "runners on second and third"
            if (first) return "a runner on first"
            if (second) return "a runner on second"
            if (third) return "a runner on third"
            return "the bases empty"
        })()

        return `That will bring up ${hitterName}. ${outsSentence} and ${runnersPhrase}.`
    }

    getPitchDescription(pitch: Pitch): string {

        const pitchTypePhrases = [
            this.playerWebService.getPitchTypeFull(pitch.type).toLowerCase(),
        ]

        const introPhrases = ["Here comes a", "Now a", "The pitch is a"]

        const strikeTakePhrases = ["Taken for a strike", "Called a strike", "Strike called"]

        // IMPORTANT: no "outside" unless it's actually a BALL
        const ballTakePhrases = ["Taken for a ball", "Ball", "Just misses"]

        const swingMissPhrases = ["The batter swings and misses", "The batter comes up empty", "The batter swings through it"]

        const chaseMissPhrases = [
            "The batter chases and misses",
            "The batter goes after it and misses",
            "The batter swings at a pitch out of the zone and misses",
        ]

        const foulPhrases = ["The batter fouls it straight back", "The batter snaps it foul", "Fouled straight back"]

        const inPlayPhrases = ["The batter puts it in play", "The batter swings and puts it in play", "Contact made, ball in play"]

        const wildPitchPhrases = ["It skips past the catcher for a wild pitch", "That one gets away for a wild pitch"]

        const passedBallPhrases = ["It gets away from the catcher", "Passed ball"]

        const hbpPhrases = ["The batter is hit by the pitch", "Hit by pitch"]

        const countPhrases = [
        (c: Count) => `The count is ${c.balls}-${c.strikes}`,
        (c: Count) => `Now ${c.balls}-${c.strikes}`
        ]

        const seed =
            (pitch.quality ?? 0) +
            (Number(pitch.type) || 0) * 7 +
            (pitch.actualZone ? pitch.actualZone.length : 0) * 13 +
            (pitch.locQ ? Math.floor(pitch.locQ) : 0)

        const pick = <T>(list: T[], n: number): T => list[Math.abs(n) % list.length]

        // "Where it crossed" (neutral, doesn't imply strike/ball)
        const describeZoneNeutral = (zone: PitchZone): string => {
            const [vertical, horizontal] = zone.split("_")

            const v = vertical === "LOW" ? "low" : vertical === "MID" ? "middle" : "high"

            const h =
            horizontal === "AWAY" ? "away" :
            horizontal === "MIDDLE" ? "over the plate" :
            "inside"

            return h === "over the plate" ? `${v} ${h}` : `${v} and ${h}`
        }

        const describeZoneOffPlate = (zone: PitchZone): string => {
            const [vertical, horizontal] = zone.split("_")

            const v =
                vertical === "LOW" ? "low" :
                vertical === "MID" ? "just off the plate" :
                "high"

            // Better “miss” language: corner/edge instead of “inside/away”
            const h =
                horizontal === "AWAY" ? "the outside corner" :
                horizontal === "INSIDE" ? "the inside corner" :
                "the plate"

            // MID_MIDDLE as a ball: keep it clean and non-contradictory
            if (vertical === "MID" && horizontal === "MIDDLE") return "just off the plate"

            // Examples:
            // LOW_INSIDE  => "low, just off the inside corner"
            // MID_AWAY    => "just off the outside corner"
            // HIGH_MIDDLE => "high, just off the plate"
            if (vertical === "MID") {
                return `just off ${h}`
            }

            if (horizontal === "MIDDLE") {
                return `${v}, just off the plate`
            }

            return `${v}, just off ${h}`
        }


        const getCountSentence = (): string => {
            if (!pitch.count) return ""

            const rawBalls = pitch.count.balls ?? 0
            const rawStrikes = pitch.count.strikes ?? 0

            if (rawBalls >= 4) return "Ball four."

            const spoken: Count = {
            balls: Math.min(rawBalls, 3),
            strikes: Math.min(rawStrikes, 2),
            outs: pitch.count.outs,
            }

            return pick(countPhrases, seed + 19)(spoken) + "."
        }

        const pitchTypeText = pick(pitchTypePhrases, seed)
        const introText = pick(introPhrases, seed + 3)

        // Location sentence is now RESULT-AWARE:
        // - STRIKE/FOUL/IN_PLAY/etc => neutral zone location
        // - BALL => "off the plate" style location
        const zoneText =
            pitch.result === PitchResult.BALL
            ? describeZoneOffPlate(pitch.actualZone)
            : describeZoneNeutral(pitch.actualZone)

        const locationSentence = `${introText} ${pitchTypeText} ${zoneText}.`

        let outcomeSentence = ""

        if (pitch.isWP) {
            outcomeSentence = pick(wildPitchPhrases, seed + 7)
        } else if (pitch.isPB) {
            outcomeSentence = pick(passedBallPhrases, seed + 7)
        } else {
            switch (pitch.result) {
            case PitchResult.IN_PLAY:
                outcomeSentence = pick(inPlayPhrases, seed + 9)
                break

            case PitchResult.FOUL:
                outcomeSentence = pick(foulPhrases, seed + 9)
                break

            case PitchResult.HBP:
                outcomeSentence = pick(hbpPhrases, seed + 9)
                break

            case PitchResult.STRIKE:
                outcomeSentence = pitch.swing ? pick(swingMissPhrases, seed + 11) : pick(strikeTakePhrases, seed + 11)
                break

            case PitchResult.BALL: {
                if (!pitch.swing) {
                outcomeSentence = pick(ballTakePhrases, seed + 11)
                break
                }
                // On a swing+ball, always treat it as a chase (since it IS a ball)
                outcomeSentence = pick(chaseMissPhrases, seed + 13)
                break
            }
            }
        }

        const isFinalStrikeoutPitch = pitch.result === PitchResult.STRIKE && (pitch.count?.strikes ?? 0) >= 2
        const isFinalWalkPitch = pitch.result === PitchResult.BALL && (pitch.count?.balls ?? 0) >= 3

        const includeCount =
            !!pitch.count &&
            !isFinalStrikeoutPitch &&
            !isFinalWalkPitch &&
            pitch.result !== PitchResult.IN_PLAY &&
            pitch.result !== PitchResult.HBP

        const countSentence = includeCount ? getCountSentence() : ""

        return [locationSentence, outcomeSentence ? outcomeSentence + "." : "", countSentence].filter(Boolean).join(" ")
    }

    getRunnerRecapDescription(game, play: Play): PlayDescription[] {
    const descriptions: PlayDescription[] = []
    const events = play.runner?.events ?? []
    if (!events.length) return descriptions

    const pitchCount = play.pitchLog?.pitches?.length ?? 0

    const isBatterRunnerPrimaryEvent = (e: RunnerEvent) =>
        e.runner?._id === play.hitterId &&
        e.movement?.start === BaseResult.HOME

    // If you printed runner events inline per pitchIndex, then ONLY recap
    // events that can't be tied to a pitch in this at-bat.
    const wasPrintedInline = (e: RunnerEvent) =>
        typeof e.pitchIndex === "number" &&
        e.pitchIndex >= 0 &&
        e.pitchIndex < pitchCount

    for (const e of events) {
        if (isBatterRunnerPrimaryEvent(e)) continue
        if (wasPrintedInline(e)) continue

        const text = this.getRunnerDescription(game, e)
        if (!text) continue

        // IMPORTANT: getRunnerDescription() already includes the runner name
        descriptions.push({
        type: PlayDescriptionType.RECAP,
        text
        })
    }

    return descriptions
    }

    getRunnerDescription(game, runnerEvent: RunnerEvent) {

        const gamePlayers = this.gamePlayers(game)

        const runner = runnerEvent.runner?._id ? gamePlayers[runnerEvent.runner._id] : null
        const runnerName = runner ? runner.fullName : "A runner"

        const thrower = runnerEvent.throw?.from?._id
            ? gamePlayers[runnerEvent.throw.from._id]
            : null;

        const outBase = runnerEvent.movement?.outBase ?? runnerEvent.movement?.end
        const start = runnerEvent.movement?.start
        const end = runnerEvent.movement?.end

        if (runnerEvent.movement?.isOut) {
            if (thrower) {

                if (runnerEvent.isSBAttempt) {
                    return `${runnerName} is caught stealing at ${outBase} on the throw from the ${this.getPositionDescriptionNoun(runnerEvent.throw.from.position)} ${thrower.fullName}.`
                }
                return `${runnerName} is out at ${outBase} on the throw from the ${this.getPositionDescriptionNoun(runnerEvent.throw.from.position)} ${thrower.fullName}.`
            }

            return `${runnerName} is out.`
        }

        // not out
        if (end === BaseResult.HOME) {
            return `${runnerName} scores from ${start}${runnerEvent.isError ? ` [Error]` : ""}.`
        }

        if (runnerEvent.isSBAttempt) {
            if (thrower) {
                return `${runnerName} steals ${end} with a throw from the ${this.getPositionDescriptionNoun(runnerEvent.throw.from.position)} ${thrower.fullName}.`
            }

            return `${runnerName} steals ${end}.`
        }

        if (runnerEvent.isPB) return `${runnerName} moves to ${end} on a passed ball.`
        if (runnerEvent.isWP) return `${runnerName} moves to ${end} on a wild pitch.`

        if (
            runnerEvent.eventType == OfficialRunnerResult.TAGGED_FIRST_TO_SECOND ||
            runnerEvent.eventType == OfficialRunnerResult.TAGGED_SECOND_TO_THIRD ||
            runnerEvent.eventType == OfficialRunnerResult.TAGGED_THIRD_TO_HOME
        ) {
            return `${runnerName} tags up and advances to ${end} from ${start}.`;
        }

        // generic advance
        return `${runnerName} advances to ${end}${runnerEvent.isError ? ` [Error]` : ""}.`;
    }


    getShallowDeepDescription(shallowDeep: ShallowDeep) {
        if (shallowDeep == ShallowDeep.NORMAL || !shallowDeep) return ""
        return shallowDeep.toLowerCase()
    }

    getContactDescription(contact: Contact, isOutfieldTarget: boolean, isHit: boolean) {

        switch (contact) {
            case Contact.FLY_BALL:
                // popup vs fly ball (or “deep fly” if you want)
                return isOutfieldTarget ? "a fly ball" : "a popup"

            case Contact.GROUNDBALL:
                return isHit ? "a ground ball" : "a grounder"

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

    getPlayByPlay(game) {

        let halfInnings = JSON.parse(JSON.stringify(game.halfInnings))

        halfInnings.reverse()

        let results = []

        for (let hi of halfInnings) {

            let plays = JSON.parse(JSON.stringify(hi.plays))
            plays.reverse()

            for (let play of plays) {
                results.push({
                    descriptions: this.getPlayDescriptions(game, play),
                    play: play
                })
            }

        }

        return results

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

        let ratings

        if (hitterHandedness == Handedness.R) {
            ratings =  Object.assign({ power: pitcher.pitchRatings.power}, pitcher.pitchRatings.vsR)
        } else {
            ratings = Object.assign({ power: pitcher.pitchRatings.power}, pitcher.pitchRatings.vsL)
        }

        return ratings

    }

    pitcherRatings(pitchRatings) {

        return `POW ${pitchRatings.power.toFixed(0) }, CON ${ pitchRatings.control.toFixed(0) }, MOV ${ pitchRatings.movement.toFixed(0) }`
    }

    hitterRatings(hitterRatings) {
        return `CON ${hitterRatings.contact.toFixed(0)}, GAP ${hitterRatings.gapPower.toFixed(0)}, HR ${hitterRatings.homerunPower.toFixed(0)}, EYE ${hitterRatings.plateDiscipline.toFixed(0)}`
    }

    pitcherGameStats(pitcher) {

        return `
        ${pitcher.pitchResult.ip} IP, 
        ${pitcher.pitchResult.er} ER, ${pitcher.pitchResult.so} K, ${pitcher.pitchResult.bb} BB, ${pitcher.pitchResult.pitches} PC`

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

    getPctPos(el: HTMLElement, container: HTMLElement): PointPct {
        const r = el.getBoundingClientRect()
        const c = container.getBoundingClientRect()

        return {
            top: ((r.top - c.top) / c.height) * 100,
            right: ((c.right - r.right) / c.width) * 100
        }
    }

    getBaseCoords(base: string): PointPct {
        const isMobile = window.matchMedia('(max-width: 1024px)').matches
        const map = isMobile ? BASE_POSITIONS_MOBILE : BASE_POSITIONS_DESKTOP
        return map[base] || map.home
    }

    findRunnerByStartBase(base: string): HTMLElement | null {
        if (base === 'home') return document.querySelector('.game-info .runner.hitter')
        if (base === '1B') return document.querySelector('.game-info .runner.firstBase')
        if (base === '2B') return document.querySelector('.game-info .runner.secondBase')
        if (base === '3B') return document.querySelector('.game-info .runner.thirdBase')
        return null
    }

    getBasePath(start: string, end: string): string[] {
        const s = BASE_ORDER.indexOf(start)
        const e = BASE_ORDER.indexOf(end)

        if (s === -1 || e === -1) return []

        // no movement
        if (s === e) return [start]

        // forward movement: home → 1B → 2B → 3B → home
        if (s < e) return BASE_ORDER.slice(s, e + 1)

        // scoring special case: 3B → home
        if (start === '3B' && end === 'home') return ['3B','home']

        // fallback: direct
        return [start, end]
    }

    async moveElPct(el: HTMLElement, from: PointPct, to: PointPct, durationMs: number) {
    const dx = to.right - from.right
    const dy = to.top - from.top
    const dist = Math.hypot(dx, dy)

    if (!dist) {
        el.style.top = `${to.top}%`
        el.style.right = `${to.right}%`
        return
    }

    const ux = dx / dist
    const uy = dy / dist
    const speed = dist / (durationMs / 1000)
    const start = performance.now()

    await new Promise(resolve => {
        const frame = now => {
        const t = (now - start) / 1000
        const travelled = Math.min(t * speed, dist)

        el.style.top = `${from.top + uy * travelled}%`
        el.style.right = `${from.right + ux * travelled}%`

        if (travelled < dist) requestAnimationFrame(frame)
        else resolve(null)
        }
        requestAnimationFrame(frame)
    })
    }


    async animatePath(el: HTMLElement, container: HTMLElement, bases: string[]) {
        for (let i = 0; i < bases.length - 1; i++) {
            const fromBase = bases[i]
            const toBase = bases[i + 1]

            const from = i === 0
            ? this.getPctPos(el, container)
            : this.getBaseCoords(fromBase)

            const to = this.getBaseCoords(toBase)

            await this.moveElPct(el, from, to, 1000)
        }
    }

    animateRunnersForPlay(play: Play) {

        const container = document.querySelector('.game-info') as HTMLElement
        if (!container) return

        const events = play.runner?.events || []

        events.forEach(async ev => {
            
            const m = ev.movement
            if (!m) return

            // find the runner element based on where they STARTED this play
            const el = this.findRunnerByStartBase(m.start)
            if (!el) return

            const bases = this.getBasePath(m.start, m.end)
            if (bases.length < 2) return

            await this.animatePath(el, container, bases)

            // -------------------------------
            // ⭐ OUT POPUP GOES EXACTLY HERE ⭐
            // The runner has just reached the base where they were thrown out.
            // Show your "Runner is out!" message here.
            // Example:
            //
            // if (m.isOut) this.socketWebService.showOutMessage(ev.runner?._id)
            //
            // -------------------------------

        })
    }

    useDarkFont(bgColor) {

        const hex = (bgColor || '')
            .replace('#', '')
            .toLowerCase()

        if (!/^[0-9a-f]{6}$/.test(hex)) return false

        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255

        const toLinear = c =>
            c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

        const luminance =
            0.2126 * toLinear(r) +
            0.7152 * toLinear(g) +
            0.0722 * toLinear(b)

        const contrastBlack = (luminance + 0.05) / 0.05
        const contrastWhite = 1.05 / (luminance + 0.05)

        return contrastBlack >= contrastWhite

    }

    getAtBatState(vm) : AtBatState {

      let lastPlay = this.getLastPlay(vm.game)
      let currentPlay = this.getCurrentPlay(vm.game)

      let lastPlayEnded = lastPlay?.result != undefined
      let currentPlayEnded = currentPlay?.result != undefined
      let currentPlayHasPitches = currentPlay?.pitchLog?.pitches?.length > 0
    //   let halfInningStart = vm.game.halfInnings[vm.game.halfInnings?.length - 1]?.plays?.length == 0

      //At bat just started. No pitches.
      if ( currentPlay && !currentPlayHasPitches && !currentPlayEnded  ) {
        return AtBatState.STARTED
      //At bat ongoing.
      } else if (   currentPlay && currentPlayHasPitches && !currentPlayEnded   ) {
        return AtBatState.ONGOING

      //At bat just ended.
      } else if (lastPlayEnded && !currentPlay) {
        return AtBatState.ENDED
      } 
    }



    getMessagesFromPlayDescriptions(descriptions) {
        
        return descriptions?.map( d => {  return { text: d.text, type: "received", name: "Gamelog" } })

    }


}

interface PlayDescription {
    text: string,
    type: PlayDescriptionType
    meta?: PlayDescriptionMeta
}


interface PlayDescriptionMeta {
  result?: PlayResult

  runner?: RunnerResult

  score?: Score
}


enum PlayDescriptionType {
    RESULT = "RESULT",
    RUNNER = "RUNNER", 
    DEFENSE = "DEFENSE", 
    RECAP = "RECAP"
}

enum AtBatState {
    STARTED,
    ONGOING,
    ENDED
}

type PointPct = { top: number, right: number }

const BASE_POSITIONS_DESKTOP = {
  home:   { top: 81.5, right: 55.7 },
  '1B':   { top: 60.0, right: 24.0 },
  '2B':   { top: 36.5, right: 42.0 },
  '3B':   { top: 59.0, right: 59.5 }
}

const BASE_POSITIONS_MOBILE = {
  home:   { top: 81.0, right: 57.0 },
  '1B':   { top: 59.0, right: 24.0 },
  '2B':   { top: 25.0, right: 42.0 },
  '3B':   { top: 59.0, right: 59.0 }
}

const BASE_ORDER = ['home','1B','2B','3B','home']

function ordinal(n: number): string {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

export {
    GameWebService, AtBatState
}


