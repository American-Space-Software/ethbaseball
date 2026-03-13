import { inject, injectable } from "inversify";
import axios from "axios"
import dayjs from "dayjs";
import { TeamSharedService } from "../../service/shared/team-shared-service.js";


@injectable()
class TeamWebService {

    constructor(
        private teamSharedService:TeamSharedService
    ) {}

    async getByDate(teamId:string, startDate:string) {
        //Download it.
        let result = await axios.get(`/api/team/date/${teamId}/${startDate}`)
        return result.data

    }


    // async getMintInfo(teamId:string, mintKey?:string) {
        
    //     let queryString = mintKey ? `?mintKey=${mintKey}` : ''

    //     //Download it.
    //     let result = await axios.get(`/api/team/mint-info/${teamId}${queryString}`)
    //     return result.data

    // }

    // async getMint(teamId:string, mintKey?:string) {
        
    //     let queryString = mintKey ? `?mintKey=${mintKey}` : ''

    //     //Download it.
    //     let result = await axios.get(`/api/team/mint/${teamId}${queryString}`)
    //     return result.data

    // }

    // async getTeamMintPass(tokenId:number) {
        
    //     //Download it.
    //     let result = await axios.get(`/api/team/team-mint-pass/${tokenId}`)
    //     return result.data

    // }


    async getGameLog(teamId:string, date:Date) {
        //Download it.
        let result = await axios.get(`/api/team/games/${teamId}/${dayjs(date).format("YYYY-MM-DD")}`)
        return result.data

    }


    async withdraw(tokenId:number) {
        //Download it.
        let result = await axios.get(`/api/team/withdraw/${tokenId}`)
        return result.data

    }
    async setRoster(teamId:string, lineups) {
        
        //Download it.
        let result = await axios.post(`/api/team/roster/${teamId}`, { lineups: lineups })
        return result.data

    }

    async getActiveLineup(teamId:string) {
        //Download it.
        let result = await axios.get(`/api/team/lineup/${teamId}`)
        return result.data

    }


    getTeamName(tls) {
        return this.teamSharedService.getTeamName(tls)
    }

    getTeamNameStacked(tls) {

        let isBot = tls.owner?._id == undefined

        let cityName = tls.city?.name ? tls.city.name : tls.cityName

        if (cityName) {

            return `
                <span class="small">${cityName}</span><br />
                ${tls.name}${isBot ? ' 🤖' : ''}
            `
        } 

        return this.getTeamName(tls)

    }

    getOverallRank(rank:number, leagueRank:number, teams:number) {
        return rank + ((leagueRank - 1) * teams)
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

}

export {
    TeamWebService
}