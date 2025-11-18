import {  inject, injectable } from "inversify"

import { UserRepository } from "../user-repository.js"
import { User } from "../../dto/user.js"


@injectable()
class UserRepositoryNodeImpl implements UserRepository {

    @inject("sequelize")
    private sequelize:Function

    async get(id:string, options?:any): Promise<User> {
        return User.findByPk(id, options)
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