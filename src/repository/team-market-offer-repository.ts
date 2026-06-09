import { TeamMarketOffer } from "../dto/team-market-offer.js"

interface TeamMarketOfferRepository {
    get(id:string, options?:any): Promise<TeamMarketOffer>
    put(tr:TeamMarketOffer, options?:any): Promise<TeamMarketOffer>

    getPendingSaleListingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined>

    listSaleListingsBySellerUserId(sellerUserId:string, options?:any): Promise<TeamMarketOffer[]>
    listPendingByBuyerUserId(buyerUserId:string, options?:any): Promise<TeamMarketOffer[]>

    listPendingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer[]>
    getHighestPendingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined>

    listPendingByBuyerUserIdAndPlayerId(buyerUserId:string, playerId:string, options?:any): Promise<TeamMarketOffer[]>

    listPendingSaleListings(options?:any): Promise<TeamMarketOffer[]>

    getHighestBidsForUserPlayers(userId:string, options?:any): Promise<TeamMarketOffer[]>
}

export {
    TeamMarketOfferRepository
}