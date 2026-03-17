import { inject, injectable } from "inversify";
import { HITTER_GAME_AVERAGE_XP, PlayerGrade } from "../enums.js";

const BASE_RATING = 70
const BASE_XP = 720
const GROWTH = 1.026


@injectable()
class PlayerSharedService {

    constructor() {}

    ratingToGrade(rating: number): PlayerGrade {

        if (rating >= 170) return PlayerGrade.A_PLUS
        if (rating >= 158) return PlayerGrade.A
        if (rating >= 146) return PlayerGrade.A_MINUS
        if (rating >= 134) return PlayerGrade.B_PLUS
        if (rating >= 122) return PlayerGrade.B
        if (rating >= 110) return PlayerGrade.B_MINUS
        if (rating >= 95) return PlayerGrade.C_PLUS
        if (rating >= 83) return PlayerGrade.C
        if (rating >= 71) return PlayerGrade.C_MINUS
        if (rating >= 59) return PlayerGrade.D_PLUS
        if (rating >= 47) return PlayerGrade.D
        if (rating >= 35) return PlayerGrade.D_MINUS

        return PlayerGrade.F
    }

    getExperiencePerGame(hadGoodGame:boolean, isPitcher:boolean) : bigint {

        let base = isPitcher ? HITTER_GAME_AVERAGE_XP * 5 : HITTER_GAME_AVERAGE_XP

        let goodExp = BigInt(base * 125 / 100)
        let badExp = BigInt(base * 75 / 100)

        return hadGoodGame ? goodExp : badExp
        
    }

    /**
     * Converts a player's total accumulated experience into a potential overall rating.
     *
     * Design goals of the progression system:
     *
     * - Players enter the league around 70 potential overall.
     * - Players should reach roughly 100 potential overall by the end of their first two seasons.
     * - The full progression arc runs from 70 to about 170, giving ~100 total levels.
     * - Early development should feel fast.
     * - Mid and late-career development should slow down substantially.
     * - A full career should still land near the top of the curve without most players actually maxing out.
     *
     * Approximate curve:
     *
     * XP        Rating
     * 0         70
     * ~15k      86
     * ~16k      87
     * ~32k      99-100
     * ~50k      110
     * ~80k      122
     * ~120k     135
     * ~170k     146
     * ~230k     156
     * ~300k     166
     * ~330k     170
     */
    experienceToOverallRating(totalExperience: bigint): number {

        const xp = Number(totalExperience)

        const levels =
            Math.log((xp * (GROWTH - 1) / BASE_XP) + 1) /
            Math.log(GROWTH)

        return Math.floor(BASE_RATING + levels)

    }

    getAgeLearningModifier(yearsOld: number): number {

        switch (yearsOld) {

            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
                return .95
            case 17:
                return .96
            case 18:
                return .97
            case 19:
                return .98
            case 20:
                return .99
            case 21:
                return 1.0
            case 22:
                return .99
            case 23:
                return .98
            case 24:
                return .97
            case 25:
                return .96
            case 26:
                return .95
            case 27:
                return .94
            case 28:
                return .93
            case 29:
                return .90
            case 30:
                return .87
            case 31:
                return .84
            case 32:
                return .81
            case 33:
                return .80
            case 34:
                return .75
            case 35:
                return .70
            case 36:
                return .65
            case 37:
                return .60
            case 38:
                return .55
            case 39:
                return .50
            case 40:
                return .45
            case 41:
                return .30
            case 42:
                return .2
            case 43:
                return .1
            case 44:
                return .1

        }

    }

    getAgeModifier(yearsOld: number): number {

        switch (yearsOld) {

            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
                return .50
            case 17:
                return .75
            case 18:
                return .77
            case 19:
                return .79
            case 20:
                return .85
            case 21:
                return .87
            case 22:
                return .89
            case 23:
                return .91
            case 24:
                return .92
            case 25:
                return .94
            case 26:
                return .97
            case 27:
                return 1
            case 28:
                return .97
            case 29:
                return .96
            case 30:
                return .95
            case 31:
                return .93
            case 32:
                return .9
            case 33:
                return .87
            case 34:
                return .85
            case 35:
                return .8
            case 36:
                return .75
            case 37:
                return .74
            case 38:
                return .73
            case 39:
                return .72
            case 40:
                return .70
            case 41:
                return .68
            case 42:
                return .65
            case 43:
                return .60
            case 44:
                return .1

        }

    }

    getDisplayLevel(totalExperience: bigint) {

        let overallRating = this.experienceToOverallRating(totalExperience)

        return overallRating - 69

    }

    getExperienceForDisplayLevel(displayLevel: number): bigint {
        const xp = BASE_XP * ((Math.pow(GROWTH, displayLevel - 1) - 1) / (GROWTH - 1))
        return BigInt(Math.round(xp))
    }

    getDisplayLevelProgress(totalExperience: bigint): number {
        const level = this.getDisplayLevel(totalExperience)

        if (level >= 100) return 100

        const currentLevelXP = this.getExperienceForDisplayLevel(level)
        const nextLevelXP = this.getExperienceForDisplayLevel(level + 1)

        const gained = totalExperience - currentLevelXP
        const needed = nextLevelXP - currentLevelXP

        if (needed <= 0n) return 100

        return Number((gained * 100n) / needed)
    }    

    getNextDisplayLevel(totalExperience: bigint): number {
        const level = this.getDisplayLevel(totalExperience)
        return Math.min(level + 1, 100)
    }

    getNextLevelExperience(totalExperience: bigint): bigint {
        const level = this.getDisplayLevel(totalExperience)

        if (level >= 100) {
            return this.getExperienceForDisplayLevel(100)
        }

        return this.getExperienceForDisplayLevel(level + 1)
    }


}

export {
    PlayerSharedService
}