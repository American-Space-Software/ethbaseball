import {  injectable } from "inversify"

import { LeagueRepository } from "../league-repository.js"
import { League } from "../../dto/league.js"


@injectable()
class LeagueRepositoryNodeImpl implements LeagueRepository {

    async get(id:string, options?:any): Promise<League> {
        return League.findByPk(id, options)
    }

    async getByRank(rank:number, options?:any) : Promise<League> {

        let queryOptions = {
            where: {
                rank: rank
            }
        }

        return League.findOne(Object.assign(queryOptions, options))
    }
    
    async put(league:League, options?:any): Promise<League> {

        await league.save(options)
        return league

    }

    async list(options?:any) : Promise<League[]> {
        
        return League.findAll(options)
    }


    
    async listByRankAsc(options?:any) : Promise<League[]> {

        let queryOptions = {
            order: [
                ['rank', 'ASC']
            ],
        }

        return League.findAll(Object.assign(queryOptions, options))

    }

}


export {
    LeagueRepositoryNodeImpl
}