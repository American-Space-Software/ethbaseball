import { League } from "../dto/league.js"
import { TeamQueue } from "../dto/team-queue.js"
import { Team } from "../dto/team.js"

interface TeamQueueRepository {
    get(id:string, options?:any): Promise<TeamQueue>
    put(tq:TeamQueue, options?:any) : Promise<TeamQueue>
    delete(tq:TeamQueue, options?:any): Promise<void>

    list(limit:number, offset:number, options?:any) : Promise<TeamQueue[]>
    listByLeague(league:League, limit:number, offset:number, options?: any): Promise<TeamQueue[]>
    listByLeagueTeamRatingDesc(league:League, limit:number, offset:number, options?: any): Promise<TeamQueue[]>
    
    clear(options?:any)
    isTeamQueued(team:Team, options?: any): Promise<boolean>
    getByTeam(team:Team, options?: any): Promise<TeamQueue>
    count(options?: any): Promise<number>

}

export {
    TeamQueueRepository
}
