import {  inject, injectable } from "inversify"

import {  ProcessedEvent, ProcessedTransaction, ProcessedTransactionToken, ProcessedTransactionTrader } from "../../dto/processed-transaction.js"
import { ProcessedTransactionRepository } from "../processed-transaction-repository.js"

// const { Op } = require("sequelize")
import { Op, QueryTypes } from "sequelize"


@injectable()
class ProcessedTransactionRepositoryNodeImpl implements ProcessedTransactionRepository {

    @inject("sequelize")
    private sequelize:Function

    @inject("dayjs")
    private dayjs

    async get(_id: string, options?:any): Promise<ProcessedTransaction> {

        return ProcessedTransaction.findByPk(_id, options)
    }

    async getEvent(_id: string, options?:any): Promise<ProcessedEvent> {
        return ProcessedEvent.findByPk(_id, options)
    }

    async getByIds(_ids:string[], options?:any) : Promise<ProcessedTransaction[]> {

        let query:any = {
            where: {
                _id: {
                    [Op.in]: _ids
                }
            },
            order: [
                ['blockNumber', 'DESC'],
                ['transactionIndex', 'DESC']
            ]
        }

        query = Object.assign(query, options)

        //Transactions
        return ProcessedTransaction.findAll(query)


    }

    async put(processedTransaction: ProcessedTransaction, options?:any): Promise<ProcessedTransaction> {
        
        if (processedTransaction.changed()) {

            await processedTransaction.save(options)
        
            if (processedTransaction.tokens) {
                for (let token of processedTransaction.tokens) {
                    await processedTransaction.addToken(token, Object.assign({through: ProcessedTransactionToken}, options))
                }
            }

            if (processedTransaction.tokenTraders) {
                for (let tokenTrader of processedTransaction.tokenTraders) {
                    await processedTransaction.addTokenTrader(tokenTrader, Object.assign({through: ProcessedTransactionTrader}, options))
                }
            }

        }

        return processedTransaction 

    }
  
    async putAll(processedTransactions:ProcessedTransaction[], options?:any) : Promise<void> {

        for (let processedTransaction of processedTransactions) {
            await this.put(processedTransaction,options)
        }
    }


    async findBetweenBlocks(startBlock: number, endBlock: number, options?: any): Promise<ProcessedTransaction[]> {

        let query = {
            where: {
                blockNumber: {
                    [Op.and]: {
                        [Op.gte]: startBlock,
                        [Op.lte]: endBlock
                    }
                }
            }
        }

        query = Object.assign(query, options)

        //Transactions
        return ProcessedTransaction.findAll(query)

    }

    async findByContractBetweenBlocks(contractAddress:string, startBlock: number, endBlock: number, options?: any): Promise<ProcessedTransaction[]> {

        let query = {
            where: {
                contractAddress: contractAddress,
                blockNumber: {
                    [Op.and]: {
                        [Op.gte]: startBlock,
                        [Op.lte]: endBlock
                    }
                }
            }
        }

        query = Object.assign(query, options)

        //Transactions
        return ProcessedTransaction.findAll(query)

    }

    async findEventsBetweenBlocks(startBlock: number, endBlock: number, options?: any): Promise<ProcessedEvent[]> {

        let query = {
            where: {
                blockNumber: {
                    [Op.and]: {
                        [Op.gte]: startBlock,
                        [Op.lte]: endBlock
                    }
                }
            }
        }

        query = Object.assign(query, options)

        //events
        return ProcessedEvent.findAll(query)

    }

    async getUnprocessedDepositEvents(contractAddress:string, options?:any) : Promise<ProcessedEvent[]>  {

        return ProcessedEvent.findAll(Object.assign({
            where: {
                [Op.and]: {
                    contractAddress: contractAddress,
                    event: "DepositToTeam",
                    offChainEventId: { [Op.is]: null }
                }
            },
            order: [ ['blockNumber', 'DESC'], ['logIndex', 'DESC'] ]
        }, options))

    }


    async getAllEvents(options?:any) : Promise<ProcessedEvent[]>  {

        return ProcessedEvent.findAll(Object.assign({
            order: [ ['blockNumber', 'DESC'], ['logIndex', 'DESC'] ]
        }, options))

    }

    async getAllEventsByToken(tokenId:number, options?:any) : Promise<ProcessedEvent[]>  {

        return ProcessedEvent.findAll(Object.assign({
            where: {
                tokenId: tokenId
            },
            order: [ ['blockNumber', 'DESC'], ['logIndex', 'DESC'] ]
        }, options))

    }

    async getAllEventsByAddress(address:string, options?:any) : Promise<ProcessedEvent[]>  {

        return ProcessedEvent.findAll(Object.assign({
            where: {
                [Op.or]: {
                    fromAddress: address,
                    toAddress: address
                }
                
            },
            order: [ ['blockNumber', 'DESC'], ['logIndex', 'DESC'] ]
        }, options))

    }



    async getAllEventsByTransactionIds(transactionIds:string[], options?:any) : Promise<ProcessedEvent[]>  {

        return ProcessedEvent.findAll(Object.assign({
            where: {
                processedTransactionId: { [Op.in]: transactionIds }
            },
            order: [ ['blockNumber', 'DESC'], ['logIndex', 'DESC'] ]
        }, options))

    }




    async getEventsByToken(contractAddress:string, tokenId:number, options?:any) : Promise<ProcessedEvent[]>  {

        return ProcessedEvent.findAll(Object.assign({
            where: {
                [Op.and]: {
                    contractAddress: contractAddress,
                    tokenId: tokenId
                }
            },
            order: [ ['blockNumber', 'DESC'], ['logIndex', 'DESC'] ]
        }, options))

    }



    async getLastTransferByToken(contractAddress:string, tokenId:number, options?:any) : Promise<ProcessedEvent>  {

        return ProcessedEvent.findOne(Object.assign({
            where: {
                [Op.and]: {
                    contractAddress: contractAddress,
                    tokenId: tokenId,
                    event: {
                        [Op.eq]: ['Transfer'],
                    }
                }
            },
            order: [ ['blockNumber', 'DESC'], ['logIndex', 'DESC'] ]
        }, options))

    }

    async remove(processedTransaction:ProcessedTransaction, options?:any) : Promise<void> {

        //Delete events
        const events = await this.getEventsByTransaction(processedTransaction, options)

        for (let event of events) {
            await event.destroy(options)
        }


        //Remove relation to tokens
        if (processedTransaction.tokens) {
            for (let token of processedTransaction.tokens) {
                await processedTransaction.removeToken(token, options)
            }
        }

        if (processedTransaction.tokenTraders) {
            for (let tokenTrader of processedTransaction.tokenTraders) {
                await processedTransaction.removeTokenTrader(tokenTrader, options)
            }
        }


        await processedTransaction.destroy(options)

    }

    async getEventsByTransaction(transaction:ProcessedTransaction, options?:any) : Promise<ProcessedEvent[]> {

        return ProcessedEvent.findAll(Object.assign({
            where: {
              processedTransactionId: {
                [Op.eq]: transaction._id
              }
            }
        }, options))

    }

    async getEventsByTokens(tokenIds:number[], options?:any) : Promise<ProcessedEvent[]>  {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: false,
            model: ProcessedEvent,
            mapToModel: true,
            replacements: { 
                tokenIds: tokenIds
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                pe._id
            FROM 
                processed_event pe
            WHERE 
                pe.tokenId IN (:tokenIds)
            ORDER BY pe.blockNumber desc, pe.transactionIndex desc
        `, Object.assign(queryOptions, options))


        let results:ProcessedEvent[] = []

        for (let result of queryResults) {
            results.push(await this.getEvent(result._id, options))
        }

        return results

    }

    async getEventsByOwner(contractAddress:string, ownerId:string, options?:any) : Promise<ProcessedEvent[]>  {

        return ProcessedEvent.findAll(Object.assign({
            where: {
                [Op.and]: {
                    contractAddress: contractAddress, 
                    [Op.or]: [{ fromAddress: ownerId }, { toAddress: ownerId }]
                }
            },
            order: [ ['blockNumber', 'ASC'], ['logIndex', 'ASC'] ]
        }, options))

    }

    async putEvent(event: ProcessedEvent, options?:any): Promise<ProcessedEvent> {
        await event.save(options)
        return event 

    }

    async putEvents(events:ProcessedEvent[], options?:any) {
     
        for (let event of events) {
            await this.putEvent(event,options)
        }

    }

    async getLatest(contractAddress:string, beforeBlock?:number, options?:any): Promise<ProcessedTransaction> {

        let query:any = {
            order: [
                ['blockNumber', 'DESC'],
                ['transactionIndex', 'DESC']
            ]
        }

        if (beforeBlock) {
            query.where = {
                'contractAddress': contractAddress,
                'blockNumber': {
                    [Op.lt]: beforeBlock
                }
            }
        }

        query = Object.assign(query, options)

        return ProcessedTransaction.findOne(query)

    }

    async list(limit: number, skip: number, options?:any): Promise<ProcessedTransaction[]> {

        let query = {
            limit: limit,
            offset: skip,
            order: [
                ['blockNumber', 'DESC'],
                ['transactionIndex', 'DESC']
            ]
        }

        return ProcessedTransaction.findAll(Object.assign(query, options))

    }


    async listIdByToken(tokenId:number, options?:any) : Promise<string[]>  {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: false,
            model: ProcessedTransaction,
            mapToModel: true,
            replacements: { 
                tokenId: tokenId
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                t._id
            FROM 
                processed_transaction t
            INNER JOIN processed_transaction_token ptt on t._id = ptt.processedTransactionId
            INNER JOIN player p on p._id = ptt.playerId
            WHERE 
                p.tokenId = :tokenId
            ORDER BY t.blockNumber desc, t.transactionIndex desc
        `, Object.assign(queryOptions, options))



        return queryResults.map(r => r._id)

    }

    async listByTokens(tokenIds:number[], options?:any) : Promise<ProcessedTransaction[]>  {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: false,
            model: ProcessedTransaction,
            mapToModel: true,
            replacements: { 
                tokenIds: tokenIds
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                *
            FROM 
                processed_transaction t
            INNER JOIN processed_transaction_token ptt on t._id = ptt.processedTransactionId
            WHERE 
                ptt.tokenIds IN (:tokenIds)
            ORDER BY t.blockNumber desc, t.transactionIndex desc
        `, Object.assign(queryOptions, options))


        let results:ProcessedTransaction[] = []

        for (let result of queryResults) {
            results.push(await this.get(result._id, options))
        }

        return results

    }

    async listByTrader(owner:string, options?:any) : Promise<ProcessedTransaction[]>  {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: false,
            model: ProcessedTransaction,
            mapToModel: true,
            replacements: { 
                owner: owner
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                *
            FROM 
                processed_transaction t
            INNER JOIN processed_transaction_trader ptt on t._id = ptt.processedTransactionId
            WHERE 
                ptt.ownerId = :owner 
            ORDER BY t.blockNumber desc, t.transactionIndex desc
        `, Object.assign(queryOptions, options))


        let results:ProcessedTransaction[] = []

        for (let result of queryResults) {
            results.push(await this.get(result._id, options))
        }

        return results

    }

    async listIdsByTrader(owner:string, limit:number, offset:number, options?:any) : Promise<string[]>  {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: false,
            model: ProcessedTransaction,
            mapToModel: true,
            replacements: { 
                owner: owner,
                limit: limit,
                offset: offset
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                t._id
            FROM 
                processed_transaction t
            INNER JOIN processed_transaction_trader ptt on t._id = ptt.processedTransactionId
            WHERE 
                ptt.ownerId = :owner 
            ORDER BY t.blockNumber desc, t.transactionIndex desc
            LIMIT :limit OFFSET :offset
        `, Object.assign(queryOptions, options))



        return queryResults.map(r => r._id)

    }

    async listIds(limit:number, offset:number, options?:any) : Promise<string[]>  {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: { 
                limit: limit,
                offset: offset
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                t._id
            FROM 
                processed_transaction t
            ORDER BY t.blockNumber desc, t.transactionIndex desc
            LIMIT :limit OFFSET :offset
        `, Object.assign(queryOptions, options))

        return queryResults.map( qr => qr._id)

    }

    

    // async getPreviousByTokenId(tokenId:number, blockNumber:number, transactionIndex:number, options?:any) : Promise<ProcessedTransaction> {

    //     let s = await this.sequelize()

    //     options = Object.assign({}, options)


    //     const result = await s.query(`
    //         select 
    //             t.*
    //         FROM 'processed_transaction' t, json_each(t.tokenIds) tok
    //         WHERE 
    //             tok.value IS NOT NULL AND
    //             tok.value = :tokenId AND
    //             (t.blockNumber,t.transactionIndex) < (:blockNumber, :transactionIndex)
    //         ORDER BY t.blockNumber desc, t.transactionIndex desc
    //         LIMIT 1;
    //     `, Object.assign(options, {
    //         type: s.QueryTypes.SELECT,
    //         model: ProcessedTransaction,
    //         mapToModel: true,
    //         plain: true,
    //         replacements: { 
    //             tokenId: tokenId,
    //             blockNumber: blockNumber,
    //             transactionIndex: transactionIndex
    //         }
    //     }))

    //     if (result?._id) {
    //         return ProcessedTransaction.findByPk(result._id, options) //map JSON better...
    //     }

    // }

    async getPreviousByInitiator(address:string, blockNumber:number, transactionIndex:number, options?:any) : Promise<ProcessedTransaction> {

        let s = await this.sequelize()

        options = Object.assign({}, options)

        const result = await s.query(`
            select 
                t.*
            FROM processed_transaction t
            WHERE 
                t.transactionFrom = :address AND
                (t.blockNumber,t.transactionIndex) < (:blockNumber, :transactionIndex)
            ORDER BY t.blockNumber desc, t.transactionIndex desc
            LIMIT 1;
        `, Object.assign(options, {
            type: s.QueryTypes.SELECT,
            model: ProcessedTransaction,
            mapToModel: true,
            plain: true,   
            replacements: { 
                address: address,
                blockNumber: blockNumber,
                transactionIndex: transactionIndex
            }
        }))

        if (result?._id) {
            return ProcessedTransaction.findByPk(result._id, options) //map JSON better...
        }

    }

    // async getPreviousByTrader(address:string, blockNumber:number, transactionIndex:number, options?:any) : Promise<ProcessedTransaction> {

    //     let s = await this.sequelize()

    //     options = Object.assign({}, options)


    //     const result = await s.query(`
    //         select 
    //             t.*
    //         FROM 'processed_transaction' t, json_each(t.tokenTraders) tr
    //         WHERE
    //             tr.value IS NOT NULL AND
    //             tr.value = :address AND 
    //             (t.blockNumber,t.transactionIndex) < (:blockNumber, :transactionIndex)
    //         ORDER BY t.blockNumber desc, t.transactionIndex desc
    //         LIMIT 1;
    //     `, Object.assign(options, {
    //         type: s.QueryTypes.SELECT,
    //         model: ProcessedTransaction,
    //         mapToModel: true,
    //         plain: true,
    //         replacements: { 
    //             address: address,
    //             blockNumber: blockNumber,
    //             transactionIndex: transactionIndex
    //         }
    //     }))

    //     if (result?._id) {
    //         return ProcessedTransaction.findByPk(result._id, options) //map JSON better...
    //     }


    // }

}

interface SalesRowInput {
    timestamp?:number
    attribute?: {
        traitType:string 
        value:string
    }
}


export {
    ProcessedTransactionRepositoryNodeImpl
}