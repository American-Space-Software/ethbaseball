import { inject, injectable } from "inversify";

import { DiamondMintPassRepository } from "../../repository/diamond-mint-pass-repository.js";
import { DiamondMintPass } from "../../dto/diamond-mint-pass.js";
import random from 'crypto-random-bigint';
import dayjs from "dayjs";
import { User } from "../../dto/user.js";


@injectable()
class DiamondMintPassService {

    @inject("DiamondMintPassRepository")
    private diamondMintPassRepository:DiamondMintPassRepository
    
    constructor(
    ) {}

    async getUnmintedByUser(user:User, options?:any): Promise<DiamondMintPass[]> {
        return this.diamondMintPassRepository.getUnmintedByUser(user, options)
    }

    async generateMintPass(toUserId:string, toAddress:string, amount:string, options?:any): Promise<DiamondMintPass> {

        let expires = dayjs(new Date(new Date().toUTCString())).add(1, 'year').toDate().getTime() / 1000

        let mintPass = new DiamondMintPass()

        Object.assign(mintPass, {
            _id: random(256).toString(),
            toUserId:toUserId,
            toAddress: toAddress,
            amount: amount,
            expires: expires
        })

        await this.diamondMintPassRepository.put(mintPass, options)

        return mintPass
    }

    async get(id:number, options?:any): Promise<DiamondMintPass> {
        return this.diamondMintPassRepository.get(id, options)
    }

    async put(dmp:DiamondMintPass, options?:any) : Promise<DiamondMintPass> {
        return this.diamondMintPassRepository.put(dmp, options)
    }

    async getByUser(user:User, options?:any): Promise<DiamondMintPass[]> {
        return this.diamondMintPassRepository.getByUser(user, options)
    }


}

export {
    DiamondMintPassService
}