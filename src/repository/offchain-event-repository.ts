import { OffchainEvent } from "../dto/offchain-event.js"
import { Owner } from "../dto/owner.js"


interface OffchainEventRepository {
    get(id:string, options?:any): Promise<OffchainEvent> 
    put(offchainEvent:OffchainEvent, options?:any): Promise<OffchainEvent>
    getByOwner(contractAddress:string, owner:Owner, options?:any) : Promise<OffchainEvent[]>
    getByTokenId(contractAddress:string, tokenId:number, options?:any) : Promise<OffchainEvent[]>
    list(contractType:string, options?:any) : Promise<OffchainEvent[]>

}

export {
    OffchainEventRepository
}
