import { DiamondMintPass } from "../dto/diamond-mint-pass.js"
import { User } from "../dto/user.js"

interface DiamondMintPassRepository {
    get(id:number, options?:any): Promise<DiamondMintPass>
    put(dmp:DiamondMintPass, options?:any) : Promise<DiamondMintPass>

    getByUser(user:User, options?:any): Promise<DiamondMintPass[]>
    getUnmintedByUser(user:User, options?:any): Promise<DiamondMintPass[]>

    getUnsigned(options?:any): Promise<DiamondMintPass[]>
}

export {
    DiamondMintPassRepository
}
