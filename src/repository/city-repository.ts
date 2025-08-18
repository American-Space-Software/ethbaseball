import { City } from "../dto/city.js"

interface CityRepository {
    get(id:string, options?:any): Promise<City>
    getByIds(ids:string[], options?:any): Promise<City[]>

    put(city:City, options?:any) : Promise<City>
    list(limit:number, offset:number, options?:any) : Promise<City[]>
}

export {
    CityRepository
}
