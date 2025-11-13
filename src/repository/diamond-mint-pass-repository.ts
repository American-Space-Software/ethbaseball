import { DiamondMintPass } from "../dto/diamond-mint-pass.js"

interface DiamondMintPassRepository {
    get(id:number, options?:any): Promise<DiamondMintPass>
    put(dmp:DiamondMintPass, options?:any) : Promise<DiamondMintPass>

    getByTokenId(tokenId:number, options?:any): Promise<DiamondMintPass[]>
    getByAddress(address:string, options?:any): Promise<DiamondMintPass[]>
    getUnmintedByAddress(address:string, options?:any): Promise<DiamondMintPass[]>
    getUnmintedByTeamId(teamId:string, options?:any): Promise<DiamondMintPass[]>

    getUnsigned(options?:any): Promise<DiamondMintPass[]>
}

export {
    DiamondMintPassRepository
}
