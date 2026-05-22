import {  injectable } from "inversify"

import { TradeRequestRepository } from "../trade-request-repository.js"
import { TradeRequest } from "../../dto/trade-request.js"



@injectable()
class TradeRequestRepositoryNodeImpl implements TradeRequestRepository {

    async get(id:string, options?:any): Promise<TradeRequest> {
        return TradeRequest.findByPk(id, options)
    }

    async put(tr:TradeRequest, options?:any): Promise<TradeRequest> {

        await tr.save(options)
        return tr

    }

}



export {
    TradeRequestRepositoryNodeImpl
}