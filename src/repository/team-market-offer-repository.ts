import { TeamMarketOffer } from "../dto/team-market-offer.js"

interface TeamMarketOfferRepository {
    get(id:string, options?:any): Promise<TeamMarketOffer>
    put(tr:TeamMarketOffer, options?:any): Promise<TeamMarketOffer>

    getPendingSaleListingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined>
    listSaleListingsBySellerUserId(sellerUserId:string, options?:any): Promise<TeamMarketOffer[]>

    listPendingPrivateBuyOffersByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer[]>
    getHighestPendingPrivateBuyOfferByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined>

    listPrivateBuyOffersByBuyerUserId(buyerUserId:string, options?:any): Promise<TeamMarketOffer[]>
    listPrivateBuyOffersBySellerUserId(sellerUserId:string, options?:any): Promise<TeamMarketOffer[]>
}

export {
    TeamMarketOfferRepository
}