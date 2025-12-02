import { inject, injectable } from "inversify";


import { CityRepository } from "../../repository/city-repository.js";
import { City } from "../../dto/city.js";
import { SeasonRepository } from "../../repository/season-repository.js";
import { Season } from "../../dto/season.js";


@injectable()
class SeasonService {

    @inject("SeasonRepository")
    private seasonRepository:SeasonRepository

    constructor(
    ) {}

    async getMostRecent(options?: any): Promise<Season> {
        return this.seasonRepository.getMostRecent(options)
    }
    async getCurrent(options?: any): Promise<Season> {
        return this.seasonRepository.getCurrent(options)
    }

    async getMostRecentCompleted(options?: any): Promise<Season> {
        return this.seasonRepository.getMostRecentCompleted(options)
    }

    async getByDate(date:Date, options?: any): Promise<Season> {
        return this.seasonRepository.getByDate(date, options)
    }

    async get(id:string, options?:any): Promise<Season> {
        return this.seasonRepository.get(id, options)
    }
    async getByIds(ids:string[], options?:any): Promise<Season[]> {
        return this.seasonRepository.getByIds(ids, options)
    }

    async put(season:Season, options?:any) : Promise<Season> {
        return this.seasonRepository.put(season, options)

    }
    async list(limit:number, offset:number, options?:any) : Promise<Season[]> {
        return this.seasonRepository.list(limit, offset, options)

    }
}


export {
    SeasonService
}