import { inject, injectable } from "inversify";

import { DiamondMintPassRepository } from "../repository/diamond-mint-pass-repository.js";
import { DiamondMintPass } from "../dto/diamond-mint-pass.js";
import { AbiPayloadService, SignatureInfo } from "./abi-payload-service.js";
import { TeamMintPassRepository } from "../repository/team-mint-pass-repository.js";


@injectable()
class MintPassIndexerService {

    @inject("DiamondMintPassRepository")
    private diamondMintPassRepository:DiamondMintPassRepository
    
    @inject("TeamMintPassRepository")
    private teamMintPassRepository:TeamMintPassRepository

    constructor(
        private abiPayloadService:AbiPayloadService
    ) {}


    async getUnsigned(options?:any): Promise<DiamondMintPass[]> {
        return this.diamondMintPassRepository.getUnsigned(options)
    }

    async processUnsignedMintPasses(options?:any) {

        //Diamonds
        let unsignedMintPasses = await this.getUnsigned(options)

        if (unsignedMintPasses?.length > 0) {

            console.log(`Signing ${unsignedMintPasses.length} diamond mint passes`)

            for (let mintPass of unsignedMintPasses) {

                let signatureInfo:SignatureInfo
                
                 //Sign as diamond mint passs
                signatureInfo = await this.abiPayloadService.signDiamondMintPass(mintPass._id, mintPass.amount, mintPass.expires, mintPass.toAddress)

                mintPass.s = signatureInfo.s
                mintPass.v = signatureInfo.v
                mintPass.r = signatureInfo.r

                await this.diamondMintPassRepository.put(mintPass, options)
            }
        }

    }

}

export {
    MintPassIndexerService
}