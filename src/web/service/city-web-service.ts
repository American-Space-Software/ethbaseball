import { inject, injectable } from "inversify";
import axios from "axios"


@injectable()
class CityWebService {

    constructor() {}

    async list() {
        
        try {
            //Download it.
            let result = await axios.get(`/cities`)
            return result.data
        } catch(ex) {
            console.log(ex)
        }

    }


}

export {
    CityWebService
}