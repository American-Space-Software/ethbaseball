import {  inject, injectable } from "inversify"

import { Owner } from "../../dto/owner.js"
import { OwnerRepository } from "../owner-repository.js"
import { Op, QueryTypes } from "sequelize"


@injectable()
class OwnerRepositoryNodeImpl implements OwnerRepository {
    
    @inject("sequelize")
    private sequelize:Function

    async get(id:string, options?:any): Promise<Owner> {
        return Owner.findByPk(id, options)
    }

    async getByUserId(userId:string, options?:any) : Promise<Owner> {
        
        let query = {
            where: {
                userId: userId
            }
        }

        query = Object.assign(query, options)

        return Owner.findOne(query)
    }

    async listByCount(options?:any): Promise<Owner[]> {

        let query = {
            order: [
                ['count', 'DESC']
            ]
        }

        return Owner.findAll(Object.assign(query, options))

    }


    async listByDiamonds(options?:any): Promise<Owner[]> {

        let query = {
            order: [
                ['diamondBalanceDecimal', 'DESC']
            ]
        }

        return Owner.findAll(Object.assign(query, options))

    }


    async listByOffChainDiamonds(options?:any): Promise<Owner[]> {

        let query = {
            order: [
                ['offChainDiamondBalanceDecimal', 'DESC']
            ]
        }

        return Owner.findAll(Object.assign(query, options))

    }




    async put(owner:Owner, options?:any): Promise<Owner> {

        await owner.save(options)
        return owner

    }

    async removeUserId(owner:Owner, options?:any) {
        await Owner.update({ userId: null }, { where: { _id: owner._id } })
    }

    async rerank(options?:any) : Promise<void> {

        let s = await this.sequelize()

        
        const [queryResults, metadata] = await s.query(`
            WITH ranks AS (
                SELECT 
                    _id,
                    RANK() OVER(ORDER BY count DESC) as overallRank,
                    DENSE_RANK() OVER(ORDER BY count DESC) as 'rank'
                FROM owner
            )
            UPDATE owner t
            JOIN ranks r ON t._id = r._id
            SET t.overallRank = r.overallRank,
            t.rank = r.rank;
        `, Object.assign({
            raw: true,
            nest: false,
            plain: false
        }, options))

    }

    async putAll(owners:Owner[], options?:any) : Promise<void> {

        for (let owner of owners) {
            await this.put(owner,options)
        }

    }

    async getByIds(_ids:string[], options?:any) {

        let query = {
            where: {
                _id: {
                    [Op.in]: _ids
                }
            },
            order: [
                ['count', 'DESC']
            ]
        }

        return Owner.findAll(Object.assign(query, options))
    }

    async clearAllTransactions( options?:any ): Promise<void> {
        
        await Owner.update({ 
            transactionsViewModel:  {transactions: [],rowItemViewModels: {}}

        }, Object.assign({  where: {} }, options) )

    }

    async getUpdatedSince(lastUpdated:Date, options?: any) : Promise<Owner[]> {

        let queryOptions = {
            where: { 
                lastUpdated: {
                    [Op.gte]: lastUpdated
                }
            },
            order: [
                ['lastUpdated', 'desc']
            ]
        }

        return Owner.findAll(Object.assign(queryOptions, options))


    }


    async count(options?:any): Promise<number> {

        let queryOptions = Object.assign({}, options)


        let result = await Owner.count(queryOptions)

        //@ts-ignore
        return result

    }

}



export {
    OwnerRepositoryNodeImpl
}