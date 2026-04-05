import { injectable } from "inversify"

import { GameNotifications } from "../../dto/game-notifications.js"
import { Game } from "../../dto/game.js"
import { GameNotificationsRepository } from "../game-notifications-repository.js"

@injectable()
class GameNotificationsRepositoryNodeImpl implements GameNotificationsRepository {

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

}

export {
    GameNotificationsRepositoryNodeImpl
}