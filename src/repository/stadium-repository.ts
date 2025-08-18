import { Stadium } from "../dto/stadium.js"

interface StadiumRepository {
    get(id:string, options?:any): Promise<Stadium>
    put(stadium:Stadium, options?:any) : Promise<Stadium>
}

export {
    StadiumRepository
}
