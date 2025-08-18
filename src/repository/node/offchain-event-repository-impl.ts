import {  injectable } from "inversify"

import { OffchainEventRepository } from "../offchain-event-repository.js"
import { OffchainEvent } from "../../dto/offchain-event.js"
import { Owner } from "../../dto/owner.js"
import { Op } from "sequelize"


@injectable()
class OffchainEventRepositoryNodeImpl implements OffchainEventRepository {

    async get(id:string, options?:any): Promise<OffchainEvent> {
        return OffchainEvent.findByPk(id, options)
    }

    async put(offchainEvent:OffchainEvent, options?:any): Promise<OffchainEvent> {

        await offchainEvent.save(options)
        return offchainEvent
    }

    async getByOwner(contractType:string, owner:Owner, options?:any) : Promise<OffchainEvent[]>  {

        return OffchainEvent.findAll(Object.assign({
            where: {
                [Op.and]: {
                    contractType: contractType, 
                    [Op.or]: [{ fromAddress: owner._id }, { toAddress: owner._id }]
                }
            },
            order: [ ['dateCreated', 'DESC'] ]
        }, options))

    }

    async getByTokenId(contractType:string, tokenId:number, options?:any) : Promise<OffchainEvent[]>  {

        return OffchainEvent.findAll(Object.assign({
            where: {
                [Op.and]: {
                    contractType: contractType, 
                    [Op.or]: [{ fromTokenId: tokenId }, { toTokenId: tokenId }]
                }
            },
            order: [ ['dateCreated', 'DESC'] ]
        }, options))

    }

    async list(contractType:string, options?:any) : Promise<OffchainEvent[]>  {

        return OffchainEvent.findAll(Object.assign({
            where: {
                [Op.and]: {
                    contractType: contractType
                }
            },
            order: [ ['dateCreated', 'DESC'] ]
        }, options))

    }

}


export {
    OffchainEventRepositoryNodeImpl
}