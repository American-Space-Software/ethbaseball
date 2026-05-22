import { TradeRequest } from "../dto/trade-request.js"

interface TradeRequestRepository {
    get(id:string, options?:any): Promise<TradeRequest>
    put(tr:TradeRequest, options?:any) : Promise<TradeRequest>
}

export {
    TradeRequestRepository
}
