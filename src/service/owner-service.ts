import { inject, injectable } from "inversify";

import { OwnerRepository } from "../repository/owner-repository.js";
import { Owner } from "../dto/owner.js";

import { ProcessedEvent } from "../dto/processed-transaction.js";
import { ethers } from "ethers";



@injectable()
class OwnerService {

    @inject("OwnerRepository")
    private ownerRepository:OwnerRepository
    
    constructor(
    ) {}

    async get(_id:string, options?:any) {
        return this.ownerRepository.get(_id, options)
    }

    async getOrCreate(walletAddress:string, options?:any) {

        let existing:Owner = await this.ownerRepository.get(walletAddress, options)
        if (existing) return existing

        return this.ownerRepository.put(Object.assign(new Owner(), {
            _id: walletAddress,
            diamondBalance: "0",
            diamondBalanceDecimal: 0,
            offChainDiamondBalance: "0",
            offChainDiamondBalanceDecimal: 0,
            count: 0,
            transactionsViewModel: {
                transactions: [],
                rowItemViewModels: {}
            }
        }), options)

    }

    async getByUserId(discordId:string, options?:any) {
        return this.ownerRepository.getByUserId(discordId, options)
    }

    async getUpdatedSince(lastUpdated:Date, options?: any) : Promise<Owner[]> {
        return this.ownerRepository.getUpdatedSince(lastUpdated, options)
    }

    async listByCount(options?:any): Promise<Owner[]> {
        return this.ownerRepository.listByCount(options)
    }

    async listByDiamonds(options?:any): Promise<Owner[]> {
        return this.ownerRepository.listByDiamonds(options)
    }

    async listByOffChainDiamonds(options?:any): Promise<Owner[]> {
        return this.ownerRepository.listByOffChainDiamonds(options)
    }

    async put(owner:Owner, options?:any) {
        return this.ownerRepository.put(owner, options)
    }

    async removeUserId(owner:Owner, options?:any) {
        return this.ownerRepository.removeUserId(owner, options)
    }

    setTokenIds(owner:Owner, processedEvents:ProcessedEvent[]) {

        owner.tokenIds = []

        //Look through events
        for (let event of processedEvents) {

            if (event.toAddress && event.tokenId) {

                if (event.toAddress == owner._id) {

                    //Add
                    owner.tokenIds.push(event.tokenId)

                } else {

                    //Remove
                    if (owner.tokenIds.includes(event.tokenId)) {
                        owner.tokenIds.splice( owner.tokenIds.indexOf(event.tokenId), 1 )
                    }
                }

            }

        }

    }


    setDiamondBalance(owner:Owner, processedEvents:ProcessedEvent[]) {

        owner.diamondBalance = "0"

        //Look through events
        for (let event of processedEvents) {

            if (event.isTransfer && event.toAddress && event.namedArgs.amount) {
                if (event.toAddress == owner._id) {
                    owner.diamondBalance = (  BigInt(owner.diamondBalance || 0) + BigInt(event.namedArgs.amount) ).toString() 
                } else {
                    owner.diamondBalance = (  BigInt(owner.diamondBalance || 0) - BigInt(event.namedArgs.amount) ).toString() 
                }

            }

        }

        owner.diamondBalanceDecimal = parseFloat(ethers.formatUnits(owner.diamondBalance, "ether"))

    }


    setOfflineDiamondBalance(owner:Owner, offChainDiamondBalance:string) {
        owner.offChainDiamondBalance = offChainDiamondBalance
        owner.offChainDiamondBalanceDecimal = parseFloat(ethers.formatUnits(owner.offChainDiamondBalance, "ether"))
    }


    async count(options?:any): Promise<number> {
        return this.ownerRepository.count(options)
    }

    // async listViewModels(limit: number, skip: number, options?:any): Promise<LeaderboardRowViewModel[]> {

    //     let owners = await this.ownerRepository.list(limit, skip, options)

    //     return owners.map( (o, index) => {
    //         return {
    //             _id: o._id,
    //             count: o.count,
    //             rank: skip + index + 1
    //         }
    //     })

    // }

    async putAll(owners:Owner[], options?:any) {
        return this.ownerRepository.putAll(owners, options)
    }

    async getByIds(_ids:string[], options?:any) : Promise<Owner[]> {
        return this.ownerRepository.getByIds(_ids, options)
    }


    async clearAllTransactions( options?:any ): Promise<void> {
        return this.ownerRepository.clearAllTransactions(options)
    }




}



interface OwnerPage {
    tokenOwners?:LeaderboardRowViewModel[]
}


interface LeaderboardRowViewModel {
    _id?:string
    ensName?:string
    count?:number
    lastActive?:string
    rank?:number
}

export {
    OwnerService, OwnerPage, LeaderboardRowViewModel
}