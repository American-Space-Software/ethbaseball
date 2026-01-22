import {  inject, injectable } from "inversify"

import { OffchainEventRepository } from "../offchain-event-repository.js"
import { OffchainEvent } from "../../dto/offchain-event.js"
import { Owner } from "../../dto/owner.js"
import { Op, QueryTypes } from "sequelize"
import { Season } from "../../dto/season.js"
import { Team } from "../../dto/team.js"
import { Sequelize } from "sequelize-typescript"
import dayjs from "dayjs"


@injectable()
class OffchainEventRepositoryNodeImpl implements OffchainEventRepository {

    @inject("sequelize")
    private sequelize: Function

    async get(id:string, options?:any): Promise<OffchainEvent> {
        return OffchainEvent.findByPk(id, options)
    }

    async put(offchainEvent:OffchainEvent, options?:any): Promise<OffchainEvent> {

        await offchainEvent.save(options)
        return offchainEvent
    }

    async getByOwner(contractType:string, owner:Owner, options?:any) : Promise<OffchainEvent[]>  {

        return OffchainEvent.findAll(Object.assign({
            where: {
                [Op.and]: {
                    contractType: contractType, 
                    [Op.or]: [{ fromAddress: owner._id }, { toAddress: owner._id }]
                }
            },
            order: [ ['dateCreated', 'DESC'] ]
        }, options))

    }

    async getRewardsByTeamAndSeason(contractType: string, team: Team, season: Season, options?: any): Promise<OffchainEvent[]> {
        const seasonRange = {
            [Op.gte]: season.startDate,
            ...(season.endDate ? { [Op.lt]: season.endDate } : {}),
        }

        const modelAlias = (OffchainEvent as any).name

        const whereClause = {
            [Op.and]: [
                { contractType },
                { toTeamId: team._id },
                { dateCreated: seasonRange },
                Sequelize.literal(
                    `JSON_UNQUOTE(JSON_EXTRACT(\`${modelAlias}\`.\`source\`, '$.type')) = 'reward'`
                ),
            ],
        }

        const query = Object.assign(
            {
                where: whereClause,
                order: [["dateCreated", "DESC"]],
            },
            options
        )

        return OffchainEvent.findAll(query)
    }

    async getByTeamIdAndContractType(contractType:string, teamId:string, options?:any) : Promise<OffchainEvent[]>  {

        return OffchainEvent.findAll(Object.assign({
            where: {
                [Op.and]: {
                    contractType: contractType, 
                    [Op.or]: [{ fromTeamId: teamId }, { toTeamId: teamId }]
                }
            },
            order: [ ['dateCreated', 'DESC'] ]
        }, options))

    }

    async getByTeamId(teamId:string, options?:any) : Promise<OffchainEvent[]>  {

        return OffchainEvent.findAll(Object.assign({
            where: {
                [Op.and]: {
                    [Op.or]: [{ fromTeamId: teamId }, { toTeamId: teamId }]
                }
            },
            order: [ ['dateCreated', 'DESC'] ]
        }, options))

    }

    async getDailyDiamondRewardByTeamIdForDate( teamId: string, forDate: string,  options?: any ): Promise<OffchainEvent | null> {
        
        const start = dayjs(forDate).startOf("day").toISOString()
        const end = dayjs(forDate).add(1, "day").startOf("day").toISOString()

        return OffchainEvent.findOne(
            Object.assign(
            {
                where: {
                [Op.and]: [
                    { contractType: "DIAMONDS" },
                    { [Op.or]: [{ fromTeamId: teamId }, { toTeamId: teamId }] },
                    { "source.type": "reward" },
                    { "source.rewardType": "daily" },
                    {
                        "source.fromDate": {
                            [Op.gte]: start,
                            [Op.lt]: end
                        }
                    }
                ]
                },
                order: [["dateCreated", "DESC"]]
            },
            options || {}
            )
        )

    }

    async getMostRecentDailyDiamondRewardByTeamId( teamId: string, options?: any ): Promise<OffchainEvent | null> {
        return OffchainEvent.findOne(
            Object.assign(
            {
                where: {
                    [Op.and]: [
                        { contractType: "DIAMONDS" },
                        { [Op.or]: [{ fromTeamId: teamId }, { toTeamId: teamId }] },
                        { "source.type": "reward" },
                        { "source.rewardType": "daily" }
                    ]
                },
                order: [["dateCreated", "DESC"]]
            },
            options || {}
            )
        )
    }

    async list(contractType:string, options?:any) : Promise<OffchainEvent[]>  {

        return OffchainEvent.findAll(Object.assign({
            where: {
                [Op.and]: {
                    contractType: contractType
                }
            },
            order: [ ['dateCreated', 'DESC'] ]
        }, options))

    }

    async listAll(options?:any) : Promise<OffchainEvent[]>  {

        return OffchainEvent.findAll(Object.assign({
            order: [ ['dateCreated', 'DESC'] ]
        }, options))

    }

    async listByPage(options?: any): Promise<OffchainEvent[]> {

        let s = await this.sequelize()

        const limit = options?.limit ?? 25
        const offset = options?.offset ?? 0

        let queryOptions = {
            replacements: { limit, offset },
            type: QueryTypes.SELECT,
            model: OffchainEvent, 
            mapToModel: true,
        }

        // Pages by "transaction groups" where:
        // groupId = COALESCE(transactionId, _id)
        // Returns ALL rows that belong to the 25 groupIds on this page.
        const rows = await s.query(
            `
            SELECT oe.*
            FROM offchain_event oe
            JOIN (
            SELECT
                COALESCE(transactionId, _id) AS groupId,
                MAX(dateCreated) AS maxDate
            FROM offchain_event
            GROUP BY groupId
            ORDER BY maxDate DESC
            LIMIT :limit OFFSET :offset
            ) g
            ON COALESCE(oe.transactionId, oe._id) = g.groupId
            ORDER BY oe.dateCreated DESC
            `, Object.assign(queryOptions, options)
        )

        return rows as unknown as OffchainEvent[]
    }

}


export {
    OffchainEventRepositoryNodeImpl
}