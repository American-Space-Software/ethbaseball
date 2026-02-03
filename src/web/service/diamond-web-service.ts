import { inject, injectable } from "inversify";
import axios from "axios"
import { ethers } from "ethers";
import { DiamondService } from "../../service/diamond-service.js";


@injectable()
class DiamondWebService {

    startDate:string
    rank:number

    constructor(
        @inject('env') private env,
        @inject('eventTarget') private eventTarget,
        private diamondService:DiamondService
    ) {
        this.rank = 1
    }

    async getMintPass() {
    
        //Download it.
        let result = await axios.get(`/api/team/mint`)
        return result.data
    }

    async mint(mintPass:MintPass) {
        return this.diamondService.mint(mintPass.toAddress, mintPass._id, mintPass.amount, mintPass.expires, mintPass.v, mintPass.r, mintPass.s)
    }

}

interface MintPass {
    toAddress: string
    toUserId:string
    _id: number
    amount: string
    expires: number
    v: number
    r: string 
    s: string
}


export {
    DiamondWebService
}