import { GameNotifications } from "../dto/game-notifications.js"
import { Game } from "../dto/game.js"

interface GameNotificationsRepository {

    get(id: string, options?: any): Promise<GameNotifications>
    put(gn: GameNotifications, options?: any): Promise<GameNotifications>

    getByGame(game: Game, options?: any): Promise<GameNotifications>
}

export {
    GameNotificationsRepository
}