import { inject, injectable } from "inversify";
import { HitResultCount, HitterStatLine, PitcherStatLine, PitchResultCount, StatService as SimStatService }  from 'baseball-sim-engine';



@injectable()
class StatService {

    simStatService:SimStatService

    constructor(
    ) {
        this.simStatService = new SimStatService()
    }

    public formatRatio(num) {

        // Special case for 0 to format as .000
        if (!num || num === 0) {
            return ".000";
        }

        // Format the number to always have 3 decimal places
        let numStr = num.toFixed(3)

        // Check if the number is less than 1 and greater than -1 but not 0
        if (num < 1 && num > -1 && num !== 0) {
            // Remove the leading 0
            numStr = numStr.replace(/^0/, '')
        }
        // Return the formatted string
        return numStr

    }

    getIP(outs) {

        if (!outs) return "0.0"

        const innings = Math.floor(outs / 3)
        const thirds = outs % 3

        if (thirds === 0) {
            return innings + ".0"
        } else if (thirds === 1) {
            return innings + ".1"
        } else {
            return innings + ".2"
        }

    }

    getERA(earnedRuns: number, outs: number) {

        if (outs == 0) {
            if (earnedRuns > 0) return Number.POSITIVE_INFINITY
            if (earnedRuns == 0) return 0
        }

        // Convert outs to innings pitched
        let inningsPitched = outs / 3

        // Calculate ERA
        return (earnedRuns / inningsPitched) * 9
    }

    getOBP(hits:number, bb:number, hbp:number, pa:number) {
        if (pa == 0) return 0
        return (hits + bb + hbp) / pa
    }

    getSLG(singles:number, doubles:number, triples:number, homeRuns:number, atBats:number) {
        if (atBats == 0) return 0
        return (singles + (doubles * 2) + (triples * 3) + (homeRuns * 4)) / atBats
    }

    getOPS(obp:number, slg:number) {
        return obp + slg
    }
    getAVG(hits:number, atBats:number) {
        if (atBats == 0) return 0
        return hits / atBats
    }

    getWinPercent(wins:number, losses:number) : number {

        let games = wins + losses

        if (games > 0) {
            return wins/games
        }

        return 0

    }

    displayPercent(num:number) {
        if (num == undefined || isNaN(num)) return ""
        return `${(num * 100).toFixed(1)}%`
    }


    hitResultToHitterStatLine(hitResult: HitResultCount): HitterStatLine {
        return this.simStatService.hitResultToHitterStatLine(hitResult)
    }

    mergeHitResultsToStatLine(total:HitResultCount, currentGame:HitResultCount) : HitterStatLine {
        return this.simStatService.mergeHitResultsToStatLine(total, currentGame)
    }

    mergePitchResultsToStatLine(total:PitchResultCount, currentGame:PitchResultCount) : PitcherStatLine {
        return this.simStatService.mergePitchResultsToStatLine(total, currentGame)
    }

    pitchResultToPitcherStatLine(pitchResult: PitchResultCount): PitcherStatLine {
        return this.simStatService.pitchResultToPitcherStatLine(pitchResult)
    }


}


export {
    StatService
}