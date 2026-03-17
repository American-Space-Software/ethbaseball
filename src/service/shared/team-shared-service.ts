import { inject, injectable } from "inversify";


@injectable()
class TeamSharedService {

    constructor() {}

    getTeamName(tls) {

        let isBot = tls.owner?._id == undefined

        let cityName = tls.city?.name ? tls.city.name : tls.cityName

        if (cityName) {
            return `${cityName} ${tls.name}${isBot ? ' 🤖' : ''}`
        }
        
        return `${tls.name}${isBot ? ' 🤖' : ''}`
    }

    getDevelopmentXpMultiplier(budgetPercent): bigint {
        return BigInt(100 + Math.round(budgetPercent * 0.5))
    }


    getRewardMultiplier(ratingGap: number): number {

        if (ratingGap <= 25) {
            return 1
        }

        if (ratingGap <= 100) {
            const slope = -0.5 / 75
            return 1 + (ratingGap - 25) * slope
        }

        if (ratingGap <= 150) {
            const slope = -0.4 / 50
            return 0.5 + (ratingGap - 100) * slope
        }

        if (ratingGap <= 250) {
            const slope = -0.1 / 100
            return 0.1 + (ratingGap - 150) * slope
        }

        return 0
    }
    
    calculateProjectedReward(baseDiamondReward: number, maxRatingDiff: number): bigint {
      const multiplier = this.getRewardMultiplier(maxRatingDiff)
      const multiplierScaled = BigInt(Math.round(multiplier * 10000))
      return (BigInt(baseDiamondReward) * multiplierScaled) / 10000n
    }

    getBarnstormingTier(teamAverageRating: number): number {
        const tier = Math.floor((teamAverageRating - 70) / 10) + 1
        return Math.max(1, Math.min(10, tier))
    }


}

export {
    TeamSharedService
}