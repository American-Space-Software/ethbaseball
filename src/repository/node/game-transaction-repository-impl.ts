import {  inject, injectable } from "inversify"

import { Op } from "sequelize"
import { GameTransaction } from "../../dto/game-transaction.js"
import { GameTransactionRepository } from "../game-transaction-repository.js"
import { Season } from "../../dto/season.js"
import { Team } from "../../dto/team.js"
import dayjs from "dayjs"
import { League } from "../../dto/league.js"
import { Player } from "../../dto/player.js"

@injectable()
class GameTransactionRepositoryNodeImpl implements GameTransactionRepository {

    @inject("sequelize")
    private sequelize:Function

    async get(id:string, options?:any): Promise<GameTransaction> {
        return GameTransaction.findByPk(id, options)
    }

    async put(gt:GameTransaction, options?:any): Promise<GameTransaction> {

        await gt.save(options)
        return gt

    }

    async remove(gt:GameTransaction, options?:any) : Promise<GameTransaction> {
        await gt.destroy(options)
        return gt
    }

    async list(options?: any): Promise<GameTransaction[]> {
        
        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.SELECT,
            mapToModel: true,
            model: GameTransaction
        }

        const queryResults = await s.query(`
            select gt.*
            FROM game_transaction gt
            ORDER BY gt.dateCreated DESC
            ${options?.limit ? `LIMIT ${options.limit} ` : ' '}
            ${options?.offset ? `OFFSET ${options.offset} ` : ' '}
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async getReadyToFinalize(options?: any): Promise<GameTransaction[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.SELECT,
            mapToModel: true,
            model: GameTransaction,
            replacements: {
                theDate: dayjs(new Date(new Date().toUTCString())).subtract(15, 'minutes')
            }
        }

        const queryResults = await s.query(`
            select gt.*
            FROM game_transaction gt
            WHERE gt.date >= :theDate AND gt.isFinalized = 0
            ORDER BY gt.dateCreated DESC
            ${options?.limit ? `LIMIT ${options.limit} ` : ' '}
            ${options?.offset ? `OFFSET ${options.offset} ` : ' '}
        `, Object.assign(queryOptions, options))

        return queryResults
    }

    async getByIds(ids: string[], options?: any): Promise<GameTransaction[]> {

        let queryOptions = {
            where: {
                _id: {
                    [Op.in]: ids
                }
            },
            order: [
                ['name', 'desc']
            ]
        }

        return GameTransaction.findAll(Object.assign(queryOptions, options))
    }

    async getByTeamSeason(team:Team, season:Season, options?: any): Promise<GameTransaction[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.SELECT,
            mapToModel: true,
            model: GameTransaction,
            replacements: {
                tokenId: team.tokenId,
                startDate: dayjs(season.startDate).format("YYYY-MM-DD"),
                endDate: dayjs(season.endDate).format("YYYY-MM-DD")
            }
        }

        const queryResults = await s.query(`
            select gt.*
            FROM game_transaction gt
            WHERE :tokenId MEMBER OF(links->'$.teamTokenIds') AND gt.date >= :startDate AND gt.date <= :endDate
            ORDER BY gt.dateCreated DESC
            ${options?.limit ? `LIMIT ${options.limit} ` : ' '}
            ${options?.offset ? `OFFSET ${options.offset} ` : ' '}
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async getByLeagueSeason(league:League, season:Season, options?: any): Promise<GameTransaction[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.SELECT,
            mapToModel: true,
            model: GameTransaction,
            replacements: {
                leagueRank: league.rank,
                startDate: dayjs(season.startDate).format("YYYY-MM-DD"),
                endDate: dayjs(season.endDate).format("YYYY-MM-DD")
            }
        }

        const queryResults = await s.query(`
            select gt.*
            FROM game_transaction gt
            WHERE :leagueRank MEMBER OF(links->'$.leagueRanks') AND gt.date >= :startDate AND gt.date <= :endDate
            ORDER BY gt.dateCreated DESC
            ${options?.limit ? `LIMIT ${options.limit} ` : ' '}
            ${options?.offset ? `OFFSET ${options.offset} ` : ' '}
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async getByPlayer(player:Player, options?: any): Promise<GameTransaction[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.SELECT,
            mapToModel: true,
            model: GameTransaction,
            replacements: {
                playerTokenId: player.tokenId
            }
        }

        const queryResults = await s.query(`
            select gt.*
            FROM game_transaction gt
            WHERE :playerTokenId MEMBER OF(links->'$.playerTokenIds')
            ORDER BY gt.dateCreated DESC
            ${options?.limit ? `LIMIT ${options.limit} ` : ' '}
            ${options?.offset ? `OFFSET ${options.offset} ` : ' '}
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    // async getByProcessedEventIds(ids: string[], options?: any): Promise<GameTransaction[]> {

    //     let queryOptions = {
    //         where: {
    //             processedEventId: {
    //                 [Op.in]: ids
    //             }
    //         },
    //         order: [
    //             ['dateCreated', 'desc']
    //         ]
    //     }

    //     return GameTransaction.findAll(Object.assign(queryOptions, options))
    // }

    // async getByProcessedTransactionIds(ids: string[], options?: any): Promise<GameTransaction[]> {

    //     let queryOptions = {
    //         where: {
    //             processedTransactionId: {
    //                 [Op.in]: ids
    //             }
    //         },
    //         order: [
    //             ['dateCreated', 'desc']
    //         ]
    //     }

    //     return GameTransaction.findAll(Object.assign(queryOptions, options))
    // }

}


export {
    GameTransactionRepositoryNodeImpl
}