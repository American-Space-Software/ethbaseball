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

    async getRewardBalanceByTeamAndSeason(contractType: string, team: Team, season: Season, options?: any): Promise<string> {

        let s = await this.sequelize()

        const modelAlias = (OffchainEvent as any).name

        let queryOptions = {
            replacements: {
                contractType: contractType,
                teamId: team._id,
                seasonStart: season.startDate,
                seasonEnd: season.endDate ?? null
            },
            type: QueryTypes.SELECT,
            plain: true
        }

        const rows = await s.query(
            `
            SELECT
                COALESCE(
                    CAST(SUM(CAST(amount AS DECIMAL(65,0))) AS CHAR),
                    '0'
                ) AS balance
            FROM offchain_event
            WHERE contractType = :contractType
            AND toTeamId = :teamId
            AND dateCreated >= :seasonStart
            AND (:seasonEnd IS NULL OR dateCreated < :seasonEnd)
            AND JSON_UNQUOTE(JSON_EXTRACT(\`${modelAlias}\`.\`source\`, '$.type')) = 'reward'
            `,
            Object.assign(queryOptions, options)
        ) 

        return rows?.balance || "0"
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

    async getBalanceByTeamIdAndContractType(contractType: string, teamId: string, options?: any): Promise<string> {

        let s = await this.sequelize()

        let queryOptions = {
            
            replacements: { 
                contractType: contractType, 
                teamId:teamId 
            },
            type: QueryTypes.SELECT,
            plain: true
        }

        const rows = await s.query(
            `
            SELECT
                COALESCE(
                    CAST(
                        SUM(
                            CASE
                                WHEN event = 'Transfer' AND toTeamId = :teamId THEN CAST(amount AS DECIMAL(65,0))
                                WHEN event = 'Transfer' AND fromTeamId = :teamId THEN -CAST(amount AS DECIMAL(65,0))
                                ELSE 0
                            END
                        ) AS CHAR
                    ),
                    '0'
                ) AS balance
            FROM offchain_event
            WHERE contractType = :contractType
              AND (fromTeamId = :teamId OR toTeamId = :teamId)
            `, Object.assign( queryOptions, options )
        ) 

        return rows?.balance || "0"
    }

    async getBalanceByPlayerIdAndContractType(contractType: string, playerId: string, options?: any): Promise<string> {

        let s = await this.sequelize()

        let queryOptions = {
            replacements: {
                contractType: contractType,
                playerId: playerId
            },
            type: QueryTypes.SELECT,
            plain: true
        }

        const rows = await s.query(
            `
            SELECT
                COALESCE(
                    CAST(SUM(CAST(amount AS DECIMAL(65,0))) AS CHAR),
                    '0'
                ) AS balance
            FROM offchain_event
            WHERE contractType = :contractType
            AND playerId = :playerId
            AND event = 'Transfer'
            `,
            Object.assign(queryOptions, options)
        ) 

    return rows?.balance || "0"
    }

}


export {
    OffchainEventRepositoryNodeImpl
}