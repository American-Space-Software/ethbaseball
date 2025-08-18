import { Owner } from "../dto/owner.js"

interface OwnerRepository {
    get(id:string, options?:any): Promise<Owner>
    listByCount(options?:any): Promise<Owner[]> 
    listByDiamonds(options?:any): Promise<Owner[]> 
    listByOffChainDiamonds(options?:any): Promise<Owner[]>
    put(owner:Owner, options?:any) : Promise<Owner>
    putAll(owners:Owner[], options?:any) : Promise<void>
    getByUserId(discordId:string, options?:any) : Promise<Owner>
    removeUserId(owner:Owner, options?:any)
    rerank(options?:any) : Promise<void>
    getByIds(_ids:string[], options?:any) : Promise<Owner[]>
    clearAllTransactions( options?:any ): Promise<void>
    getUpdatedSince(lastUpdated:Date, options?: any) : Promise<Owner[]>
    count(options?:any): Promise<number> 
}

export {
    OwnerRepository
}
