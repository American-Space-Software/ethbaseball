import { inject, injectable } from "inversify";
import { ConnectLinkRepository } from "../repository/connect-link-repository.js";
import { ConnectLink } from "../dto/connect-link.js";
import dayjs from "dayjs";
import { ethers } from "ethers";
import { Owner } from "../dto/owner.js";
import { OwnerService } from "./data/owner-service.js";
import { SignatureTokenRepository } from "../repository/signature-token-repository.js";
import { UserService } from "./user-service.js";
import { User } from "../dto/user.js";

@injectable()
class ConnectService {

    @inject("ConnectLinkRepository")
    private connectLinkRepository:ConnectLinkRepository

    @inject("SignatureTokenRepository")
    private signatureTokenRepository:SignatureTokenRepository

    @inject("sequelize")
    private sequelize:Function

    constructor(
        private ownerService:OwnerService,
        private userService:UserService
    ) {}

    async createConnectLink(discordId:string, discordUsername:string, options?:any) {

        //Expire/remove any existing.
        let existing:ConnectLink[] = await this.connectLinkRepository.getByDiscordId(discordId)
        
        for (let c of existing) {
            await this.connectLinkRepository.delete(c, options)
        }

        //Now create a new one.
        let connectLink:ConnectLink = new ConnectLink()

        connectLink.discordId = discordId
        connectLink.discordUsername = discordUsername

        //Save it.
        await this.connectLinkRepository.put(connectLink, options)

        return connectLink

    }

    async validateConnectLink(connectLink:ConnectLink, options?:any) {

        if (!connectLink) {
            throw new Error(`Connect link not found. Please /connect again in Discord.`)
        }

        let diff = dayjs().diff(dayjs(connectLink.dateCreated), 'minute')
    
        if (diff > 15) {
            throw new Error(`Connect link has expired. Please /connect again in Discord.`)
        }


    }

    async get(id:string, options?:any): Promise<ConnectLink> {
        return this.connectLinkRepository.get(id, options)
    }

    async put(connectLink:ConnectLink, options?:any): Promise<ConnectLink> {
        return this.connectLinkRepository.put(connectLink, options)
    }

    async connectAddressToUser(userId, message:string, signature:string) : Promise<String> {

        let recoveredAddress

        let s = await this.sequelize()
        await s.transaction(async (t1) => {
        
            let options = { transaction: t1 }

            let user:User = await this.userService.get(userId, options)

            recoveredAddress = await this.validateSignature(message, signature, options)

            //Find any existing users using this address and remove it.
            let existing:User = await this.userService.getByAddress(recoveredAddress, options)

            if (existing) {

                existing.address = null
                
                if (existing.discordId) {
                    await this.userService.put(existing, options)
                } else {
                    await this.userService.delete(existing, options)
                }
                
            }

            user.address = recoveredAddress
            user.changed("address", true)

            await this.userService.put(user, options)


        })

        return recoveredAddress

    }

    async validateSignature(message:string, signature:string, options?:any) {

        //Check if it has a valid signature.
        const recoveredAddress = ethers.verifyMessage(message, signature)

        if (!ethers.isAddress(recoveredAddress)) {
            throw new Error("Invalid signature.")
        }

        const token = message.slice(message.indexOf("@") + 1).trim()

        let signatureToken = await this.signatureTokenRepository.get(recoveredAddress, options)

        if (token != signatureToken.token || signatureToken.expires < new Date(new Date().toUTCString())) {
            throw new Error("Invalid signature token.")
        }

        return recoveredAddress
    }

    async removeUserId(owner:Owner, options?:any) {
        return this.ownerService.removeUserId(owner, options)
    }
}


export {
    ConnectService
}