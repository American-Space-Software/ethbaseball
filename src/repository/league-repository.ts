import { League } from "../dto/league.js"

interface LeagueRepository {
    get(id:string, options?:any): Promise<League>
    getByRank(rank:number, options?:any) : Promise<League> 
    put(league:League, options?:any) : Promise<League>
    list(options?:any): Promise<League[]>
    listByRankAsc(options?:any) : Promise<League[]>
}

export {
    LeagueRepository
}
