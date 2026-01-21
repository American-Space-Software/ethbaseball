import { GameHitResult, HitResult } from "../dto/game-hit-result.js"
import { Game } from "../dto/game.js"
import { Player } from "../dto/player.js"
import { Season } from "../dto/season.js"

interface GameHitResultRepository {
    get(game:Game, player:Player, options?:any): Promise<GameHitResult>
    getByPlayer(player:Player, options?:any): Promise<GameHitResult[]>
    put(gameHitResult:GameHitResult, options?:any) : Promise<GameHitResult>
    getPlayersCareerHitResults(playerIds: string[], options?: any): Promise<HitResult[]>
    getPlayersSeasonHitResults(playerIds: string[], seasonId: string, options?: any): Promise<HitResult[]>
    getPlayerCareerHitResult(player:Player, options?:any) : Promise<HitResult>
    getPlayerSeasonHitResult(player: Player, season: Season, options?: any): Promise<HitResult | undefined>
    getGlobalHitResult(options?:any) : Promise<HitResult>
    updateGameHitResults(hitResults: GameHitResult[], options?: any) : Promise<void>
    getSumsByPlayerAndDate(player:Player, date:Date, options?:any) : Promise<HitResult>
}

export {
    GameHitResultRepository
}
