import { inject, injectable } from "inversify";
import { SeedRepository } from "../repository/seed-repository.js";
import { Seed } from "../dto/seed.js";

import seedrandom from "seedrandom"


@injectable()
class SeedService {

    @inject("SeedRepository")
    private seedRepository:SeedRepository

    private rng
    
    constructor() {}

    async getRNG(options?:any) {

        if (!this.rng) {
            this.rng = new seedrandom()
        }

        return this.rng
    
    }

    private async getOrCreate(s:number, options?:any) : Promise<Seed> {

        let existing:Seed = await this.seedRepository.get("seed", options)
        if (existing) return existing

        let seed = new Seed()
        seed._id = "seed"

        //Get this from on-chain when it's all connected
        seed.seed = s

        return this.seedRepository.put(seed, options)

    }

}



export {
    SeedService
}