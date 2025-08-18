import { inject, injectable } from "inversify";
import axios from "axios"
import { UniverseContractService } from "../../service/universe-contract-service.js";
import { OwnerSorts } from "../../service/enums.js";



@injectable()
class OwnerWebService {

    constructor(
        private universeContractService:UniverseContractService
    ) {}

    // async get(_id:string) {
        
    //     try {
    //         //Download it.
    //         let result = await axios.get(`/api/owner/${_id}/info`)
    //         return result.data
    //     } catch(ex) {
    //         console.log(ex)
    //     }

    // }

    async getBalance(address:string) {
        return this.universeContractService.getBalance(address)
    }

    // async totals() {
        
    //     try {
    //         //Download it.
    //         let result = await axios.get(`/o/leaderboard/totals`)
    //         return result.data
    //     } catch(ex) {
    //         console.log(ex)
    //     }

    // }

    async list(page:number, sort:OwnerSorts) {

        try {
            //Download it.
            let result = await axios.get(`/api/owner/list/${sort}/${page}`)
            return result.data
        } catch(ex) {
            console.log(ex)
        }

    }



    // async getOwnerViewModel(address:string) {
    //     try {
    //         //Download it.
    //         let result = await axios.get(`/o/${address}`)
    //         return result.data
    //     } catch(ex) {
    //         console.log(ex)
    //     }
    // }

}

export {
    OwnerWebService
}