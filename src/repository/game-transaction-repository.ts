import { GameTransaction } from "../dto/game-transaction.js"
import { League } from "../dto/league.js"
import { Player } from "../dto/player.js"
import { Season } from "../dto/season.js"
import { Team } from "../dto/team.js"

interface GameTransactionRepository {
    get(id:string, options?:any): Promise<GameTransaction>
    getByIds(ids:string[], options?:any): Promise<GameTransaction[]>
    getByTeamSeason(team:Team, season:Season, options?: any): Promise<GameTransaction[]>
    getByLeagueSeason(league:League, season:Season, options?: any): Promise<GameTransaction[]>
    getByPlayer(player:Player, options?: any): Promise<GameTransaction[]>
    getReadyToFinalize(options?: any): Promise<GameTransaction[]>
    put(gt:GameTransaction, options?:any) : Promise<GameTransaction>
    remove(gt:GameTransaction, options?:any) : Promise<GameTransaction>
    list(options?: any): Promise<GameTransaction[]>
}

export {
    GameTransactionRepository
}
