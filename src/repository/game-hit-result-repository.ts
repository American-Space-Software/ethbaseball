import { GameHitResult } from "../dto/game-hit-result.js"
import { Game } from "../dto/game.js"
import { Player } from "../dto/player.js"
import { Season } from "../dto/season.js"
import { HitResultCount }  from '../baseball-sim-engine/index.js';

interface GameHitResultRepository {
    get(game:Game, player:Player, options?:any): Promise<GameHitResult>
    getByPlayer(player:Player, options?:any): Promise<GameHitResult[]>
    put(gameHitResult:GameHitResult, options?:any) : Promise<GameHitResult>
    getPlayersCareerHitResults(playerIds: string[], options?: any): Promise<HitResultCount[]>
    getPlayersSeasonHitResults(playerIds: string[], seasonId: string, options?: any): Promise<HitResultCount[]>
    getPlayerCareerHitResult(player:Player, options?:any) : Promise<HitResultCount>
    getPlayerSeasonHitResult(player: Player, season: Season, options?: any): Promise<HitResultCount | undefined>
    getGlobalHitResult(options?:any) : Promise<HitResultCount>
    updateGameHitResults(hitResults: GameHitResult[], options?: any) : Promise<void>
    getSumsByPlayerAndDate(player:Player, date:Date, options?:any) : Promise<HitResultCount>
}

export {
    GameHitResultRepository
}
