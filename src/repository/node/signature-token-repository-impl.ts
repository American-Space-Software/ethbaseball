import {  injectable } from "inversify"
import { SignatureTokenRepository } from "../signature-token-repository.js"
import { SignatureToken } from "../../dto/signature-token.js"


@injectable()
class SignatureTokenRepositoryNodeImpl implements SignatureTokenRepository {

    async get(id:string, options?:any): Promise<SignatureToken> {
        return SignatureToken.findByPk(id, options)
    }

    async put(token:SignatureToken, options?:any): Promise<SignatureToken> {

        await token.save(options)
        return token

    }

}


export {
    SignatureTokenRepositoryNodeImpl
}