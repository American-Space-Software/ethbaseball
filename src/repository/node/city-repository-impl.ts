import {  injectable } from "inversify"

import { City } from "../../dto/city.js"
import { CityRepository } from "../city-repository.js"
import { Op } from "sequelize"


@injectable()
class CityRepositoryNodeImpl implements CityRepository {

    async get(id:string, options?:any): Promise<City> {
        return City.findByPk(id, options)
    }

    async put(city:City, options?:any): Promise<City> {

        await city.save(options)
        return city

    }

    async list(limit:number, offset:number, options?: any): Promise<City[]> {
        
        let query = {
            limit: limit,
            offset: offset,
            order: [
                ['population', 'DESC']
            ]
        }

        return City.findAll(Object.assign(query, options))
    }

    async getByIds(ids: string[], options?: any): Promise<City[]> {

        let queryOptions = {
            where: {
                _id: {
                    [Op.in]: ids
                }
            },
            order: [
                ['name', 'desc']
            ]
        }

        return City.findAll(Object.assign(queryOptions, options))
    }


}


export {
    CityRepositoryNodeImpl
}