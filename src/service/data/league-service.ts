import { inject, injectable } from "inversify";

import { LeagueRepository } from "../../repository/league-repository.js";
import { League } from "../../dto/league.js";
import { UserService } from "./user-service.js";
import { Season } from "../../dto/season.js";
import { User } from "../../dto/user.js";
import { PlayerService } from "./player-service.js";


@injectable()
class LeagueService {

    @inject("LeagueRepository")
    private leagueRepository:LeagueRepository

    constructor(
        private playerService:PlayerService
    ) {}

    async get(_id:string, options?:any) : Promise<League> {
        return this.leagueRepository.get(_id, options)
    }

    async getByRank(rank:number, options?:any) : Promise<League> {
        return this.leagueRepository.getByRank(rank, options)
    }

    async put(league:League, options?:any) {
        return this.leagueRepository.put(league, options)
    }

    async list(options?:any) {
        return this.leagueRepository.list(options)
    }

    async listByRankAsc(options?:any) : Promise<League[]> {
        return this.leagueRepository.listByRankAsc(options)
    }




}



export {
    LeagueService
}