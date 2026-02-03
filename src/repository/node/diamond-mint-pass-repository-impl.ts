import {  injectable } from "inversify"
import { DiamondMintPassRepository } from "../diamond-mint-pass-repository.js"
import { DiamondMintPass } from "../../dto/diamond-mint-pass.js"
import { Op } from "sequelize"
import { User } from "../../dto/user.js"


@injectable()
class DiamondMintPassRepositoryNodeImpl implements DiamondMintPassRepository {


    async get(id:number, options?:any): Promise<DiamondMintPass> {
        return DiamondMintPass.findByPk(id, options)
    }

    async getUnmintedByUser(user:User, options?:any): Promise<DiamondMintPass[]> {

        let queryOptions = {
            where: {
                [Op.and]: {
                    toUserId: user._id,
                    processedTransactionId: null
                }
            },
            order: [['_id', 'DESC']]
        }

        return DiamondMintPass.findAll(Object.assign(queryOptions, options))

    }

    async getByUser(user:User, options?:any): Promise<DiamondMintPass[]> {

        let queryOptions = {
            where: {
                toUserId: user._id
            },
            order: [['_id', 'DESC']]
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