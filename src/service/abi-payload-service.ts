import { inject, injectable } from "inversify";
import { AbiCoder, ethers, Signature, Wallet } from "ethers";
import dayjs from "dayjs";

@injectable()
class AbiPayloadService {

    constructor(
        @inject("wallet") private wallet:Wallet,
    ) { }

    async signDiamondMintPass(mintPassId:string, amount:string, expires:number, to:string) : Promise<SignatureInfo>  {

        let payload = AbiCoder.defaultAbiCoder().encode([ "uint", "uint",  "uint", "address", "uint" ], [ mintPassId, amount, expires, to, 1 ])
        let payloadHash = ethers.keccak256(payload)
            
        // // This adds the message prefix
        let signature = await this.wallet.signMessage(ethers.getBytes(payloadHash))
    
        let sig = Signature.from(signature)

        return {
            signature: sig,
            expires: expires,
            v: sig.v,
            r: sig.r,
            s: sig.s
        }

    }


}

interface SignatureInfo {
    signature:Signature
    expires:number
    v:number
    r:string
    s:string
}


export {
    AbiPayloadService, SignatureInfo
}