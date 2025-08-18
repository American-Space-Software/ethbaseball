import { Universe } from "../dto/universe.js"

interface UniverseRepository {
    get(id:string, options?:any): Promise<Universe>
    put(universe:Universe, options?:any) : Promise<Universe>
    list(limit:number, offset:number, options?: any): Promise<Universe[]>
}

export {
    UniverseRepository
}
