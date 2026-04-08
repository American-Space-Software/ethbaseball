import { inject, injectable } from "inversify"

import { GameNotifications } from "../../dto/game-notifications.js"
import { Game } from "../../dto/game.js"
import { GameNotificationsRepository } from "../game-notifications-repository.js"

@injectable()
class GameNotificationsRepositoryNodeImpl implements GameNotificationsRepository {

    @inject("sequelize")
    private sequelize:Function

    async get(id: string, options?: any): Promise<GameNotifications> {
        return GameNotifications.findByPk(id, options)
    }

    async put(gn: GameNotifications, options?: any): Promise<GameNotifications> {
        await gn.save(options)
        return gn
    }

    async getByGame(game: Game, options?: any): Promise<GameNotifications> {
        const query = {
            where: {
                gameId: game._id
            }
        }

        return GameNotifications.findOne(Object.assign(query, options))
    }

    async getIdsUpdatedSince(lastUpdated:Date, options?: any) : Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                lastUpdated: lastUpdated
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                gn._id
            from game_notifications gn
            WHERE 
                gn.lastUpdated > :lastUpdated
            ORDER BY gn.lastUpdated DESC
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getByIds(ids: string[], options?: any): Promise<GameNotifications[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.SELECT,
            mapToModel: true,
            model: GameNotifications,
            replacements: {
                ids: ids
            }
        }

        const queryResults = await s.query(`
            select gn.*
            FROM game_notifications gn
            WHERE gn._id IN (:ids)
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async getNotComplete(options?: any): Promise<GameNotifications[]> {
        
        const query = {
            where: {
                isComplete: false
            }
        }

        return GameNotifications.findAll(Object.assign(query, options))
    }


}

export {
    GameNotificationsRepositoryNodeImpl
}