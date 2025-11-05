import { inject, injectable } from "inversify";
import axios from "axios"
import dayjs from "dayjs";


@injectable()
class TeamWebService {

    constructor() {}

    async getByDate(tokenId:number, startDate:string) {
        //Download it.
        let result = await axios.get(`/api/team/date/${tokenId}/${startDate}`)
        return result.data

    }


    async getMintInfo(teamId:string, mintKey?:string) {
        
        let queryString = mintKey ? `?mintKey=${mintKey}` : ''

        //Download it.
        let result = await axios.get(`/api/team/mint-info/${teamId}${queryString}`)
        return result.data

    }

    async getMint(teamId:string, mintKey?:string) {
        
        let queryString = mintKey ? `?mintKey=${mintKey}` : ''

        //Download it.
        let result = await axios.get(`/api/team/mint/${teamId}${queryString}`)
        return result.data

    }

    async getTeamMintPass(tokenId:number) {
        
        //Download it.
        let result = await axios.get(`/api/team/team-mint-pass/${tokenId}`)
        return result.data

    }


    async getGameLog(tokenId:number, date:Date) {
        //Download it.
        let result = await axios.get(`/api/team/games/${tokenId}/${dayjs(date).format("YYYY-MM-DD")}`)
        return result.data

    }


    async withdraw(tokenId:number) {
        //Download it.
        let result = await axios.get(`/api/team/withdraw/${tokenId}`)
        return result.data

    }
    async setRoster(tokenId:number, lineups) {
        
        //Download it.
        let result = await axios.post(`/api/team/roster/${tokenId}`, { lineups: lineups })
        return result.data

    }



    getTeamName(tls) {
        return `${tls.city.name} ${tls.name}`
    }

    getOverallRank(rank:number, leagueRank:number, teams:number) {
        return rank + ((leagueRank - 1) * teams)
    }


}

export {
    TeamWebService
}