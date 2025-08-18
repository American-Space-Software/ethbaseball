import {  injectable } from "inversify"

import { GameTeamRepository } from "../game-team-repository.js"
import { GameTeam } from "../../dto/game.js"


@injectable()
class GameTeamRepositoryNodeImpl implements GameTeamRepository {
    
    async put(gameTeam:GameTeam, options?:any): Promise<GameTeam> {

        await gameTeam.save(options)
        return gameTeam

    }

}



export {
    GameTeamRepositoryNodeImpl
}