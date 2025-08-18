import {  injectable } from "inversify"


import { StadiumRepository } from "../stadium-repository.js"
import { Stadium } from "../../dto/stadium.js"


@injectable()
class StadiumRepositoryNodeImpl implements StadiumRepository {

    async get(id:string, options?:any): Promise<Stadium> {
        return Stadium.findByPk(id, options)
    }

    async put(stadium:Stadium, options?:any): Promise<Stadium> {

        await stadium.save(options)
        return stadium

    }

}


export {
    StadiumRepositoryNodeImpl
}