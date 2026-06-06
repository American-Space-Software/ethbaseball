import {  inject, injectable } from "inversify"

import { UserRepository } from "../user-repository.js"
import { User } from "../../dto/user.js"
import { Op } from "sequelize"


@injectable()
class UserRepositoryNodeImpl implements UserRepository {

    @inject("sequelize")
    private sequelize:Function

    async get(id:string, options?:any): Promise<User> {
        return User.findByPk(id, options)
    }

    async getByIds(ids: string[], options?: any): Promise<User[]> {

        let queryOptions = {
            where: {
                _id: {
                    [Op.in]: ids
                }
            }
        }

        return User.findAll(Object.assign(queryOptions, options))
    }    

    async put(user:User, options?:any): Promise<void> {
        await user.save(options)
    }

    async delete(user:User, options?:any): Promise<void> {
        await user.destroy(options)
    }

    async getByAddress(address:string, options?:any): Promise<User> {

        return User.findOne(Object.assign({
            where:{
                address:address
            }
        }, options))
    }

    async getByDiscordId(discordId:string, options?:any): Promise<User> {

        return User.findOne(Object.assign({
            where:{
                discordId:discordId
            }
        }, options))
    }


}



export {
    UserRepositoryNodeImpl
}