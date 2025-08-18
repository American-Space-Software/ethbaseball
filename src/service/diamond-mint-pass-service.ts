import { inject, injectable } from "inversify";

import { DiamondMintPassRepository } from "../repository/diamond-mint-pass-repository.js";
import { DiamondMintPass } from "../dto/diamond-mint-pass.js";
import random from 'crypto-random-bigint';
import dayjs from "dayjs";


@injectable()
class DiamondMintPassService {

    @inject("DiamondMintPassRepository")
    private diamondMintPassRepository:DiamondMintPassRepository
    
    constructor(
    ) {}

    async getUnmintedByAddress(address:string, options?:any): Promise<DiamondMintPass[]> {
        return this.diamondMintPassRepository.getUnmintedByAddress(address, options)
    }

    async getUnmintedByTokenId(tokenId:number, options?:any): Promise<DiamondMintPass[]> {
        return this.diamondMintPassRepository.getUnmintedByTokenId(tokenId, options)
    }

    async generateWithdrawPass(to:string, tokenId:number, amount:string, options?:any): Promise<DiamondMintPass> {

        let expires = dayjs(new Date(new Date().toUTCString())).add(1, 'year').toDate().getTime() / 1000

        let mintPass = new DiamondMintPass()

        Object.assign(mintPass, {
            _id: random(256).toString(),
            to:to,
            tokenId: tokenId,
            amount: amount,
            expires: expires
        })

        await this.diamondMintPassRepository.put(mintPass, options)

        return mintPass
    }

    async generateMintPass(to:string, amount:string, options?:any): Promise<DiamondMintPass> {

        let expires = dayjs(new Date(new Date().toUTCString())).add(1, 'year').toDate().getTime() / 1000

        let mintPass = new DiamondMintPass()

        Object.assign(mintPass, {
            _id: random(256).toString(),
            to:to,
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

    async getByTokenId(tokenId:number, options?:any): Promise<DiamondMintPass[]> {
        return this.diamondMintPassRepository.getByTokenId(tokenId, options)
    }

    async getByAddress(address:string, options?:any): Promise<DiamondMintPass[]> {
        return this.diamondMintPassRepository.getByAddress(address, options)
    }


}

export {
    DiamondMintPassService
}