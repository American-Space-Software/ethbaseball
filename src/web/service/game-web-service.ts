import { inject, injectable } from "inversify";
import axios from "axios"
import { BaseResult, Contact, Count, GamePlayer, Handedness, MatchupHandedness, OfficialPlayResult, OfficialRunnerResult, Pitch, PitchResult, PitchZone, Play, PlayResult, Position, RunnerEvent, RunnerResult, ShallowDeep, ThrowResult } from "../../service/enums.js";
import dayjs from "dayjs";
import { Game } from "../../dto/game.js";

import { SocketWebService } from "./socket-web-service.js";
import { PlayerWebService } from "./player-web-service.js";


@injectable()
class GameWebService {
    
    constructor(
        private socketWebService: SocketWebService,
        private playerWebService:PlayerWebService,
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

        let linescore = this.getLineScore(game)
        let playByPlay = this.getPlayByPlay(game)

        let lastPlay = playByPlay?.length > 0 ?  playByPlay.find( p => p.play.result != undefined) : undefined
        let currentPlay = playByPlay?.length > 0 ?  playByPlay.find( p => !p.play.result) : undefined

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
                wpa: lastPlay?.play?.wpa
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

                lastPlay: lastPlay,
                currentPlay: currentPlay,

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
                    descriptions: this.getPlayDescriptions(game, play),
                    play: play
                })
            }

        }

        return results

    }

    getPlayDescriptions(game, play: Play) : PlayDescription[] {

        let descriptions:PlayDescription[] = []


        // let defense = this.getDefense(game)

        let gamePlayers = this.gamePlayers(game)

        let hitter: GamePlayer = gamePlayers[play.hitterId]
        let pitcher = gamePlayers[play.pitcherId]

        descriptions.push({
            type: PlayDescriptionType.RECAP,
            text: this.getMatchupDescription(game, play)
        })

        for (let pitch of play.pitchLog.pitches) {
            descriptions.push( { type: PlayDescriptionType.RECAP, text: this.getPitchDescription(pitch) })
        }


        let fielderPlayer: GamePlayer
        if (play.fielderId) {
            fielderPlayer = gamePlayers[play.fielderId]
        }


        descriptions.push(...this.getPlayResultDescription(play, hitter, fielderPlayer))

        //Runs?
        if (play.runner?.result?.end?.scored?.length > 0) {
            descriptions.push({ type: PlayDescriptionType.RECAP, text: `${play.runner.result.end.scored?.length} runs score.`})
            descriptions.push({ type: PlayDescriptionType.RECAP, text: `The score is ${play.score.end.away} - ${play.score.end.home}.`})
        }

        //End inning?
        if (play.runner?.result?.end?.out?.length > 0) {

            if (play.count.end.outs == 3) {
                descriptions.push({ type: PlayDescriptionType.RECAP, text: `There's 3 outs and the inning is complete.`})
            } else {
                descriptions.push({ type: PlayDescriptionType.RECAP, text: `There ${this.getOutsPhrase(play.count.end.outs)}.`})
            }

        }

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

        const hitterName = hitter?.fullName ?? "The batter"
        const fielderName = fielderPlayer?.fullName ?? "the fielder"
        const fielderPosNoun = play.fielder ? this.getPositionDescriptionNoun(play.fielder) : "fielder"
        const fielderPos = play.fielder ? this.getPositionDescription(play.fielder) : "field"

        const contactDesc = () =>
            this.getContactDescription(play.contact, this.isToOF(play.fielder), this.isHit(play.result))
        const contactOutDesc = () => this.getContactDescriptionOut(play.contact, this.isToOF(play.fielder))

        const runner1bRA = play.runner?.events.find(re => re.movement.start == BaseResult.FIRST)
        const runner2bRA = play.runner?.events.find(re => re.movement.start == BaseResult.SECOND)
        const runner3bRA = play.runner?.events.find(re => re.movement.start == BaseResult.THIRD)

        const getLeadOutRunner = () => {
            if (runner3bRA?.movement?.isOut) return runner3bRA
            if (runner2bRA?.movement?.isOut) return runner2bRA
            if (runner1bRA?.movement?.isOut) return runner1bRA
            return undefined
        }

        // --- Contact helpers (adjust the matching if your enum differs) ---
        const contactType = (play as any)?.contact?.type ?? (play as any)?.contact
        const isGroundBall =
            contactType === "GROUND_BALL" || contactType === "GB" || contactType === "GROUND" || contactType === 0

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
            () => `${hitterName} ${contactOutDesc()} to ${fielderName} at ${fielderPosNoun}.`,
            () => `${hitterName} ${contactOutDesc()} and ${fielderName} makes the play.`
        ]

        // Singles: split grounders vs everything else to avoid “drops a ground ball…” (bunt-y wording)
        const singleGrounderPhrases = [
            () => `${hitterName} chops ${contactDesc()} ground ball through the infield for a single.`,
            () => `${hitterName} bounces ${contactDesc()} grounder through the right side for a single.`,
            () => `${hitterName} ${contactDesc()} grounder finds a hole for a single.`
        ]

        const singleOtherPhrases = [
            () => `${hitterName} hits ${contactDesc()} single to ${this.getShallowDeepDescription(play.shallowDeep)} ${fielderPos}.`,
            () => `${hitterName} lines ${contactDesc()} single into the ${this.getShallowDeepDescription(play.shallowDeep)} ${fielderPos}.`,
            () => `${hitterName} drops ${contactDesc()} single into the ${this.getShallowDeepDescription(play.shallowDeep)} ${fielderPos}.`
        ]

        const doublePhrases = [
            () => `${hitterName} hits ${contactDesc()} double to the ${this.getShallowDeepDescription(play.shallowDeep)} ${fielderPos}.`,
            () => `${hitterName} drives ${contactDesc()} double into the ${this.getShallowDeepDescription(play.shallowDeep)} ${fielderPos}.`,
            () => `${hitterName} rips ${contactDesc()} double to the ${this.getShallowDeepDescription(play.shallowDeep)} ${fielderPos}.`
        ]

        const triplePhrases = [
            () => `${hitterName} hits ${contactDesc()} triple to the ${this.getShallowDeepDescription(play.shallowDeep)} ${fielderPos}.`,
            () => `${hitterName} drives ${contactDesc()} triple into the ${this.getShallowDeepDescription(play.shallowDeep)} ${fielderPos}.`,
            () => `${hitterName} legs out a ${contactDesc()} triple to the ${this.getShallowDeepDescription(play.shallowDeep)} ${fielderPos}.`
        ]

        const hrPhrases = [
            () => `${hitterName} hits a home run.`,
            () => `${hitterName} launches a home run.`,
            () => `Home run for ${hitterName}.`
        ]

        const fieldedPhrases = [
            () => `The ball is fielded by ${fielderName}.`,
            () => `${fielderName} fields it cleanly.`,
            () => `${fielderName} is there to field it.`
        ]

        const fcPhrases = [
            (outBase: string) =>
                `${hitterName} hits ${this.getContactDescription(play.contact, this.isToOF(play.fielder), false)} to ${fielderPosNoun} ${fielderName}. The lead runner is out at ${outBase}. Fielder's choice.`,
            (outBase: string) =>
                `${hitterName} puts it on the ground to ${fielderPosNoun} ${fielderName}. The throw goes to ${outBase} for the out. Fielder's choice.`,
            (outBase: string) =>
                `${hitterName} ${contactOutDesc()} to ${fielderPosNoun} ${fielderName}. They get the lead runner at ${outBase}. Fielder's choice.`
        ]

        const gidpPhrases = [
            (outBase: string) =>
                `${hitterName} ${contactOutDesc()} to ${fielderPosNoun} ${fielderName}. Throw to ${outBase} for one, relay to first for the double play.`,
            (outBase: string) =>
                `${hitterName} rolls it to ${fielderPosNoun} ${fielderName}. ${outBase} gets the lead runner, and the relay completes the double play.`,
            (outBase: string) =>
                `${hitterName} ${contactOutDesc()} and it's turned. Out at ${outBase}, and the double play to first.`
        ]

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
                if (fielderPlayer) descriptions.push({ type: PlayDescriptionType.RECAP, text: pick(fieldedPhrases, seed + 3)() })
                break
            }

            case PlayResult.DOUBLE:
                descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(doublePhrases, seed)() })
                if (fielderPlayer) descriptions.push({ type: PlayDescriptionType.RECAP, text: pick(fieldedPhrases, seed + 3)() })
                break

            case PlayResult.TRIPLE:
                descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(triplePhrases, seed)() })
                if (fielderPlayer) descriptions.push({ type: PlayDescriptionType.RECAP, text: pick(fieldedPhrases, seed + 3)() })
                break

            case PlayResult.HR:
                descriptions.push({ type: PlayDescriptionType.RESULT, text: pick(hrPhrases, seed)() })
                break
        }

        return descriptions
    }


    getMatchupDescription(game, play: Play): string {
        const gamePlayers = this.gamePlayers(game)
        const hitter: GamePlayer = gamePlayers[play.hitterId]

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

        return `That will bring up ${hitter.fullName}. ${outsSentence} and ${runnersPhrase}.`
    }

    getPitchDescription(pitch: Pitch): string {
        const pitchTypePhrases = [
            this.playerWebService.getPitchTypeFull(pitch.type).toLowerCase()
        ]

        const introPhrases = [
            "Here comes a",
            "Now a",
            "The pitch is a"
        ]

        const strikeTakePhrases = [
            "Taken for a strike",
            "Called a strike",
            "Strike called"
        ]

        const ballTakePhrases = [
            "Taken for a ball",
            "Just misses for a ball",
            "Outside for a ball"
        ]

        const swingMissPhrases = [
            "The batter swings and misses",
            "The batter comes up empty",
            "The batter swings through it"
        ]

        const chaseMissPhrases = [
            "The batter chases and misses",
            "The batter goes after it and misses",
            "The batter swings at a pitch out of the zone and misses"
        ]

        const foulPhrases = [
            "The batter fouls it straight back",
            "The batter snaps it foul",
            "Fouled straight back"
        ]

        const inPlayPhrases = [
            "The batter puts it in play",
            "The batter swings and puts it in play",
            "Contact made, ball in play"
        ]

        const wildPitchPhrases = [
            "It skips past the catcher for a wild pitch",
            "That one gets away for a wild pitch"
        ]

        const passedBallPhrases = [
            "It gets away from the catcher",
            "Passed ball"
        ]

        const hbpPhrases = [
            "The batter is hit by the pitch",
            "Hit by pitch"
        ]

        const countPhrases = [
            (c: Count) => `The count is ${c.balls}-${c.strikes}`,
            (c: Count) => `It's ${c.balls} and ${c.strikes}`,
            (c: Count) => `Now ${c.balls}-${c.strikes}`
        ]

        const seed =
            (pitch.quality ?? 0) +
            (Number(pitch.type) || 0) * 7 +
            (pitch.intentZone ? pitch.intentZone.length : 0) * 11 +
            (pitch.actualZone ? pitch.actualZone.length : 0) * 13 +
            (pitch.locQ ? Math.floor(pitch.locQ) : 0)

        const pick = <T>(list: T[], n: number): T => list[Math.abs(n) % list.length]

        const describeZone = (zone: PitchZone): string => {
            const [vertical, horizontal] = zone.split("_")

            const v =
                vertical === "LOW" ? "low" :
                    vertical === "MID" ? "middle" :
                        "high"

            const h =
                horizontal === "AWAY" ? "away" :
                    horizontal === "MIDDLE" ? "over the plate" :
                        "inside"

            return h === "over the plate"
                ? `${v} ${h}`
                : `${v} and ${h}`
        }

        const isProbablyInZone = (z: PitchZone) =>
            z.endsWith("MIDDLE") || z.startsWith("MID_")

        const getCountSentence = (): string => {
            if (!pitch.count) return ""

            const rawBalls = pitch.count.balls ?? 0
            const rawStrikes = pitch.count.strikes ?? 0

            if (rawBalls >= 4) return "Ball four."

            const spoken: Count = {
                balls: Math.min(rawBalls, 3),
                strikes: Math.min(rawStrikes, 2),
                outs: pitch.count.outs
            }

            return pick(countPhrases, seed + 19)(spoken) + "."
        }

        const pitchTypeText = pick(pitchTypePhrases, seed)
        const introText = pick(introPhrases, seed + 3)

        let locationSentence = ""
        if (pitch.intentZone === pitch.actualZone) {
            locationSentence = `${introText} ${pitchTypeText} ${describeZone(pitch.actualZone)}.`
        } else {
            const intent = describeZone(pitch.intentZone)
            const actual = describeZone(pitch.actualZone)

            const missVerbs = [
                "misses",
                "leaks",
                "drifts",
                "runs"
            ]

            locationSentence = `${introText} ${pitchTypeText} ${intent}, ${pick(missVerbs, seed + 5)} ${actual}.`
        }

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
                    outcomeSentence = pitch.swing
                        ? pick(swingMissPhrases, seed + 11)
                        : pick(strikeTakePhrases, seed + 11)
                    break

                case PitchResult.BALL: {
                    if (!pitch.swing) {
                        outcomeSentence = pick(ballTakePhrases, seed + 11)
                        break
                    }

                    const chase = !isProbablyInZone(pitch.actualZone)
                    outcomeSentence = chase
                        ? pick(chaseMissPhrases, seed + 13)
                        : pick(swingMissPhrases, seed + 13)
                    break
                }
            }
        }

        const isFinalStrikeoutPitch =
        pitch.result === PitchResult.STRIKE &&
        (pitch.count?.strikes ?? 0) >= 2

        const isFinalWalkPitch =
        pitch.result === PitchResult.BALL &&
        (pitch.count?.balls ?? 0) >= 3

        const includeCount =
        !!pitch.count &&
        !isFinalStrikeoutPitch &&
        !isFinalWalkPitch &&
        pitch.result !== PitchResult.IN_PLAY &&
        pitch.result !== PitchResult.HBP

        const countSentence = includeCount ? getCountSentence() : ""

        return [
            locationSentence,
            outcomeSentence ? outcomeSentence + "." : "",
            countSentence
        ]
            .filter(Boolean)
            .join(" ")
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

    //from https://stackoverflow.com/questions/3942878/how-to-decide-font-color-in-white-or-black-depending-on-background-color
    useDarkFont(bgColor) {

        const hexCode = bgColor.charAt(0) === '#' 
                            ? bgColor.substr(1, 6)
                            : bgColor;

        const hexR = parseInt(hexCode.substr(0, 2), 16)
        const hexG = parseInt(hexCode.substr(2, 2), 16)
        const hexB = parseInt(hexCode.substr(4, 2), 16)
        // Gets the average value of the colors
        const contrastRatio = (hexR + hexG + hexB) / (255 * 3)

        return contrastRatio >= 0.5

    }

    getAtBatState(vm) : AtBatState {

      let lastPlayEnded = vm.lastPlay?.play?.result != undefined
      let currentPlayEnded = vm.currentPlay?.play?.result != undefined
      let currentPlayHasPitches = vm.currentPlay?.play?.pitchLog?.pitches?.length > 0
    //   let halfInningStart = vm.game.halfInnings[vm.game.halfInnings?.length - 1]?.plays?.length == 0

      //At bat just started. No pitches.
      if ( vm.currentPlay && !currentPlayHasPitches && !currentPlayEnded  ) {
        return AtBatState.STARTED
      //At bat ongoing.
      } else if (   vm.currentPlay && currentPlayHasPitches && !currentPlayEnded   ) {
        return AtBatState.ONGOING

      //At bat just ended.
      } else if (lastPlayEnded && !vm.currentPlay) {
        return AtBatState.ENDED
      } 
    }

    getMessagesFromPlay(game:Game, play:Play) {
        
        let descriptions = this.getPlayDescriptions(game, play)

        return descriptions?.map( d => {  return { text: d.text, type: "received", name: "Gamelog" } })

    }


}

interface PlayDescription {
    text: string,
    type: PlayDescriptionType
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



export {
    GameWebService, AtBatState
}


