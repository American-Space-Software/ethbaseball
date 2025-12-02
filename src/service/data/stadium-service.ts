import { inject, injectable } from "inversify";

import { StadiumRepository } from "../../repository/stadium-repository.js";
import { Stadium } from "../../dto/stadium.js";


@injectable()
class StadiumService {


    @inject("StadiumRepository")
    private stadiumRepository:StadiumRepository

    constructor(
    ) {}

    async get(_id:string, options?:any) {
        return this.stadiumRepository.get(_id, options)
    }

    async put(stadium:Stadium, options?:any) {
        return this.stadiumRepository.put(stadium, options)
    }

}

export {
    StadiumService
}