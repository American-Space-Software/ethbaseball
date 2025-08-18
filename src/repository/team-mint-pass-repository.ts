import { TeamMintPass } from "../dto/team-mint-pass.js"

interface TeamMintPassRepository {
    get(id:number, options?:any): Promise<TeamMintPass>
    put(dmp:TeamMintPass, options?:any) : Promise<TeamMintPass>

    getByTokenId(tokenId:number, options?:any): Promise<TeamMintPass[]>
    getByAddress(address:string, options?:any): Promise<TeamMintPass[]>
    getByAddressAndToken(address:string, tokenId:number, options?:any): Promise<TeamMintPass[]>
    delete(dmp:TeamMintPass, options?:any): Promise<void>
    getUnsigned(options?:any): Promise<TeamMintPass[]>
}

export {
    TeamMintPassRepository
}
