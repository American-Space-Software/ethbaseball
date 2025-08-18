import {  injectable } from "inversify"
import { DiamondMintPassRepository } from "../diamond-mint-pass-repository.js"
import { DiamondMintPass } from "../../dto/diamond-mint-pass.js"
import { Op } from "sequelize"


@injectable()
class DiamondMintPassRepositoryNodeImpl implements DiamondMintPassRepository {


    async get(id:number, options?:any): Promise<DiamondMintPass> {
        return DiamondMintPass.findByPk(id, options)
    }

    async getUnmintedByAddress(address:string, options?:any): Promise<DiamondMintPass[]> {

        let queryOptions = {
            where: {
                [Op.and]: {
                    to: address,
                    processedTransactionId: null
                }
            },
            order: [['_id', 'DESC']]
        }

        return DiamondMintPass.findAll(Object.assign(queryOptions, options))

    }

    async getByAddress(address:string, options?:any): Promise<DiamondMintPass[]> {

        let queryOptions = {
            where: {
                to: address
            },
            order: [['_id', 'DESC']]
        }

        return DiamondMintPass.findAll(Object.assign(queryOptions, options))

    }

    async getUnmintedByTokenId(tokenId:number, options?:any): Promise<DiamondMintPass[]> {

        let queryOptions = {
            where: {
                tokenId: tokenId,
                processedTransactionId: null
            },
            order: [['dateCreated', 'DESC']]
        }

        return DiamondMintPass.findAll(Object.assign(queryOptions, options))

    }

    async getByTokenId(tokenId:number, options?:any): Promise<DiamondMintPass[]> {

        let queryOptions = {
            where: {
                tokenId: tokenId
            },
            order: [['dateCreated', 'DESC']]
        }

        return DiamondMintPass.findAll(Object.assign(queryOptions, options))

    }

    async put(dmp:DiamondMintPass, options?:any): Promise<DiamondMintPass> {
        return dmp.save(options)
    }

    async getUnsigned(options?:any): Promise<DiamondMintPass[]> {

        let queryOptions = {
            where: {
                [Op.and]: {
                    r: null,
                    s: null,
                    v: null
                }
            },
            order: [['dateCreated', 'DESC']]
        }

        return DiamondMintPass.findAll(Object.assign(queryOptions, options))

    }


}



export {
    DiamondMintPassRepositoryNodeImpl
}