import { inject, injectable } from "inversify";
import axios from "axios"
import dayjs from "dayjs";


@injectable()
class TeamWebService {

    constructor() {}

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

    async getTeamMintPass(tokenId:number) {
        
        //Download it.
        let result = await axios.get(`/api/team/team-mint-pass/${tokenId}`)
        return result.data

    }


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

        let isBot = tls.owner?._id == undefined

        let cityName = tls.city?.name ? tls.city.name : tls.cityName

        if (cityName) {
            return `${cityName} ${tls.name}${isBot ? ' 🤖' : ''}`
        }
        
        return `${tls.name}${isBot ? ' 🤖' : ''}`
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


}

export {
    TeamWebService
}