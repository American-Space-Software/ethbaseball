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

        // //Diamonds
        // let unsignedMintPasses = await this.getUnsigned(options)

        // if (unsignedMintPasses?.length > 0) {

        //     console.log(`Signing ${unsignedMintPasses.length} diamond mint passes`)

        //     for (let mintPass of unsignedMintPasses) {

        //         let signatureInfo:SignatureInfo
                
        //         if (mintPass.teamId) {
        //             //Sign as diamond withdraw pass
        //             signatureInfo = await this.abiPayloadService.signDiamondWithdrawPass(mintPass._id, mintPass.amount, mintPass.teamId, mintPass.expires, mintPass.to)
        //         } else {
        //             //Sign as diamond mint passs
        //             signatureInfo = await this.abiPayloadService.signDiamondMintPass(mintPass._id, mintPass.amount, mintPass.expires, mintPass.to)
        //         }

        //         mintPass.s = signatureInfo.s
        //         mintPass.v = signatureInfo.v
        //         mintPass.r = signatureInfo.r

        //         await this.diamondMintPassRepository.put(mintPass, options)
        //     }

        // }


        // //Teams
        // let unsignedTeamMintPasses = await this.teamMintPassRepository.getUnsigned(options)

        // if (unsignedTeamMintPasses?.length > 0) {

        //     console.log(`Signing ${unsignedTeamMintPasses.length} team mint passes`)

        //     for (let mintPass of unsignedTeamMintPasses) {

        //         let signatureInfo:SignatureInfo
                
        //         if (mintPass.totalDiamonds) {
        //             //Sign as diamond mint pass
        //             signatureInfo = await this.abiPayloadService.signBuyWithDiamonds(mintPass.tokenId, mintPass.totalDiamonds, mintPass.expires, mintPass.to)
        //         } else {
        //             //Sign as diamond mint passs
        //             signatureInfo = await this.abiPayloadService.signBuyWithETH(mintPass.tokenId, mintPass.ethCost, mintPass.expires, mintPass.to)
        //         }

        //         mintPass.s = signatureInfo.s
        //         mintPass.v = signatureInfo.v
        //         mintPass.r = signatureInfo.r

        //         await this.teamMintPassRepository.put(mintPass, options)
        //     }

        // }


    }

}

export {
    MintPassIndexerService
}