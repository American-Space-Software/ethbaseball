import {  inject, injectable } from "inversify"

import { TeamMarketOfferRepository } from "../team-market-offer-repository.js"
import { TeamMarketOffer } from "../../dto/team-market-offer.js"
import { TeamMarketOfferStatus } from "../../service/enums.js"



@injectable()
class TeamMarketOfferRepositoryNodeImpl implements TeamMarketOfferRepository {

    @inject("sequelize")
    private sequelize:Function

    async get(id:string, options?:any): Promise<TeamMarketOffer> {
        return TeamMarketOffer.findByPk(id, options)
    }

    async put(tmo:TeamMarketOffer, options?:any): Promise<TeamMarketOffer> {

        await tmo.save(options)
        return tmo

    }

    async listPendingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer[]> {

        let s = await this.sequelize()

        let rows:any[] = await s.query(`
            SELECT *
            FROM team_market_offer tmo
            WHERE
                tmo.status = :status
                AND JSON_CONTAINS(
                    JSON_EXTRACT(tmo.package, '$.playerIds'),
                    JSON_QUOTE(:playerId)
                )
        `, {
            type: s.QueryTypes.SELECT,
            replacements: {
                playerId: playerId,
                status: TeamMarketOfferStatus.PENDING
            },
            ...options
        })

        return rows.map((row) => TeamMarketOffer.build(row, {
            isNewRecord: false
        }))

    }  

}



export {
    TeamMarketOfferRepositoryNodeImpl
}