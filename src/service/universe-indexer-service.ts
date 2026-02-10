import { Contract, ethers, Provider } from "ethers";
import { inject, injectable } from "inversify";

import { Block } from "../dto/block.js";
import { BlockService } from "./data/block-service.js";

import { ContractState } from "../dto/contract-state.js";
import { ProcessedEvent, ProcessedTransaction } from "../dto/processed-transaction.js";
import { Transaction } from "../dto/transaction.js";
import { ContractStateService } from "./data/contract-state-service.js";
import { TransactionService } from "./transaction-service.js";
import { ProcessedTransactionService, TransactionViewModel } from "./data/processed-transaction-service.js";
import { Owner } from "../dto/owner.js";
import { OwnerService } from "./data/owner-service.js";
import { WalletService } from "./wallet-service.js";
import { TeamService } from "./data/team-service.js";
import { DiamondMintPass, Team } from "../dto/team.js";
import { DiamondMintPassService } from "./data/diamond-mint-pass-service.js";
import { LogEventService } from "./log-event-service.js";
import { Player } from "../dto/player.js";
import { PlayerService } from "./data/player-service.js";
import { OffchainEventService } from "./data/offchain-event-service.js";
import { UserService } from "./data/user-service.js";
import { User } from "../dto/user.js";
import { v4 as uuidv4 } from 'uuid';
import { TeamLeagueSeasonService } from "./data/team-league-season-service.js";
import { TeamLeagueSeason } from "../dto/team-league-season.js";
import { ContractType } from "./enums.js";

const MAX_BLOCKS_TO_INDEX = 10000

@injectable()
class UniverseIndexerService {
    
    @inject("sequelize")
    private sequelize: Function

    blockNumber: number

    contractState: ContractState

    universeContract: Contract
    diamondContract:Contract

    // universeContractAddress:string
    diamondContractAddress:string

    private isIndexing:boolean = false


    constructor(
        private playerService:PlayerService,
        private userService:UserService,
        private teamService:TeamService,
        @inject("WalletService") private walletService: WalletService,
        private blockService: BlockService,
        private processedTransactionService: ProcessedTransactionService,
        private transactionService: TransactionService,
        private contractStateService: ContractStateService,
        private ownerService: OwnerService,
        private diamondMintPassService:DiamondMintPassService,
        private offChainEventService:OffchainEventService,
        private logEventService:LogEventService,
        private teamLeagueSeasonService:TeamLeagueSeasonService
    ) { }

    BLOCK_CONFIRMATIONS = 35


    async init(diamondContract: Contract, options?:any) {

        let s = await this.sequelize()

        // this.universeContractAddress = await universeContract.getAddress()
        this.diamondContractAddress = await diamondContract.getAddress()


        console.log(`Starting transaction indexer for diamonds: ${this.diamondContractAddress}`)

        //Look up contract state
        this.contractState = await this._getContractState(ethers.getAddress(this.diamondContractAddress), options)
        
        // this.universeContract = universeContract
        this.diamondContract = diamondContract

        this.logEventService.init(this.universeContract, this.diamondContract)
        

    }


    clearIndexResult() {
        return { processedTransactionViewModels: {}, ownersToUpdate: {}, tokensToUpdate: {}, gameTransactionsToUpdate: {}, diamondMintPassesToUpdate: {} }
    }
    


    async runUniverseIndexer() : Promise<ERCIndexResult> {
  
        //Don't allow this to run if if it's already running
        if (this.isIndexing) return 

        let indexResult:ERCIndexResult = this.clearIndexResult()

        let s = await this.sequelize()

        this.isIndexing = true

        console.time(`Indexing universe...`)

        try {
  
            await s.transaction(async (t1) => {
    
                let options = { transaction: t1 }

                await this.indexUniverse(indexResult, options)
                    
                await this.saveResult(indexResult, options)

                await this.processDeposits(indexResult, options)


            })
    

            //Save contract state
            await this.contractStateService.put(this.contractState)


        } catch (ex) {
          console.log(ex)
        }

        console.timeEnd(`Indexing universe...`)

        this.isIndexing = false

        return indexResult
  
    }

    async indexUniverse(result: ERCIndexResult, options?:any): Promise<ERCIndexResult> {

        result.blockNumber = await this.walletService.provider.getBlockNumber()
        result.startBlock = this.getStartBlock(this.contractState)
        result.endBlock = this.getEndBlock(result.startBlock, result.blockNumber)  

        console.log(`Indexing events in blocks ${result.startBlock}-${result.endBlock}`)

        if (result.endBlock <= this.contractState.lastIndexedBlock) return

        //Remove transactions/events between start/end block numbers then re-insert
        await this.processedTransactionService.deleteERCBetweenBlocks(result, options)

        //Set most recent.
        // result.mostRecentTransaction = await this.processedTransactionService.getLatestViewModel(this.diamondContractAddress, result.startBlock, options)

        let allLogEvents = await this.logEventService.getRecentEvents(result.startBlock, result.endBlock)

        // result.isCurrent = this.blockNumber == result.endBlock

        await this.processUniverseEvents(allLogEvents, result)

        
        this.contractState.lastIndexedBlock = result.endBlock
    

    }

    private async saveResult(result:ERCIndexResult, options?:any) {

        //Save transactions
        await this.saveProcessedTransactions(result, options)


        //Save tokens
        // await this.saveTokens(result, options)

        //Save token owners
        await this.saveTokenOwners(result,options)

        //Save mint passes
        await this.saveDiamondMintPasses(result, options)


    }


    private async processDeposits(result:ERCIndexResult, options?:any) {

        //Check for deposits that are more than BLOCK_CONFIRMATIONS blocks old and don't have an associated off-chain event 
        let unprocessedDeposits:ProcessedEvent[] = await this.processedTransactionService.getUnprocessedDepositEvents(this.diamondContractAddress, options)

        let readyToProcess = unprocessedDeposits.filter( d => d.blockNumber < result.startBlock)

        console.log(`Deposits: ${unprocessedDeposits.length} pending ( ${readyToProcess?.length } ready to process )`)

        for (let unprocessedDeposit of readyToProcess) {
            await this.processDeposit(unprocessedDeposit, options)
        }

    }

    private async processDeposit(unprocessedDeposit:ProcessedEvent, options?:any) {

        //Get the user at this address and get their team
        let user:User = await this.userService.getByAddress(unprocessedDeposit.fromAddress, options)
        let teams:Team[] = await this.teamService.getByUser(user, options)

        if (teams?.length > 0) {

            let team:Team = teams[0]

            //Process the deposit
            let offChainEventTransactionId = uuidv4()
            let offChainEvent = await this.offChainEventService.createTeamMintEvent(team._id, unprocessedDeposit.amount, { type: "deposit" }, offChainEventTransactionId, options)

            //Make note of the offchain event associated with this event.
            unprocessedDeposit.offChainEventId = offChainEvent._id

            //Resave
            await this.processedTransactionService.putEvent(unprocessedDeposit, options)

            //make the offchain event aware of the processed event it was based on
            offChainEvent.processedEventId = unprocessedDeposit._id

            //Resave
            await this.offChainEventService.put(offChainEvent, options)

                    
            //Update team's balance.
            let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getMostRecent(team, options)

            tls.financeSeason.diamondBalance = await this.offChainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id, options)

            tls.changed("financeSeason", true)

            await this.teamLeagueSeasonService.put(tls, options)

        }

    }

    private async processUniverseEvents( events:any [], result:ERCIndexResult, options?:any) {

        let processedCount =0

        const groupedEvents = this.groupBy(events, e => e.transactionHash)

        if (groupedEvents.size > 0) {

            console.log(`Universe: Found ${events.length} events up to block ${result.endBlock}`)

            for (let key of groupedEvents.keys()) {

                // let currentTransaction:TransactionViewModel = {}
                let transactionUser: Owner

                let transactionEvents = groupedEvents.get(key)

                console.time(`Processesing / ${key} / (${processedCount + 1} of ${groupedEvents.size})`)

                const { block, transaction } = await this.getTransactionAndBlock(key, options)


                let processedTransaction = new ProcessedTransaction()

                processedTransaction._id = transaction.hash    
                processedTransaction.contractAddress = transaction.receipt.contractAddress
                processedTransaction.transactionFrom = transaction.from
                processedTransaction.blockNumber = transaction.blockNumber
                processedTransaction.transactionIndex = transaction.transactionIndex
                processedTransaction.tokenTraders = []
                processedTransaction.tokenIds = []
                processedTransaction.tokenTraderIds = []
                processedTransaction.diamondTraderIds = []
                processedTransaction.diamondTraders = []
                processedTransaction.timestamp = block.timestamp


                //Create processed events
                let processedEvents:ProcessedEvent[] = transactionEvents.map( te => {

                    let address = ethers.getAddress(te.address)

                    if (address == this.diamondContractAddress) return this.processedTransactionService.createProcessedEventDiamond(processedTransaction, te)
                    // if (address == this.universeContractAddress) return this.processedTransactionService.createProcessedEventUniverse(processedTransaction, te)
                    
                })


                for (let ercEvent of processedEvents) {

                    let fromOwner: Owner
                    let toOwner: Owner

                    if (!block || !processedTransaction) throw new Error("Block and/or transaction not found.")

                    //Look up/create the from address
                    transactionUser = await this._getTokenOwner(processedTransaction.transactionFrom, result, options)

                    transactionUser.lastActive = new Date(processedTransaction.timestamp * 1000)


                    //First handle withdraw events
                    //Diamonds
                    if( ercEvent.contractAddress == this.diamondContractAddress) {

                        if (ercEvent.event == "MintReward") {

                            let mintPass:DiamondMintPass = await this._getDiamondMintPass(ercEvent.namedArgs.mintPassId, result, options)

                            if (mintPass) { //in theory this could actually not be in the database if we're syncing an existing league
                                mintPass.processedTransactionId = processedTransaction._id
                            }
                            
                        }

                        if (ercEvent.isTransfer) {

                            //Look up/create the from address
                            fromOwner = await this._getTokenOwner(ercEvent.namedArgs.fromAddress, result, options)
                            toOwner = await this._getTokenOwner(ercEvent.namedArgs.toAddress, result, options)

                            if (fromOwner._id != "0x0000000000000000000000000000000000000000") {
                                fromOwner.diamondBalance = (BigInt(fromOwner.diamondBalance) - BigInt(ercEvent.namedArgs.amount)).toString()
                            }

                            if (toOwner._id != "0x0000000000000000000000000000000000000000") {
                                toOwner.diamondBalance = (BigInt(toOwner.diamondBalance) + BigInt(ercEvent.namedArgs.amount)).toString()
                            }

                        }

                    }

                    // if( ercEvent.contractAddress == this.universeContractAddress) {

                    //     //Tokens
                    //     if (ercEvent.namedArgs?.tokenId) {

                    //         let tokenId = parseInt(ercEvent.namedArgs.tokenId)

                    //         //Look up/create the from address
                    //         fromOwner = await this._getTokenOwner(ercEvent.namedArgs.fromAddress, result, options)
                    //         toOwner = await this._getTokenOwner(ercEvent.namedArgs.toAddress, result, options)

                    //         //Grab token info
                    //         let token:Team = await this._getToken(tokenId, result, options)

                    //         if (ercEvent.isTransfer) {
                    //             // token.ownerId = toOwner._id
                    //         }

                    //     }

                    // }


                }




                this.setProcessedTransactionTokens(result, processedTransaction, processedEvents)
                this.setProcessedTransactionTokenTraders(result, processedTransaction, processedEvents)
                this.setProcessedTransactionDiamondTraders(result, processedTransaction, processedEvents)


                result.processedTransactionViewModels[processedTransaction._id] = {
                    events: processedEvents,
                    transaction: processedTransaction
                }


                // result.mostRecentTransaction = result.processedTransactionViewModels[processedTransaction._id]

                console.timeEnd(`Processesing / ${key} / (${processedCount + 1} of ${groupedEvents.size})`)

                processedCount++

            }

        }


    }
    
    private async getTransactionAndBlock(transactionKey:string, options?:any) {

        let block: Block
        let transaction:Transaction

        //Grab block data
        while (transaction == undefined || block == undefined) {

            try {

                transaction = await this.transactionService.getOrDownload(transactionKey, options)
                block = await this.blockService.getOrDownload(transaction.blockNumber,options)

            } catch(ex){
                //Wait 30 seconds and try again
                console.log(`Problem fetching transaction and block data. Queueing for retry.`)
                await new Promise(r => setTimeout(r, 30000))
            }

        }

        return { block: block, transaction: transaction }
    }

    // private async saveTokens(result: ERCIndexResult, options?:any) {
        
    //     console.log(`Saving ${Object.keys(result.tokensToUpdate).length} tokens `)

    //     for (let tokenId of Object.keys(result.tokensToUpdate)) {

    //         let lastTransfer = await this.processedTransactionService.getLastTransferByToken(this.universeContractAddress, parseInt(tokenId), options)

    //         if (lastTransfer) {
    //             result.tokensToUpdate[tokenId].ownerId = lastTransfer.toAddress
    //         }

    //         await this.playerService.put(result.tokensToUpdate[tokenId], options)
    //     }

    // }

    private async saveProcessedTransactions(result: ERCIndexResult, options?:any) {

        console.log(`Saving ${Object.keys(result.processedTransactionViewModels).length} processed transactions`)

        let transactionsToSave = []
        let eventsToSave = []

        for (let _id of Object.keys(result.processedTransactionViewModels)) {
            transactionsToSave.push(result.processedTransactionViewModels[_id].transaction)
            eventsToSave.push(...result.processedTransactionViewModels[_id].events)
        }


        //Save transactions
        await this.processedTransactionService.putAll(transactionsToSave, options)

        //Save events
        await this.processedTransactionService.putEvents(eventsToSave, options)


    }

    private async saveTokenOwners(result: ERCIndexResult, options?:any) {

        console.time(`Saving ${Object.keys(result.ownersToUpdate).length} updated token owners`);

        for (let owner of Object.keys(result.ownersToUpdate)) {

            let tokenOwner = result.ownersToUpdate[owner]

            // //Set tokenIds
            // let tokenEvents = await this.processedTransactionService.getEventsByOwner(this.universeContractAddress, tokenOwner._id, options)

            // //Figure out which tokens they own 
            // this.ownerService.setTokenIds(tokenOwner, tokenEvents)


            //Set diamond balance
            let diamondEvents = await this.processedTransactionService.getEventsByOwner(this.diamondContractAddress, tokenOwner._id, options)

            tokenOwner.diamondBalance = "0"
            this.ownerService.setDiamondBalance(tokenOwner, diamondEvents)


            // //Update count before saving.
            tokenOwner.count = tokenOwner.tokenIds?.length

            tokenOwner.changed('diamondBalance', true)
            tokenOwner.changed('count', true)
            tokenOwner.changed('tokenIds', true)

            await this.ownerService.put(tokenOwner, options)

        }


        console.timeEnd(`Saving ${Object.keys(result.ownersToUpdate).length} updated token owners`);

    }

    private async saveDiamondMintPasses(result: ERCIndexResult, options?:any) {
        
        console.log(`Saving ${Object.keys(result.diamondMintPassesToUpdate).length} mint passes `)

        for (let mintPassId of Object.keys(result.diamondMintPassesToUpdate)) {
            await this.diamondMintPassService.put(result.diamondMintPassesToUpdate[mintPassId], options)
        }

    }

    // translateEventToERCEvent(event: any) : ERCEvent {

    //     let ercEvent = new ERCEvent()
    
    //     ercEvent.removed = event.removed
    //     ercEvent.address = event.address
    //     ercEvent.data = event.data
    //     ercEvent.topics = event.topics
    //     ercEvent.logIndex =  Number(event.logIndex) 
        
    //     ercEvent.event = event.fragment?.name
    //     ercEvent.eventSignature = event.eventSignature     
        
    //     ercEvent.dateCreated = new Date(new Date().toUTCString()).toJSON()
    //     ercEvent.transactionHash = event.transactionHash
    
    //     //Convert BigInt args to strings    
    //     ercEvent.args = event.args?.map(a => a.toString())

    //     ercEvent.namedArgs = {}

    //     //Check wether it's a transfer and if it's newer than the most recently recorded transfer
    //     if (ercEvent.address == this.universeContractAddress) {
            
    //         switch(ercEvent.event) {

    //             case "Transfer":
    //                 ercEvent.isTransfer = true
    //                 ercEvent.namedArgs.fromAddress = ercEvent.args[0]
    //                 ercEvent.namedArgs.toAddress = ercEvent.args[1]
    //                 ercEvent.namedArgs.tokenId = ercEvent.args[2]
    //                 break
    //             case "Approval":
    //                 ercEvent.namedArgs.owner = ercEvent.args[0]
    //                 ercEvent.namedArgs.approved = ercEvent.args[1]
    //                 ercEvent.namedArgs.tokenId = ercEvent.args[2]
    //                 break
    //             case "ApprovalForAll":
    //                 ercEvent.namedArgs.owner = ercEvent.args[0]
    //                 ercEvent.namedArgs.operator = ercEvent.args[1]
    //                 ercEvent.namedArgs.approved = ercEvent.args[2]
    //                 break


    //         }

    //     } else if (ercEvent.address == this.diamondContractAddress) {

    //         switch(ercEvent.event) {

    //             case "Transfer":
    //                 ercEvent.isTransfer = true
    //                 ercEvent.namedArgs.fromAddress = ercEvent.args[0]
    //                 ercEvent.namedArgs.toAddress = ercEvent.args[1]
    //                 ercEvent.namedArgs.amount = ercEvent.args[2]
    //                 break

    //             case "MintReward":
    //                 ercEvent.namedArgs.mintPassId = ercEvent.args[0]
    //                 ercEvent.namedArgs.amount = ercEvent.args[1]
    //                 break

    //             case "WithdrawFromTeam":
    //                 ercEvent.namedArgs.mintPassId = ercEvent.args[0]
    //                 ercEvent.namedArgs.tokenId = ercEvent.args[1]
    //                 ercEvent.namedArgs.amount = ercEvent.args[2]
    //                 break

    //             case "DepositToTeam":
    //                 ercEvent.namedArgs.mintPassId = ercEvent.args[0]
    //                 ercEvent.namedArgs.tokenId = ercEvent.args[1]
    //                 ercEvent.namedArgs.amount = ercEvent.args[2]
    //                 break
    //         }

    //     }

    //     if (ercEvent.isTransfer && ercEvent.namedArgs?.fromAddress == "0x0000000000000000000000000000000000000000") {
    //         ercEvent.isMint = true
    //     }

    //     if (ercEvent.isTransfer && ercEvent.namedArgs?.toAddress == "0x0000000000000000000000000000000000000000") {
    //         ercEvent.isBurn = true
    //     }

    
    //     // ercEvent._id = `${ercEvent.blockHash}-${ercEvent.transactionHash}-${ercEvent.logIndex}`

    //     return ercEvent
    // }

    /**
     * Gets contract state by address and creates a new record if it doesn't exist.
     * @param contractAddress 
     * @returns 
     */
    private async _getContractState(contractAddress: string, options?:any) {

        let contractState

        try {
            contractState = await this.contractStateService.get(contractAddress)
        } catch (ex) { }

        if (!contractState) {

            contractState = new ContractState()

            contractState._id = contractAddress
            contractState.lastIndexedBlock = 0

            try {
                await this.contractStateService.put(contractState, options)

            } catch (ex) {
                console.log(JSON.stringify(ex))
            }
        } else {
            // console.log(`Contract state exists`)
        }

        return contractState
    }

    private async _updateBlockNumber() {
        try {
            this.blockNumber = await this.walletService.provider.getBlockNumber()
        } catch (ex) { 
            console.log(ex) 
        }

    }

    private getStartBlock(contractState: ContractState) {
        if (!contractState.lastIndexedBlock) return 0

        let block = contractState.lastIndexedBlock - this.BLOCK_CONFIRMATIONS

        return block >= 0 ? block : 0

    }

    private getEndBlock(startBlock:number, blockNumber:number) {
        return blockNumber - startBlock > MAX_BLOCKS_TO_INDEX ? startBlock + MAX_BLOCKS_TO_INDEX : blockNumber
    }



    private async _getTokenOwner(ownerAddress, result:ERCIndexResult, options?:any) {
       
        if (!ownerAddress) return

        if (!result.ownersToUpdate[ownerAddress]) {
            let tokenOwner: Owner = await this.ownerService.getOrCreate(ownerAddress, options)
            result.ownersToUpdate[ownerAddress] = tokenOwner
        } 

        return result.ownersToUpdate[ownerAddress]
    }

    private async _getToken(tokenId, result:ERCIndexResult, options?:any) {

        if (!result.tokensToUpdate[tokenId]) {

            let player:Player = await this.playerService.getByTokenId(tokenId, options)

            if (player) {
                result.tokensToUpdate[tokenId] = player
            }

        } 

        return result.tokensToUpdate[tokenId]

    }

    private async _getDiamondMintPass(mintPassId:number, result:ERCIndexResult, options?:any) {

        if (!result.diamondMintPassesToUpdate[mintPassId]) {

            let diamondMintPass:DiamondMintPass = await this.diamondMintPassService.get(mintPassId, options)

            if (diamondMintPass) {
                result.diamondMintPassesToUpdate[mintPassId] = diamondMintPass
            }

        } 

        return result.diamondMintPassesToUpdate[mintPassId]

    }

    private setProcessedTransactionTokens (result:ERCIndexResult, processedTransaction:ProcessedTransaction, processedEvents:ProcessedEvent[]) {

        //Grab token ids from transactions and save on transaction
        let tokenIds = processedEvents?.map(pe => pe.tokenId).filter(x => x !== undefined)

        if (tokenIds?.length > 0) {
            processedTransaction.tokenIds = Array.from(new Set(processedEvents?.map(pe => pe.tokenId)?.filter(n => n)))
            processedTransaction.tokens = processedTransaction.tokenIds?.map( t => result.tokensToUpdate[t] )
        }
        
    }

    private setProcessedTransactionTokenTraders(result:ERCIndexResult, processedTransaction:ProcessedTransaction, processedEvents:ProcessedEvent[]) {

        //Grab token senders
        let from = new Set(processedEvents?.map(pe => pe.fromAddress))
        let to = new Set(processedEvents?.map(pe => pe.toAddress))

        let tokenTraders = Array.from(new Set([...from, ...to])).filter(n => n !== undefined)
        
        if (tokenTraders?.length > 0) {
            processedTransaction.tokenTraderIds.push(...tokenTraders)
            processedTransaction.tokenTraders = processedTransaction.tokenTraderIds?.map( t => result.ownersToUpdate[t] )
        }

    }

    private setProcessedTransactionDiamondTraders(result:ERCIndexResult, processedTransaction:ProcessedTransaction, processedEvents:ProcessedEvent[]) {

        //Grab token senders
        let from = new Set(processedEvents?.map(pe => pe.fromAddress))
        let to = new Set(processedEvents?.map(pe => pe.toAddress))

        let diamondTraders = Array.from(new Set([...from, ...to])).filter(n => n !== undefined)
        
        if (diamondTraders?.length > 0) {
            processedTransaction.diamondTraderIds.push(...diamondTraders)
            processedTransaction.diamondTraders = processedTransaction.diamondTraderIds?.map( t => result.ownersToUpdate[t] )
        }

    }


    /**
     * @description
     * Takes an Array<V>, and a grouping function,
     * and returns a Map of the array grouped by the grouping function.
     *
     * @param list An array of type V.
     * @param keyGetter A Function that takes the the Array type V as an input, and returns a value of type K.
     *                  K is generally intended to be a property key of V.
     *
     * @returns Map of the array grouped by the grouping function.
     */
    groupBy(list, keyGetter) {

        const map = new Map()

        list.forEach((item) => {

            const key = keyGetter(item)
            const collection = map.get(key)
            if (!collection) {
                map.set(key, [item])
            } else {
                collection.push(item)
            }
        })
        return map
    }




}












interface ERCIndexResult {
    gameTransactionsToUpdate: {}
    ownersToUpdate: {}
    processedTransactionViewModels: {}
    tokensToUpdate: {}
    diamondMintPassesToUpdate: {}
    // mostRecentTransaction?:TransactionViewModel
    startBlock?:number
    endBlock?:number
    blockNumber?:number
}




// interface EventsResult {
//     events:any[]
//     endBlock:number
// }

export {
    UniverseIndexerService, ERCIndexResult
}