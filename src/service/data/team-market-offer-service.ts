import { inject, injectable } from "inversify";

import { TeamMarketOfferRepository } from "../../repository/team-market-offer-repository.js";
import { TeamMarketOffer } from "../../dto/team-market-offer.js";

@injectable()
class TeamMarketOfferService {

    @inject("TeamMarketOfferRepository")
    private teamMarketOfferRepository: TeamMarketOfferRepository

    constructor() { }

    async get(id:string, options?:any): Promise<TeamMarketOffer> {
        return this.teamMarketOfferRepository.get(id, options)
    }

    async put(tmo:TeamMarketOffer, options?:any): Promise<TeamMarketOffer> {
        return this.teamMarketOfferRepository.put(tmo, options)
    }

    async getPendingSaleListingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined> {
        return this.teamMarketOfferRepository.getPendingSaleListingByPlayerId(playerId, options)
    }

    async listPendingPrivateBuyOffersByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer[]> {
        return this.teamMarketOfferRepository.listPendingPrivateBuyOffersByPlayerId(playerId, options)
    }

    async getHighestPendingPrivateBuyOfferByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined> {
        return this.teamMarketOfferRepository.getHighestPendingPrivateBuyOfferByPlayerId(playerId, options)
    }

    async listPrivateBuyOffersByBuyerUserId(buyerUserId:string, options?:any): Promise<TeamMarketOffer[]> {
        return this.teamMarketOfferRepository.listPrivateBuyOffersByBuyerUserId(buyerUserId, options)
    }

    async listPrivateBuyOffersBySellerUserId(sellerUserId:string, options?:any): Promise<TeamMarketOffer[]> {
        return this.teamMarketOfferRepository.listPrivateBuyOffersBySellerUserId(sellerUserId, options)
    }

}

export {
    TeamMarketOfferService
}