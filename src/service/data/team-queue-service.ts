import { inject, injectable } from "inversify";
import { v4 as uuidv4 } from 'uuid';


import { TeamQueueRepository } from "../../repository/team-queue-repository.js";
import { TeamQueue } from "../../dto/team-queue.js";
import { Team } from "../../dto/team.js";
import { League } from "../../dto/league.js";


@injectable()
class TeamQueueService {

    @inject("TeamQueueRepository")
    private teamQueueRepository:TeamQueueRepository

    constructor(
    ) {}

    async get(_id:string, options?:any) : Promise<TeamQueue> {
        return this.teamQueueRepository.get(_id, options)
    }

    async put(tq:TeamQueue, options?:any) {
        return this.teamQueueRepository.put(tq, options)
    }

    async list(limit:number, offset:number, options?:any) : Promise<TeamQueue[]> {
        return this.teamQueueRepository.list(limit, offset, options)
    }

    async listByLeague(league:League, limit:number, offset:number, options?: any): Promise<TeamQueue[]> {
        return this.teamQueueRepository.listByLeague(league, limit, offset, options)
    }

    async clear(options?:any) {
        return this.teamQueueRepository.clear(options)
    }

    async queueTeam(team:Team, league:League, options?: any): Promise<TeamQueue> {

        const tq = Object.assign(new TeamQueue(), {
            _id: uuidv4(),
            teamId: team._id,
            leagueId: league._id,
            dateCreated: null,
            lastUpdated: null
        })

        return this.teamQueueRepository.put(tq, options)
    }

    async dequeueTeam(team:Team, options?: any): Promise<void> {

        let existing = await this.teamQueueRepository.getByTeam(team, options)

        if (existing) {
            await this.teamQueueRepository.delete(existing, options)
        }

    }


    async isTeamQueued(team:Team, options?: any): Promise<boolean> {
        return this.teamQueueRepository.isTeamQueued(team, options)
    }

    async count(options?: any): Promise<number> {
        return this.teamQueueRepository.count(options)
    }


}


export {
    TeamQueueService
}