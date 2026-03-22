import { injectable } from "inversify"

import {  RollChartService } from "./roll-chart-service.js"


@injectable()
class RollService {

    constructor(
        private rollChartService:RollChartService
    ) { }



    getRatingDistribution(playerRNG, numRatings): number[] {

        let nums: number[] = []

        //Generate until we get an array that adds up to 100
        while (nums.length == 0) {

            //Generate numRatings number of ratings
            for (let i = 0; i < numRatings; i++) {
                nums.push(this.getRoll(playerRNG, 20, 100))
            }

            //Get the total
            let total = nums.reduce((acc, num) => acc + num, 0)

            //Divide each one by the total and round.
            for (let i = 0; i < nums.length; i++) {
                nums[i] = Math.round((nums[i] / total) * 100)
            }

            let newTotal = nums.reduce((acc, num) => acc + num, 0)

            //If we don't equal 100 start over.
            if (newTotal != 100) {
                nums.length = 0//try again
                continue
            }

            //Now turn them into the % better than average. Average being equally distributed.
            let overallAverage = 100 / numRatings
            for (let i = 0; i < nums.length; i++) {

                nums[i] = this.getChange(overallAverage, nums[i])

                //Make sure we're between -1 and 1
                if (nums[i] > 1 || nums[i] < -1) {
                    nums.length = 0 //try again
                } 
            }

        }
        return nums

    }

    getChange(a: number, b: number) {
        return this.rollChartService.getChange(a, b)
    }


    getRoll(generator: () => number, min: number, max: number) {
        if (max < min) throw new Error(`getRoll max < min (${max} < ${min})`)
        return Math.floor(generator() * (max - min + 1)) + min
    }

    getRollUnrounded(generator: () => number, min: number, max: number) {
        if (max < min) throw new Error(`getRollUnrounded max < min (${max} < ${min})`)
        return (generator() * (max - min)) + min // continuous in [min, max)
    }

        //Source 
    // https://github.com/trekhleb/javascript-algorithms/blob/master/src/algorithms/statistics/weighted-random/weightedRandom.js
    weightedRandom(gameRNG, items, weights) {

        if (items.length !== weights.length) {
            throw new Error('Items and weights must be of the same size')
        }

        if (!items.length) {
            throw new Error('Items must not be empty')
        }

        // Preparing the cumulative weights array.
        // For example:
        // - weights = [1, 4, 3]
        // - cumulativeWeights = [1, 5, 8]
        const cumulativeWeights = [];
        for (let i = 0; i < weights.length; i += 1) {
            cumulativeWeights[i] = weights[i] + (cumulativeWeights[i - 1] || 0)
        }

        // Getting the random number in a range of [0...sum(weights)]
        // For example:
        // - weights = [1, 4, 3]
        // - maxCumulativeWeight = 8
        // - range for the random number is [0...8]
        const maxCumulativeWeight = cumulativeWeights[cumulativeWeights.length - 1]
        const randomNumber = maxCumulativeWeight * gameRNG()

        // Picking the random item based on its weight.
        // The items with higher weight will be picked more often.
        for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
            if (cumulativeWeights[itemIndex] >= randomNumber) {
                return items[itemIndex]
            }
        }
    }


}


export { RollService}