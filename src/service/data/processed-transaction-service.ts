import { inject, injectable } from "inversify"


import { ERCIndexResult } from "../universe-indexer-service.js"
import { Block } from "../../dto/block.js"
import { BlockService } from "./block-service.js"
import { Transaction } from "../../dto/transaction.js"
import { TransactionService } from "../transaction-service.js"
import { ProcessedTransactionRepository } from "../../repository/processed-transaction-repository.js"
import { OwnerService } from "./owner-service.js"
import { ProcessedEvent, ProcessedTransaction } from "../../dto/processed-transaction.js"
import { TeamService } from "../data/team-service.js"
import { ethers } from "ethers"
import { TeamLeagueSeason } from "../../dto/team-league-season.js"
import { TeamLeagueSeasonService } from "./team-league-season-service.js"
import { SeasonService } from "./season-service.js"
import { Season } from "../../dto/season.js"
import { Team } from "../../dto/team.js"
import { PlayerService } from "./player-service.js"
import { Player } from "../../dto/player.js"

@injectable()
class ProcessedTransactionService {

    @inject("ProcessedTransactionRepository")
    private processedTransactionRepository:ProcessedTransactionRepository

    constructor(
        private teamService:TeamService,
        private playerService:PlayerService,
        private seasonService:SeasonService,
        private teamLeagueSeasonService:TeamLeagueSeasonService,
        private ownerService:OwnerService,
        private blockService:BlockService,
        private transactionService:TransactionService,
        @inject("config") private config:Function
    ) {}

    async get(_id:string, options?:any) {
        return this.processedTransactionRepository.get(_id,options)
    }

    async getByIds(_ids:string[], options?:any) : Promise<ProcessedTransaction[]> {
        return this.processedTransactionRepository.getByIds(_ids, options)
    }

    async getViewModel(_id:string, options?:any) : Promise<TransactionViewModel> {

        let transaction = await this.processedTransactionRepository.get(_id, options)
        if (!transaction) return


        let events = await this.processedTransactionRepository.getEventsByTransaction(transaction)

        return {
            transaction: this._translateProcessedTransactionToViewModel(transaction),
            events: events.map( e => this._translateProcessedEventToViewModel(e))
        }


    }

    async put(processedTransaction:ProcessedTransaction, options?:any) {
        return this.processedTransactionRepository.put(processedTransaction, options)
    }

    /**
     * No validation for speeeeeeeeed
     * @param ercEvents 
     * @returns 
    */
    async putAll(transactions:ProcessedTransaction[], options?:any) {
        return this.processedTransactionRepository.putAll(transactions, options)
    }

    async putEvent(event: ProcessedEvent, options?:any): Promise<ProcessedEvent> {
        return this.processedTransactionRepository.putEvent(event, options)
    }

    async putEvents(events:ProcessedEvent[], options?:any) {
        return this.processedTransactionRepository.putEvents(events, options)
    }

    async list(limit: number, skip: number, options?:any) : Promise<ProcessedTransaction[]> {
        return this.processedTransactionRepository.list(limit, skip, options)
    }

    async listByTokens(tokenIds:number[], limit:number, options?:any) : Promise<ProcessedTransaction[]> {
        return this.processedTransactionRepository.listByTokens(tokenIds, options)
    }

    async listIdByToken(tokenId:number, limit:number, options?:any) : Promise<string[]> {
        return this.processedTransactionRepository.listIdByToken(tokenId, options)
    }

    async listByTrader(owner:string, options?:any) : Promise<ProcessedTransaction[]> {
        return this.processedTransactionRepository.listByTrader(owner, options)
    }

    async listIdsByTrader(owner:string, offset:number, limit:number, options?:any) : Promise<string[]> {
        return this.processedTransactionRepository.listIdsByTrader(owner, offset, limit, options)
    }

    async listIds(limit:number, offset:number, options?:any) : Promise<string[]> {
        return this.processedTransactionRepository.listIds(limit, offset, options)
    }

    async getLatest(contractAddress:string, beforeBlock?:number, options?:any) : Promise<ProcessedTransaction> {

        return this.processedTransactionRepository.getLatest(contractAddress, beforeBlock, options)

    }

    async getLatestViewModel(contractAddress:string, beforeBlock?:number, options?:any) : Promise<TransactionViewModel> {

        let transaction = await this.processedTransactionRepository.getLatest(contractAddress, beforeBlock, options)
        if (!transaction) return

        let events = await this.processedTransactionRepository.getEventsByTransaction(transaction)

        return {
            transaction: this._translateProcessedTransactionToViewModel(transaction),
            events: events.map( e => this._translateProcessedEventToViewModel(e))
        }

    }

    public async getEventsByOwner(contractAddress:string, ownerId:string, options?:any) : Promise<ProcessedEvent[]> {
        return this.processedTransactionRepository.getEventsByOwner(contractAddress, ownerId, options)
    }

    public async getAllEvents(options?:any) : Promise<ProcessedEvent[]> {
        return this.processedTransactionRepository.getAllEvents(options)
    }

    public async getAllEventsByToken(tokenId:number, options?:any) : Promise<ProcessedEvent[]> {
        return this.processedTransactionRepository.getAllEventsByToken(tokenId, options)
    }

    public async getAllEventsByAddress(address:string, options?:any) : Promise<ProcessedEvent[]> {
        return this.processedTransactionRepository.getAllEventsByAddress(address, options)
    }

    public async getAllEventsByTransactionIds(transactionIds:string[], options?:any) : Promise<ProcessedEvent[]> {
        return this.processedTransactionRepository.getAllEventsByTransactionIds(transactionIds, options)
    }

    public async getLastTransferByToken(contractAddress:string, tokenId:number, options?:any) : Promise<ProcessedEvent> {
        return this.processedTransactionRepository.getLastTransferByToken(contractAddress, tokenId, options)
    }

    public getUnprocessedDepositEvents(contractAddress:string, options?:any) : Promise<ProcessedEvent[]> {
        return this.processedTransactionRepository.getUnprocessedDepositEvents(contractAddress, options)
    }

    public async listWithEvents(options?:any) {
        let events = await this.getAllEvents( options)
        return this.buildListWithEvents(events, options)
    }

    public async listWithEventsByToken(tokenId:number, options?:any) {

        let events = await this.getAllEventsByToken(tokenId, options)
        return this.buildListWithEvents(events, options)
    }

    public async listWithEventsByAddress(address:string, options?:any) {

        let events = await this.getAllEventsByAddress(address, options)
        return this.buildListWithEvents(events, options)

    }

    async buildListWithEvents(events:ProcessedEvent[], options?:any) {

        if (events.length <= 0) {
            return {
                transactions: [],
                teams: []
            }
        } 

        let transactions = await this.getByIds( events.map( e => e.processedTransactionId), options)

        // let season:Season = await this.seasonService.getMostRecent()
        let players:Player[] = await this.playerService.getByTokenIds(events.map( e => e.tokenId), options)

        return {
            transactions: transactions.map( t => {
                return {
                    transaction: t,
                    events: events.filter( e => e.processedTransactionId == t._id ),
                }
            }),
            players: players.map( p => { return { _id: p._id, name: p.fullName } })
        }

    }


    public groupEventsByTransaction(events:ProcessedEvent[]) {
    
      let transactions = []

      for (let e of events) {
        
        let existing = transactions.find( oct => oct.processedTransactionId == e.processedTransactionId)

        if (existing) {
          existing.events.push(e)
        } else {
          transactions.push({
            processedTransactionId: e.processedTransactionId,
            blockNumber: e.blockNumber,
            events: [e]
          })
        }

      }

      return transactions
    }

    public async getEnsFromEvents(processedEvents, options) {

        let ens = {}

        let addresses = []
        
        for (let processedEvent of processedEvents) {

            if (processedEvent.fromAddress?.length > 0 && !addresses.includes(processedEvent.fromAddress) ) {
                addresses.push(processedEvent.fromAddress)
            }

            if (processedEvent.toAddress?.length > 0  && !addresses.includes(processedEvent.toAddress)) {
                addresses.push(processedEvent.toAddress)
            }

            if (processedEvent.namedArgs.owner?.length > 0  && !addresses.includes(processedEvent.namedArgs.owner) ) {
                addresses.push(processedEvent.namedArgs.owner)
            }


            if (processedEvent.namedArgs.operator?.length > 0  && !addresses.includes(processedEvent.namedArgs.operator) ) {
                addresses.push(processedEvent.namedArgs.operator)
            }

            if (processedEvent.namedArgs.approved?.length > 0  && !addresses.includes(processedEvent.namedArgs.approved)) {
                addresses.push(processedEvent.namedArgs.approved)
            }            

        }

        let tokenOwners = await this.ownerService.getByIds(addresses, options)


        // for (let tokenOwner of tokenOwners) {
        //     ens[tokenOwner._id] = tokenOwner.ensName ? tokenOwner.ensName : this.walletService.truncateEthAddress(tokenOwner._id)
        // }

        return ens
        

    }

    translateTransactionViewModel(transaction:ProcessedTransaction, events:ProcessedEvent[]) : TransactionViewModel {

        return {
            transaction: this._translateProcessedTransactionToViewModel(transaction),
            events: events.map(event => this._translateProcessedEventToViewModel(event))
        }


    }

    private _translateProcessedTransactionToViewModel(transaction:ProcessedTransaction) : ProcessedTransactionViewModel {
        return {
            _id: transaction._id,
            blockNumber: transaction.blockNumber,
            transactionFrom: transaction.transactionFrom,
            tokenTraders: transaction.tokenTraderIds,
            timestamp: transaction.timestamp,
            tokenIds: transaction.tokenIds,
            // transactionValue: transaction.transactionValue
        }
    }

    private _translateProcessedEventToViewModel(event:ProcessedEvent) : ProcessedEventViewModel {
        return {
            isMint: event.isMint,
            isBurn: event.isBurn,
            namedArgs: event.namedArgs,
            tokenId: event.tokenId,
            fromAddress: event.fromAddress,
            toAddress: event.toAddress,
            event: event.event
        }
    }

    // async deleteERC721BetweenBlocks(contractAddress:string, result:ERCIndexResult, blockConfirmations:number, options?:any)  {

    //     // console.log(`Deleting between block #${result.startBlock} - ${result.endBlock}`)

    //     let processedTransactions:ProcessedTransaction[] = await this.processedTransactionRepository.findByContractBetweenBlocks(contractAddress, result.startBlock, result.endBlock, options)
 
    //     //Get affected tokens. Reset lastTransactionId and owner
    //     const tokenIds = Array.from(new Set(processedTransactions.flatMap(({ tokenIds }) => tokenIds)))

    //     for (let tokenId of tokenIds) {

    //         if (!result.tokensToUpdate[tokenId]) {
    //             result.tokensToUpdate[tokenId] = await this.teamService.getByTokenId(tokenId, options)
    //         }

    //         let token = result.tokensToUpdate[tokenId]

    //         //Remove ownership history after start block
    //         // token.ownershipHistory = token.ownershipHistory?.filter(oh => oh.blockNumber < result.startBlock)
    //         let events = await this.processedTransactionRepository.getEventsByToken(contractAddress, tokenId, options)

    //         //Remove transactions after start block
    //         events = events.filter( tvm => tvm.blockNumber < result.startBlock)


    //         //Set current owner to the last one before the start block
    //         for (let event of events) {
    //             if (event.toAddress) {
    //                 token.currentOwnerId = event.toAddress
    //                 break
    //             }
    //         }

    //     }

    //     //Get affected traders. Reset latestTransactionId
    //     const tokenTraders = Array.from(new Set(processedTransactions.flatMap(({ tokenTraderIds }) => tokenTraderIds)))
        
    //     for (let user of tokenTraders) {

    //         if (!result.ownersToUpdate[user]) {
    //             result.ownersToUpdate[user] = await this.ownerService.getOrCreate(user, options)
    //         }

    //         let processEvents = await this.processedTransactionRepository.getEventsByOwner(contractAddress, user, options)

    //         //Remove processEvents after start block
    //         processEvents = processEvents.filter( tvm => tvm.blockNumber < result.startBlock)

    //         //Figure out which tokens they own 
    //         await this.ownerService.setTokenIds(result.ownersToUpdate[user], processEvents)

    //     }

    //     //Delete transactions
    //     for (let transaction of processedTransactions) {
    //         await this.processedTransactionRepository.remove(transaction, options)

    //         //Remove from results so we don't retain it.
    //         delete result.processedTransactionViewModels[transaction._id]
    //     }

    //     //Delete any actual blocks or underlying transactions that are more than blockConfirmations old
    //     let blocks:Block[] = await this.blockService.findBetweenBlocks(result.endBlock - blockConfirmations, result.endBlock, options)
    //     let transactions:Transaction[] = await this.transactionService.findBetweenBlocks(result.endBlock - blockConfirmations, result.endBlock, options)
        
    //     for (let block of blocks) {
    //         // console.log(`Clearing block #${block._id}`)
    //         await this.blockService.remove(block, options)
    //     }

    //     for (let transaction of transactions) {
    //         // console.log(`Clearing transaction #${transaction._id}`)
    //         await this.transactionService.remove(transaction, options)
    //     }


    // }

    async deleteERCBetweenBlocks(result:ERCIndexResult, options?:any)  {

        // console.log(`Deleting between block #${result.startBlock} - ${result.endBlock}`)
        let processedTransactions:ProcessedTransaction[] = await this.processedTransactionRepository.findBetweenBlocks(result.startBlock, result.endBlock, options)
        let processedEvents:ProcessedEvent[] = await this.processedTransactionRepository.findEventsBetweenBlocks(result.startBlock, result.endBlock, options)

        //Make sure we're not trying to delete anything that is already processed.
        for (let e of processedEvents) {
            if (e.offChainEventId) throw new Error(`Can not delete event that's already processed offline: ${e.offChainEventId}`)
        }


        //Get affected tokens. Reset lastTransactionId and owner
        const tokenIds = Array.from(new Set(processedTransactions.flatMap(({ tokenIds }) => tokenIds)))

        for (let tokenId of tokenIds) {

            if (!result.tokensToUpdate[tokenId]) {
                result.tokensToUpdate[tokenId] = await this.playerService.getByTokenId(tokenId, options)
            }

        }

        //Get affected traders. Reset latestTransactionId
        const tokenTraders = Array.from(new Set(processedTransactions.flatMap(({ tokenTraderIds }) => tokenTraderIds)))
        
        for (let user of tokenTraders) {

            if (!result.ownersToUpdate[user]) {
                result.ownersToUpdate[user] = await this.ownerService.getOrCreate(user, options)
            }

        }




        //Get affected traders.
        const diamondTraders = Array.from(new Set(processedTransactions.flatMap(({ diamondTraderIds }) => diamondTraderIds)))
        
        for (let user of diamondTraders) {

            if (!result.ownersToUpdate[user]) {
                result.ownersToUpdate[user] = await this.ownerService.getOrCreate(user, options)
            }

        }

        //Delete transactions
        for (let transaction of processedTransactions) {

            await this.processedTransactionRepository.remove(transaction, options)

            //Remove from results so we don't retain it.
            delete result.processedTransactionViewModels[transaction._id]
        }


        //Delete any actual blocks or underlying transactions that are more than blockConfirmations old
        let blocks:Block[] = await this.blockService.findBetweenBlocks(result.startBlock, result.endBlock, options)
        let transactions:Transaction[] = await this.transactionService.findBetweenBlocks(result.startBlock, result.endBlock, options)
        
        for (let block of blocks) {
            // console.log(`Clearing block #${block._id}`)
            await this.blockService.remove(block, options)
        }

        for (let transaction of transactions) {
            // console.log(`Clearing transaction #${transaction._id}`)
            await this.transactionService.remove(transaction, options)
        }

    }

    async remove(processedTransaction:ProcessedTransaction, options?:any) : Promise<void> {
        return this.processedTransactionRepository.remove(processedTransaction, options)
    }

    async getPreviousByInitiator(address:string, blockNumber:number, transactionIndex:number, options?:any) : Promise<ProcessedTransaction> {
        return this.processedTransactionRepository.getPreviousByInitiator(address, blockNumber, transactionIndex, options)
    }

    createProcessedEventUniverse(currentTransaction:ProcessedTransaction, e:any) {

        let processedEvent:ProcessedEvent = new ProcessedEvent()
        processedEvent.contractAddress = ethers.getAddress(e.address)
        processedEvent.processedTransactionId = currentTransaction._id
        processedEvent.blockNumber = currentTransaction.blockNumber
        processedEvent.transactionIndex = currentTransaction.transactionIndex
        processedEvent.logIndex =  Number(e.logIndex)
        processedEvent._id = `${processedEvent.processedTransactionId}-${processedEvent.logIndex}`
        // processedEvent.isMint = e.isMint
        // processedEvent.isBurn = e.isBurn
        processedEvent.event = e.event
        processedEvent.namedArgs = {}

        processedEvent.data = e.data
        processedEvent.topics = e.topics
         
            //Convert BigInt args to strings    
        processedEvent.args = e.args?.map(a => a.toString())

        processedEvent.event = this.getEventName(e.topics[0])
        
        if (processedEvent.event) {

            switch(processedEvent.event) {

                case "Transfer":
                    processedEvent.isTransfer = true
                    processedEvent.namedArgs.fromAddress = processedEvent.args[0]
                    processedEvent.namedArgs.toAddress = processedEvent.args[1]
                    processedEvent.namedArgs.tokenId = processedEvent.args[2]
                    break
                case "Approval":
                    processedEvent.namedArgs.owner = processedEvent.args[0]
                    processedEvent.namedArgs.approved = processedEvent.args[1]
                    processedEvent.namedArgs.tokenId = processedEvent.args[2]
                    break
                case "ApprovalForAll":
                    processedEvent.namedArgs.owner = processedEvent.args[0]
                    processedEvent.namedArgs.operator = processedEvent.args[1]
                    processedEvent.namedArgs.approved = processedEvent.args[2]
                    break
            }


            if (processedEvent.isTransfer && processedEvent.namedArgs?.fromAddress == "0x0000000000000000000000000000000000000000") {
                processedEvent.isMint = true
            }

            if (processedEvent.isTransfer && processedEvent.namedArgs?.toAddress == "0x0000000000000000000000000000000000000000") {
                processedEvent.isBurn = true
            }


            if (processedEvent.namedArgs?.fromAddress) {
                processedEvent.fromAddress = processedEvent.namedArgs.fromAddress
            }

            if (processedEvent.namedArgs?.toAddress) {
                processedEvent.toAddress = processedEvent.namedArgs.toAddress
            }

            if (processedEvent.namedArgs?.tokenId) {
                processedEvent.tokenId = parseInt(processedEvent.namedArgs.tokenId)
            }

            if (processedEvent.namedArgs?.amount) {
                processedEvent.amount = processedEvent.namedArgs.amount.toString()
            }

        }

        
        return processedEvent

    }

    createProcessedEventDiamond(currentTransaction:ProcessedTransaction, e:any) : ProcessedEvent {

        let processedEvent:ProcessedEvent = new ProcessedEvent()
        processedEvent.contractAddress = ethers.getAddress(e.address)
        processedEvent.processedTransactionId = currentTransaction._id
        processedEvent.blockNumber = currentTransaction.blockNumber
        processedEvent.transactionIndex = currentTransaction.transactionIndex
        processedEvent.logIndex =  Number(e.logIndex) 
        processedEvent._id = `${processedEvent.processedTransactionId}-${processedEvent.logIndex}`
        // processedEvent.isMint = e.isMint
        // processedEvent.isBurn = e.isBurn
        processedEvent.event = e.event
        processedEvent.namedArgs = {}

        processedEvent.data = e.data
        processedEvent.topics = e.topics
        
    
        processedEvent.event = this.getEventName(e.topics[0])
        

        //Convert BigInt args to strings    
        processedEvent.args = e.args?.map(a => a.toString())


        switch(processedEvent.event) {

            case "Transfer":
                processedEvent.isTransfer = true
                processedEvent.namedArgs.fromAddress = processedEvent.args[0]
                processedEvent.namedArgs.toAddress = processedEvent.args[1]
                processedEvent.namedArgs.amount = processedEvent.args[2]
                break

            case "MintReward":
                processedEvent.namedArgs.toAddress = processedEvent.args[0]
                processedEvent.namedArgs.mintPassId = processedEvent.args[1]
                processedEvent.namedArgs.amount = processedEvent.args[2]
                break

            case "WithdrawFromTeam":
                processedEvent.namedArgs.toAddress = processedEvent.args[0]
                processedEvent.namedArgs.mintPassId = processedEvent.args[1]
                processedEvent.namedArgs.amount = processedEvent.args[2]
                processedEvent.namedArgs.tokenId = processedEvent.args[3]
                break

            case "DepositToTeam":
                processedEvent.namedArgs.fromAddress = processedEvent.args[0]
                processedEvent.namedArgs.tokenId = processedEvent.args[1]
                processedEvent.namedArgs.amount = processedEvent.args[2]
                break
        }

        if (processedEvent.isTransfer && processedEvent.namedArgs?.fromAddress == "0x0000000000000000000000000000000000000000") {
            processedEvent.isMint = true
        }

        if (processedEvent.isTransfer && processedEvent.namedArgs?.toAddress == "0x0000000000000000000000000000000000000000") {
            processedEvent.isBurn = true
        }


        if (processedEvent.namedArgs?.fromAddress) {
            processedEvent.fromAddress = processedEvent.namedArgs.fromAddress
        }

        if (processedEvent.namedArgs?.toAddress) {
            processedEvent.toAddress = processedEvent.namedArgs.toAddress
        }

        if (processedEvent.namedArgs?.tokenId) {
            processedEvent.tokenId = parseInt(processedEvent.namedArgs.tokenId)
        }

        if (processedEvent.namedArgs?.amount) {
            processedEvent.amount = processedEvent.namedArgs.amount.toString()
        }


        return processedEvent

    }



    attributeKeyToInteger(key:string) {
        let hash = 0, i, chr;

      if (key.length === 0) return hash

      for (i = 0; i < key.length; i++) {

        chr = key.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash |= 0 // Convert to 32bit integer
      }
      
      return hash
    }

    getEventName(hash) {

        hash = hash.toLowerCase()


        let transfer = ethers.id("Transfer(address,address,uint256)")
        let approval = ethers.id("Approval(address,address,uint256)")
        let approvalForAll = ethers.id("ApprovalForAll(address,address,bool)")

        let withdrawFromTeam  = ethers.id("WithdrawFromTeam(address,uint256,uint256,uint256)")
        let depositToTeam = ethers.id("DepositToTeam(address,uint256,uint256)")
        let mintReward = ethers.id("MintReward(address,uint256,uint256)")

        let roleGranted = ethers.id("RoleGranted(bytes32,address,address)")
        let roleRevoked = ethers.id("RoleRevoked(bytes32,address,address)")
        let roleAdminChanged = ethers.id("RoleAdminChanged(bytes32,bytes32,bytes32)")

        if (hash === roleGranted) return "RoleGranted"
        if (hash === roleRevoked) return "RoleRevoked"
        if (hash === roleAdminChanged) return "RoleAdminChanged"

        // ERC-721
        if (hash === transfer) return "Transfer";
        if (hash === approval) return "Approval";
        if (hash === approvalForAll) return "ApprovalForAll";

        // Custom Diamonds contract events
        if (hash === withdrawFromTeam) return "WithdrawFromTeam";
        if (hash === depositToTeam) return "DepositToTeam";
        if (hash === mintReward) return "MintReward";
    }


}



interface ProcessedTransactionsPage {
    lastUpdated?:string
    transactions?:TransactionViewModel[]
    rowItemViewModels?:{}
    // ens:{}
}

interface TransactionsViewModel {
    lastUpdated?:string
    transactions?:TransactionViewModel[],
    rowItemViewModels?:{}
    ens?:{}
}

interface ProcessedTransactionViewModel {
    _id?:string
    _rev?:string 
    blockNumber?:number
    transactionIndex?:number
    transactionFrom?:string
    tokenTraders?:string[]
    timestamp?:number
    tokenIds?:number[]
    // transactionValue?:TransactionValue
    previousId?:string
}

interface ProcessedEventViewModel {
    isMint: boolean
    isBurn: boolean
    namedArgs: any
    tokenId: number
    fromAddress: string
    toAddress: string
    event: string
}

interface TransactionViewModel {
    transaction?:ProcessedTransactionViewModel
    events?:ProcessedEventViewModel[]
}



export {
    ProcessedTransactionService, TransactionsViewModel, TransactionViewModel, ProcessedTransactionsPage
}

