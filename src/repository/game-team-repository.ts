import { GameTeam } from "../dto/game.js"

interface GameTeamRepository {
    put(GameTeam:GameTeam, options?:any) : Promise<GameTeam>
}

export {
    GameTeamRepository
}
