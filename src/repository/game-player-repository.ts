import { GamePlayer } from "../dto/game.js"

interface GamePlayerRepository {
    put(gamePlayer:GamePlayer, options?:any) : Promise<GamePlayer>
    insertAll(gamePlayers:GamePlayer[], options?:any)
}

export {
    GamePlayerRepository
}
