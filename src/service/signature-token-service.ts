import { inject, injectable } from "inversify";

import { SignatureTokenRepository } from "../repository/signature-token-repository.js";
import { SignatureToken } from "../dto/signature-token.js";
import { v4 as uuidv4 } from 'uuid';


@injectable()
class SignatureTokenService {

    @inject("SignatureTokenRepository")
    private signatureTokenRepository:SignatureTokenRepository

    constructor(
    ) {}

    async get(_id:string, options?:any) : Promise<SignatureToken> {
        return this.signatureTokenRepository.get(_id, options)
    }

    async getOrCreate(address:string, options?:any) {

        let signatureToken:SignatureToken = await this.signatureTokenRepository.get(address, options)

        if (!signatureToken) {
            signatureToken = new SignatureToken()
            signatureToken._id = address
        }

        signatureToken.token = uuidv4()
        
        let now = new Date(new Date().toUTCString())
        signatureToken.expires = new Date(now.getTime() + 30 * 60 * 1000) 

        await this.signatureTokenRepository.put(signatureToken, options)

        return signatureToken



    }

    // async put(token:SignatureToken, options?:any) {
    //     return this.signatureTokenRepository.put(token, options)
    // }

}

export {
    SignatureTokenService
}