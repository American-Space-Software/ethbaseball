import { inject, injectable } from "inversify";
import { Seed } from "../../dto/seed.js";

import seedrandom from "seedrandom"


@injectable()
class SeedService {

    private rng
    
    constructor() {}

    async getRNG() {

        if (!this.rng) {
            this.rng = new seedrandom()
        }

        return this.rng
    
    }


}



export {
    SeedService
}