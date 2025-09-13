import { Owner } from "../dto/owner.js"
import {  ProcessedEvent, ProcessedTransaction } from "../dto/processed-transaction.js"


interface ProcessedTransactionRepository {
    get(_id:string, options?:any): Promise<ProcessedTransaction>
    getByIds(_ids:string[], options?:any) : Promise<ProcessedTransaction[]>
    getLatest(contractAddress:string, beforeBlock?:number, options?:any): Promise<ProcessedTransaction>
    put(processedTransaction:ProcessedTransaction, options?:any) : Promise<ProcessedTransaction>
    putAll(processedTransactions:ProcessedTransaction[], options?:any) : Promise<void>
    putEvents(events:ProcessedEvent[], options?:any) : Promise<void>
    putEvent(event: ProcessedEvent, options?:any): Promise<ProcessedEvent>
    
    getEventsByOwner(contractAddress:string, ownerId:string, options?:any) : Promise<ProcessedEvent[]>
    getEventsByToken(contractAddress:string, tokenId:number, options?:any) : Promise<ProcessedEvent[]> 
    getAllEventsByToken(tokenId:number, options?:any) : Promise<ProcessedEvent[]>
    getAllEvents(options?:any) : Promise<ProcessedEvent[]>
    getAllEventsByAddress(address:string, options?:any) : Promise<ProcessedEvent[]>
    getAllEventsByTransactionIds(transactionIds:string[], options?:any) : Promise<ProcessedEvent[]>
    getUnprocessedDepositEvents(contractAddress:string, options?:any) : Promise<ProcessedEvent[]>

    findByContractBetweenBlocks(contractAddress:string, startBlock: number, endBlock: number, options?:any) : Promise<ProcessedTransaction[]>
    findBetweenBlocks(startBlock: number, endBlock: number, options?: any): Promise<ProcessedTransaction[]>
    findEventsBetweenBlocks(startBlock: number, endBlock: number, options?:any) : Promise<ProcessedEvent[]>

    remove(processedTransaction:ProcessedTransaction, options?:any) : Promise<void>

    getEventsByTransaction(transaction:ProcessedTransaction, options?:any) : Promise<ProcessedEvent[]> 
    getEventsByTokens(tokenIds:number[], options?:any) : Promise<ProcessedEvent[]> 
    // getEventsByTransactions(transactions:ProcessedTransaction[], options?:any) : Promise<ProcessedEvent[]>
    // putEvents(events:ProcessedEvent[], options?:any)
    
    list(limit: number, skip: number, options?:any): Promise<ProcessedTransaction[]> 
    listByTokens(tokenIds:number[], options?:any) : Promise<ProcessedTransaction[]> 
    listIdByToken(tokenId:number, options?:any) : Promise<string[]>
    listByTrader(owner:string, options?:any) : Promise<ProcessedTransaction[]>
    listIdsByTrader(owner:string, limit:number, offset:number, options?:any) : Promise<string[]> 
    listIds(limit:number, offset:number, options?:any) : Promise<string[]>

    getLastTransferByToken(contractAddress:string, tokenId:number, options?:any) : Promise<ProcessedEvent>

    // getPreviousByTokenId(tokenId:number, blockNumber:number, transactionIndex:number, options?:any) : Promise<ProcessedTransaction> 
    getPreviousByInitiator(address:string, blockNumber:number, transactionIndex:number, options?:any) : Promise<ProcessedTransaction> 
    // getPreviousByTrader(address:string, blockNumber:number, transactionIndex:number, options?:any) : Promise<ProcessedTransaction>
}

export {
    ProcessedTransactionRepository
}
