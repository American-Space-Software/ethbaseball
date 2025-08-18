import { SignatureToken } from "../dto/signature-token.js"

interface SignatureTokenRepository {
    get(id:string, options?:any): Promise<SignatureToken>
    put(token:SignatureToken, options?:any) : Promise<SignatureToken>
}

export {
    SignatureTokenRepository
}
