import { Transaction } from "../dto/transaction.js"


interface TransactionRepository {
    get(_id:string): Promise<Transaction>
    put(transaction:Transaction, options?:any) : Promise<Transaction>
    putAll(transactions:Transaction[], options?:any) : Promise<void>
    remove(transaction:Transaction, options?:any) : Promise<void> 
    list(limit: number, skip: number): Promise<Transaction[]> 
    findBetweenBlocks(startBlock: number, endBlock: number, options?:any) : Promise<Transaction[]>

}

export {
    TransactionRepository
}
