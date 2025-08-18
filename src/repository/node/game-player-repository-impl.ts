import {  injectable } from "inversify"


import { GamePlayerRepository } from "../game-player-repository.js"
import { GamePlayer } from "../../dto/game.js"


@injectable()
class GamePlayerRepositoryNodeImpl implements GamePlayerRepository {
    
    async put(gamePlayer:GamePlayer, options?:any): Promise<GamePlayer> {

        await gamePlayer.save(options)
        return gamePlayer

    }

    async insertAll(gamePlayers:GamePlayer[], options?:any) {

        let queryOptions = Object.assign({ 
            fields: ["playerId","gameId"], 
            updateOnDuplicate: ["playerId","gameId"],
        }, options)

        let updatePlayers = gamePlayers.map( p => {
            return {
                playerId: p.playerId,
                gameId: p.gameId
            }
        })

        await GamePlayer.bulkCreate(updatePlayers, queryOptions)
    }

}



export {
    GamePlayerRepositoryNodeImpl
}