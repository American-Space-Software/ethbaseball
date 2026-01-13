import {  injectable } from "inversify"

import { OffchainEventRepository } from "../offchain-event-repository.js"
import { OffchainEvent } from "../../dto/offchain-event.js"
import { Owner } from "../../dto/owner.js"
import { Op } from "sequelize"
import { Season } from "../../dto/season.js"
import { Team } from "../../dto/team.js"
import { Sequelize } from "sequelize-typescript"


@injectable()
class OffchainEventRepositoryNodeImpl implements OffchainEventRepository {

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


}


export {
    OffchainEventRepositoryNodeImpl
}