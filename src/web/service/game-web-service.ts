import { inject, injectable } from "inversify";
import axios from "axios"
import { AtBatState, BaseResult, Contact, Count, DefensiveCredit, GamePlayer, GamePlayerBio, Handedness, MatchupHandedness, OfficialPlayResult, OfficialRunnerResult, Pitch, PitchResult, PitchZone, Play, PlayDescription, PlayResult, Position, RunnerEvent, RunnerResult, Score, ShallowDeep, ThrowResult, UpcomingMatchup, WIN_EXPECTANCY_CHART, WPA, WPAReward } from "../../service/enums.js";
import dayjs from "dayjs";

import { SocketWebService } from "./socket-web-service.js";
import { PlayerWebService } from "./player-web-service.js";
import { TeamWebService } from "./team-web-service.js";
import { GameSharedService } from "../../service/shared/game-shared-service.js";


@injectable()
class GameWebService {
    
    private gameHandlers = new Map<string, (g:any) => void>()

    constructor(
        private socketWebService: SocketWebService,
        private gameSharedService:GameSharedService
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

    async getGames(rank:number) {

        let result = await axios.get(`/api/game/list/${rank}`, {
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

    async queue(maxRatingDiff:number) {
        let result = await axios.post(`/api/game/queue?maxRatingDiff=${maxRatingDiff}`)
        return result.data
    }

    async dequeue() {
        let result = await axios.post(`/api/game/dequeue`)
        return result.data
    }

    getGameViewModel(game) {

        let linescore = this.gameSharedService.getLineScore(game)

        let currentPlay = this.gameSharedService.getCurrentPlay(game)

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

            let gamePlayers = this.gameSharedService.gamePlayers(game)
    
            let hitter = this.gameSharedService.getHitter(game, currentPlay)
            let pitcher = this.gameSharedService.getPitcher(game)
    
            let defense = this.gameSharedService.getDefense(game)
    
            let winningPitcher
            let losingPitcher
    
            if (game.isComplete) {
                winningPitcher = gamePlayers[game.winningPitcherId]
                losingPitcher = gamePlayers[game.losingPitcherId]
            }
    
            let runner1B = gamePlayers[this.gameSharedService.getOffense(game).runner1BId]
            let runner2B = gamePlayers[this.gameSharedService.getOffense(game).runner2BId]
            let runner3B = gamePlayers[this.gameSharedService.getOffense(game).runner3BId]
    
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
    
            let matchupHandedness = hitter ? this.gameSharedService.getMatchupHandedness(hitter, pitcher) : undefined
    

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




    getCurrentDescriptions(vm) : PlayDescription[] {
        return this.gameSharedService.getCurrentDescriptions(vm)
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
        return this.gameSharedService.pitcherGameStats(pitcher)
    }

    pitcherGameStatsShort(pitcher) {
        return this.gameSharedService.pitcherGameStatsShort(pitcher)
    }

    hitterGameStats(hitter) {

        return this.gameSharedService.hitterGameStats(hitter)

    }

    hitterGameStatsShort(hitter) {
        return this.gameSharedService.hitterGameStatsShort(hitter)
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
      return this.gameSharedService.getAtBatState(vm)
    }



    getMessagesFromPlayDescriptions(descriptions) {
        return descriptions?.map( d => {  return { text: d.text, type: "received", name: "Gamelog" } })

    }


    getPlayByPlay(game) {
        return this.gameSharedService.getPlayByPlay(game)
    }

    gamePlayers(game) {
        return this.gameSharedService.gamePlayers(game)

    }

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
    GameWebService
}


