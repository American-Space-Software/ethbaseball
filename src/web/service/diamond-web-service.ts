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
        let result = await axios.get(`/api/diamond/mint`)
        return result.data
    }

    async getWithdrawPass(tokenId:string) {
    
        //Download it.
        let result = await axios.get(`/t/withdraw/${tokenId}`)
        return result.data
    }

    async mint(mintPass:MintPass) {
        return this.diamondService.mint(mintPass.to, mintPass._id, mintPass.amount, mintPass.expires, mintPass.v, mintPass.r, mintPass.s)
    }

    async withdraw(mintPass:MintPass) {
        return this.diamondService.withdraw(mintPass.to, mintPass._id, mintPass.amount, mintPass.tokenId, mintPass.expires, mintPass.v, mintPass.r, mintPass.s)
    }

}

interface MintPass {
    to: string
    _id: number
    amount: string
    expires: number
    tokenId:number
    v: number
    r: string 
    s: string
}


export {
    DiamondWebService
}