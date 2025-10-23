import { inject, injectable } from "inversify";
import { TeamWebService } from "./team-web-service.js";
import { UniverseWebService } from "./universe-web-service.js";
import axios from "axios";


@injectable()
class LeagueWebService {

    viewModel

    constructor(
    ) {}

    async getList() {
        //Download it.
        let result = await axios.get(`/api/league/list`)
        return result.data

    }

    async getStandings(leagueRank:number, startDate:string, page:number) {
        
        let url = startDate ? `/api/league/standings/${leagueRank}/${page}/${startDate}` : `/api/league/standings/${leagueRank}/${page}`

        //Download it.
        let result = await axios.get(url)
        return result.data

    }

}

export {
    LeagueWebService
}