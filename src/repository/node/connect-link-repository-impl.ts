import {  inject, injectable } from "inversify"


import { ConnectLinkRepository } from "../connect-link-repository.js"
import { ConnectLink } from "../../dto/connect-link.js"


@injectable()
class ConnectLinkRepositoryNodeImpl implements ConnectLinkRepository {

        
    // @inject("sequelize")
    // private sequelize:Function

    async get(id:string, options?:any): Promise<ConnectLink> {
        return ConnectLink.findByPk(id, options)
    }

    getByDiscordId(discordId: string, options?: any): Promise<ConnectLink[]> {
        return ConnectLink.findAll(Object.assign({
            where: {
                discordId: discordId
            }
        }, options))

    }

    async put(connectLink:ConnectLink, options?:any): Promise<ConnectLink> {
        await connectLink.save(options)
        return connectLink
    }

    async delete(connectLink:ConnectLink, options?:any): Promise<void> {
        await connectLink.destroy(options)
    }

}



export {
    ConnectLinkRepositoryNodeImpl
}