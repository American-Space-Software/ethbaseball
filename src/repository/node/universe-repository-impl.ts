import {  injectable } from "inversify"

import { UniverseRepository } from "../universe-repository.js"
import { Universe } from "../../dto/universe.js"


@injectable()
class UniverseRepositoryNodeImpl implements UniverseRepository {
    
    async get(id:string, options?:any): Promise<Universe> {
        return Universe.findByPk(id, options)
    }

    async put(universe:Universe, options?:any): Promise<Universe> {

        await universe.save(options)
        return universe

    }

    async list(limit:number, offset:number, options?: any): Promise<Universe[]> {
        
        let query = {
            limit: limit,
            offset: offset,
            order: [
                ['dateCreated', 'DESC']
            ]
        }

        return Universe.findAll(Object.assign(query, options))
    }

}



export {
    UniverseRepositoryNodeImpl
}