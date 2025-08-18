import { Season } from "../dto/season.js"

interface SeasonRepository {
    getCurrent(options?: any): Promise<Season>
    getMostRecent(options?: any): Promise<Season>
    getMostRecentCompleted(options?: any): Promise<Season>
    getByDate(date:Date, options?: any): Promise<Season> 
    get(id:string, options?:any): Promise<Season>
    getByIds(ids:string[], options?:any): Promise<Season[]>

    put(city:Season, options?:any) : Promise<Season>
    list(limit:number, offset:number, options?:any) : Promise<Season[]>
}

export {
    SeasonRepository
}
