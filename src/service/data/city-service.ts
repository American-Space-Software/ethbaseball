import { inject, injectable } from "inversify";


import { CityRepository } from "../../repository/city-repository.js";
import { City } from "../../dto/city.js";


@injectable()
class CityService {

    @inject("CityRepository")
    private cityRepository:CityRepository

    constructor(
    ) {}

    async get(_id:string, options?:any) : Promise<City> {
        return this.cityRepository.get(_id, options)
    }

    async getByIds(ids:string[], options?:any) : Promise<City[]> {
        return this.cityRepository.getByIds(ids, options)
    }

    async put(city:City, options?:any) {
        return this.cityRepository.put(city, options)
    }

    async list(limit:number, offset:number, options?:any) : Promise<City[]> {
        return this.cityRepository.list(limit, offset, options)
    }
}


export {
    CityService
}