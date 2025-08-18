import { ConnectLink } from "../dto/connect-link.js"

interface ConnectLinkRepository {
    get(id:string, options?:any): Promise<ConnectLink>
    getByDiscordId(discordId:string, options?:any) : Promise<ConnectLink[]>
    put(connectLink:ConnectLink, options?:any) : Promise<ConnectLink>
    delete(connectLink:ConnectLink, options?:any) : Promise<void>
}

export {
    ConnectLinkRepository
}
