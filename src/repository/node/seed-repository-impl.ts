import {  injectable } from "inversify"

import { SeedRepository } from "../seed-repository.js"
import { Seed } from "../../dto/seed.js"


@injectable()
class SeedRepositoryNodeImpl implements SeedRepository {


    async get(id:string, options?:any): Promise<Seed> {
        return Seed.findByPk(id, options)
    }

    async put(seed:Seed, options?:any): Promise<Seed> {

        await seed.save(options)
        return seed

    }

}



export {
    SeedRepositoryNodeImpl
}