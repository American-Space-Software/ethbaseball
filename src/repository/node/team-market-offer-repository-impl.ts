import { inject, injectable } from "inversify"

import { TeamMarketOfferRepository } from "../team-market-offer-repository.js"
import { TeamMarketOffer } from "../../dto/team-market-offer.js"
import { TeamMarketOfferStatus } from "../../service/enums.js"

@injectable()
class TeamMarketOfferRepositoryNodeImpl implements TeamMarketOfferRepository {

    @inject("sequelize")
    private sequelize: Function

    async get(id:string, options?:any): Promise<TeamMarketOffer> {
        return TeamMarketOffer.findByPk(id, options)
    }

    async put(tmo:TeamMarketOffer, options?:any): Promise<TeamMarketOffer> {

        await tmo.save(options)
        return tmo

    }

    private buildTeamMarketOffers(rows:any[]): TeamMarketOffer[] {

        return rows.map((row) => TeamMarketOffer.build(row, {
            isNewRecord: false
        }))

    }

    private buildQueryOptions(s:any, replacements:any, options?:any): any {

        return {
            ...options,
            type: s.QueryTypes.SELECT,
            replacements
        }

    }

    private getRows(result:any): any[] {

        if (!result) {
            return []
        }

        if (Array.isArray(result?.[0])) {
            return result[0]
        }

        return result

    }

    private async queryTeamMarketOffers(sql:string, replacements:any, options?:any): Promise<TeamMarketOffer[]> {

        let s = await this.sequelize()

        let result:any = await s.query(sql, this.buildQueryOptions(s, replacements, options))
        let rows:any[] = this.getRows(result)

        return this.buildTeamMarketOffers(rows)

    }

    async getPendingSaleListingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined> {

        let offers:TeamMarketOffer[] = await this.queryTeamMarketOffers(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.salePlayerId = :playerId
                AND tmo.status = :status
                AND tmo.buyerUserId IS NULL
                AND tmo.buyerPaymentTeamId IS NULL
                AND tmo.escrowTransactionId IS NULL
            LIMIT 1
        `, {
            playerId,
            status: TeamMarketOfferStatus.PENDING
        }, options)

        return offers[0]

    }

    async listSaleListingsBySellerUserId(sellerUserId:string, options?:any): Promise<TeamMarketOffer[]> {

        return this.queryTeamMarketOffers(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.sellerUserId = :sellerUserId
                AND tmo.status = :status
                AND tmo.buyerUserId IS NULL
                AND tmo.buyerPaymentTeamId IS NULL
                AND tmo.escrowTransactionId IS NULL
            ORDER BY tmo.dateCreated DESC
        `, {
            sellerUserId,
            status: TeamMarketOfferStatus.PENDING
        }, options)

    }

    async listPendingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer[]> {

        return this.queryTeamMarketOffers(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.salePlayerId = :playerId
                AND tmo.status = :status
                AND tmo.buyerUserId IS NOT NULL
            ORDER BY CAST(tmo.diamondAmount AS DECIMAL(65,0)) DESC
        `, {
            playerId,
            status: TeamMarketOfferStatus.PENDING
        }, options)

    }

    async getHighestPendingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined> {

        let offers:TeamMarketOffer[] = await this.queryTeamMarketOffers(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.salePlayerId = :playerId
                AND tmo.status = :status
                AND tmo.buyerUserId IS NOT NULL
            ORDER BY CAST(tmo.diamondAmount AS DECIMAL(65,0)) DESC
            LIMIT 1
        `, {
            playerId,
            status: TeamMarketOfferStatus.PENDING
        }, options)

        return offers[0]

    }

    async listPendingByBuyerUserId(buyerUserId:string, options?:any): Promise<TeamMarketOffer[]> {

        return this.queryTeamMarketOffers(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.buyerUserId = :buyerUserId
                AND tmo.status = :status
            ORDER BY tmo.dateCreated DESC
        `, {
            buyerUserId,
            status: TeamMarketOfferStatus.PENDING
        }, options)

    }



    async listPendingByBuyerUserIdAndPlayerId(buyerUserId:string, playerId:string, options?:any): Promise<TeamMarketOffer[]> {

        return this.queryTeamMarketOffers(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.buyerUserId = :buyerUserId
                AND tmo.salePlayerId = :playerId
                AND tmo.status = :status
            ORDER BY tmo.dateCreated DESC
        `, {
            buyerUserId,
            playerId,
            status: TeamMarketOfferStatus.PENDING
        }, options)

    }

}

export {
    TeamMarketOfferRepositoryNodeImpl
}