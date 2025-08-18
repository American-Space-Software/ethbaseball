import { Seed } from "../dto/seed.js"

interface SeedRepository {
    get(id:string, options?:any): Promise<Seed>
    put(seed:Seed, options?:any) : Promise<Seed>
}

export {
    SeedRepository
}
