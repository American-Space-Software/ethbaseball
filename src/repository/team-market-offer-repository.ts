import { TeamMarketOffer } from "../dto/team-market-offer.js"

interface TeamMarketOfferRepository {
    get(id:string, options?:any): Promise<TeamMarketOffer>
    put(tr:TeamMarketOffer, options?:any) : Promise<TeamMarketOffer>
    listPendingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer[]>
}

export {
    TeamMarketOfferRepository
}
