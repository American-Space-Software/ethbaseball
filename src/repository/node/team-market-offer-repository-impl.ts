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

    async getPendingSaleListingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined> {

        let s = await this.sequelize()

        let rows:any[] = await s.query(`
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
            type: s.QueryTypes.SELECT,
            replacements: {
                playerId,
                status: TeamMarketOfferStatus.PENDING
            },
            ...options
        })

        return this.buildTeamMarketOffers(rows)[0]

    }

    async listSaleListingsBySellerUserId(sellerUserId:string, options?:any): Promise<TeamMarketOffer[]> {

        let s = await this.sequelize()

        let rows:any[] = await s.query(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.sellerUserId = :sellerUserId
                AND tmo.status = :status
                AND tmo.buyerUserId IS NULL
            ORDER BY tmo.dateCreated DESC
        `, {
            type: s.QueryTypes.SELECT,
            replacements: {
                sellerUserId,
                status: TeamMarketOfferStatus.PENDING
            },
            ...options
        })

        return this.buildTeamMarketOffers(rows)

    }

    async listPendingPrivateBuyOffersByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer[]> {

        let s = await this.sequelize()

        let rows:any[] = await s.query(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.salePlayerId = :playerId
                AND tmo.status = :status
                AND tmo.buyerUserId IS NOT NULL
            ORDER BY CAST(tmo.diamondAmount AS DECIMAL(65,0)) DESC
        `, {
            type: s.QueryTypes.SELECT,
            replacements: {
                playerId,
                status: TeamMarketOfferStatus.PENDING
            },
            ...options
        })

        return this.buildTeamMarketOffers(rows)

    }

    async getHighestPendingPrivateBuyOfferByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined> {

        let s = await this.sequelize()

        let rows:any[] = await s.query(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.salePlayerId = :playerId
                AND tmo.status = :status
                AND tmo.buyerUserId IS NOT NULL
            ORDER BY CAST(tmo.diamondAmount AS DECIMAL(65,0)) DESC
            LIMIT 1
        `, {
            type: s.QueryTypes.SELECT,
            replacements: {
                playerId,
                status: TeamMarketOfferStatus.PENDING
            },
            ...options
        })

        return this.buildTeamMarketOffers(rows)[0]

    }

    async listPrivateBuyOffersByBuyerUserId(buyerUserId:string, options?:any): Promise<TeamMarketOffer[]> {

        let s = await this.sequelize()

        let rows:any[] = await s.query(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.buyerUserId = :buyerUserId
            ORDER BY tmo.dateCreated DESC
        `, {
            type: s.QueryTypes.SELECT,
            replacements: {
                buyerUserId
            },
            ...options
        })

        return this.buildTeamMarketOffers(rows)

    }

    async listPrivateBuyOffersBySellerUserId(sellerUserId:string, options?:any): Promise<TeamMarketOffer[]> {

        let s = await this.sequelize()

        let rows:any[] = await s.query(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.sellerUserId = :sellerUserId
                AND tmo.buyerUserId IS NOT NULL
            ORDER BY tmo.dateCreated DESC
        `, {
            type: s.QueryTypes.SELECT,
            replacements: {
                sellerUserId
            },
            ...options
        })

        return this.buildTeamMarketOffers(rows)

    }

}

export {
    TeamMarketOfferRepositoryNodeImpl
}