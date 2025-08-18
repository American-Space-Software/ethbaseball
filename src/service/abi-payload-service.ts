import { inject, injectable } from "inversify";
import { AbiCoder, ethers, Signature, Wallet } from "ethers";
import dayjs from "dayjs";

@injectable()
class AbiPayloadService {

    constructor(
        @inject("wallet") private wallet:Wallet,
    ) { }

    async signBuyWithDiamonds(tokenId:number, totalDiamonds:string, expires:number, buyerAddress:string) : Promise<SignatureInfo> {

        let payload = AbiCoder.defaultAbiCoder().encode([ "uint", "uint", "uint", "address", "uint" ], [ tokenId, totalDiamonds, expires, buyerAddress, 2 ]) 
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

    async signBuyWithETH(tokenId:number, ethCost:string, expires:number, buyerAddress:string) : Promise<SignatureInfo> {

        let payload = AbiCoder.defaultAbiCoder().encode([ "uint", "uint", "uint", "address", "uint" ], [ tokenId, ethCost, expires, buyerAddress, 0 ]) //Buying with ETH, not reserved.
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

    async signForclosureWithETH(tokenId:number, ethCost:string, expires:number, buyerAddress:string) : Promise<SignatureInfo>  {

        let payload = AbiCoder.defaultAbiCoder().encode([ "uint", "uint", "uint", "address", "uint" ], [ tokenId, ethCost, expires, buyerAddress, 1 ]) //Buying with ETH, not reserved.
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

    async signDiamondMintPass(mintPassId:string, amount:string, expires:number, to:string) : Promise<SignatureInfo>  {

        let payload = AbiCoder.defaultAbiCoder().encode([ "uint", "uint",  "uint", "address", "uint" ], [ mintPassId, amount, expires, to, 4 ])
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

    async signDiamondWithdrawPass(mintPassId:string, amount:string, tokenId:number, expires:number, to:string) : Promise<SignatureInfo> {

        let payload = AbiCoder.defaultAbiCoder().encode([ "uint", "uint", "uint", "uint", "address", "uint" ], [ mintPassId, amount, tokenId, expires, to, 3 ])
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