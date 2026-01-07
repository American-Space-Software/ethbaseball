import {  injectable } from "inversify"


import { Op } from "sequelize"
import { TeamQueueRepository } from "../team-queue-repository.js"
import { TeamQueue } from "../../dto/team-queue.js"
import { Team } from "../../dto/team.js"
import { League } from "../../dto/league.js"


@injectable()
class TeamQueueRepositoryNodeImpl implements TeamQueueRepository {

    async get(id:string, options?:any): Promise<TeamQueue> {
        return TeamQueue.findByPk(id, options)
    }

    async put(tq:TeamQueue, options?:any): Promise<TeamQueue> {

        await tq.save(options)
        return tq

    }

    async list(limit:number, offset:number, options?: any): Promise<TeamQueue[]> {
        
        let query = {
            limit: limit,
            offset: offset,
            order: [
                ['dateCreated', 'DESC']
            ]
        }

        return TeamQueue.findAll(Object.assign(query, options))
    }

    async listByLeague(league:League, limit:number, offset:number, options?: any): Promise<TeamQueue[]> {
        
        let query = {
            where: {
                leagueId: league._id
            },
            limit: limit,
            offset: offset,
            order: [
                ['dateCreated', 'DESC']
            ]
        }

        return TeamQueue.findAll(Object.assign(query, options))
    }


    async getByIds(ids: string[], options?: any): Promise<TeamQueue[]> {

        let queryOptions = {
            where: {
                _id: {
                    [Op.in]: ids
                }
            }
        }

        return TeamQueue.findAll(Object.assign(queryOptions, options))
    }

    async clear(options?: any): Promise<void> {
        await TeamQueue.destroy({
            where: {},
            truncate: true,
            ...options
        })
    }

    async isTeamQueued(team:Team, options?: any): Promise<boolean> {

        const count = await TeamQueue.count({
            where: { teamId: team._id },
            ...options
        }) as unknown as number

        return count > 0
    }


}


export {
    TeamQueueRepositoryNodeImpl
}