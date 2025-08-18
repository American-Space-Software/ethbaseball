import { inject, injectable } from "inversify";

import { Owner } from "../dto/owner.js";
import { OffchainEvent } from "../dto/offchain-event.js";
import { OffchainEventRepository } from "../repository/offchain-event-repository.js";
import { v4 as uuidv4 } from 'uuid';
import { ContractType } from "./enums.js";



@injectable()
class OffchainEventService {

    @inject("OffchainEventRepository")
    private offchainEventRepository:OffchainEventRepository

    constructor(
    ) {}

    async createMintEvent(toAddress:string, amount:string, options?:any) {

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.DIAMONDS
        offChainEvent.event = "Transfer"
        offChainEvent.fromAddress = "0x0000000000000000000000000000000000000000"
        offChainEvent.toAddress = toAddress
        offChainEvent.amount = amount

        await this.put(offChainEvent, options)
    }

    async createBurnEvent(fromAddress:string, amount:string, options?:any) {

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.DIAMONDS
        offChainEvent.event = "Transfer"
        offChainEvent.toAddress = "0x0000000000000000000000000000000000000000"
        offChainEvent.fromAddress = fromAddress
        offChainEvent.amount = amount

        await this.put(offChainEvent, options)
    }

    async createTeamMintEvent(toTokenId:number, amount:string, gameId:string, options?:any) {

        if (BigInt(amount) <= 0) throw new Error("Mint amount can not be negative.")

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.DIAMONDS
        offChainEvent.event = "Transfer"
        offChainEvent.fromAddress = "0x0000000000000000000000000000000000000000"
        offChainEvent.toTokenId = toTokenId
        offChainEvent.amount = amount
        offChainEvent.gameId = gameId

        await this.put(offChainEvent, options)

        return offChainEvent
    }


    async createTeamBurnEvent(fromTokenId:number, amount:string, gameId:string, options?:any) {

        if (BigInt(amount) >= 0) throw new Error("Burn amount can not be positive.")

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.DIAMONDS
        offChainEvent.event = "Transfer"
        offChainEvent.toAddress = "0x0000000000000000000000000000000000000000"
        offChainEvent.fromTokenId = fromTokenId
        offChainEvent.amount = (BigInt(0) - BigInt(amount)).toString()
        offChainEvent.gameId = gameId

        await this.put(offChainEvent, options)

        return offChainEvent

    }

    async get(_id:string, options?:any) : Promise<OffchainEvent> {
        return this.offchainEventRepository.get(_id, options)
    }

    async put(ofcs:OffchainEvent, options?:any) {
        return this.offchainEventRepository.put(ofcs, options)
    }

    async getByOwner(contractType:string, owner:Owner, options?:any) : Promise<OffchainEvent[]> {
        return this.offchainEventRepository.getByOwner(contractType, owner, options)
    }

    async getByTokenId(contractType:string, tokenId:number, options?:any) : Promise<OffchainEvent[]> {
        return this.offchainEventRepository.getByTokenId(contractType, tokenId, options)
    }

    async getBalanceForOwner(contractType:string, owner:Owner, options?:any) {

        let events:OffchainEvent[] = await this.getByOwner(contractType, owner, options)

        let diamondBalance = "0"

        //Look through events
        for (let event of events) {

            if (event.toAddress && event.amount) {
                if (event.toAddress == owner._id) {
                    diamondBalance = (  BigInt(diamondBalance || 0) + BigInt(event.amount) ).toString() 
                } else {
                    diamondBalance = (  BigInt(diamondBalance || 0) - BigInt(event.amount) ).toString() 
                }

            }

        }

        return diamondBalance

    }

    async getBalanceForTokenId(contractAddress:string, tokenId:number, options?:any) {

        let events:OffchainEvent[] = await this.offchainEventRepository.getByTokenId(contractAddress, tokenId, options)

        let diamondBalance = "0"

        //Look through events
        for (let event of events) {

            if (event.amount) {
                if (event.toTokenId == tokenId) {
                    diamondBalance = (  BigInt(diamondBalance || 0) + BigInt(event.amount) ).toString() 
                } else if (event.fromTokenId == tokenId) {
                    diamondBalance = (  BigInt(diamondBalance || 0) - BigInt(event.amount) ).toString() 
                }

            }

        }

        return diamondBalance


    }

    async list(contractType:string, options?:any) : Promise<OffchainEvent[]> {
        return this.offchainEventRepository.list(contractType, options)
    }


}




export {
    OffchainEventService
}