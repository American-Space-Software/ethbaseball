import { GameHitResult, HitResult } from "../dto/game-hit-result.js"
import { Player } from "../dto/player.js"

interface GameHitResultRepository {
    get(gameId:string, playerId:string, options?:any): Promise<GameHitResult>
    getByPlayer(playerId:string, options?:any): Promise<GameHitResult[]>
    put(gameHitResult:GameHitResult, options?:any) : Promise<GameHitResult>
    getCareerSeasonsHitResult(playerId:string, options?:any) : Promise<HitResult[]>
    getCareerHitResult(playerId:string, options?:any) : Promise<HitResult>
    getGameAverageHitResult(options?:any) : Promise<HitResult>
    getAverageCareerHitResult(playerId:string, options?:any) : Promise<HitResult>
    getPlayersWithCareerHitResult(playerIds:string[], options?:any)
    getTeamHitResult(teamId:number, options?:any) : Promise<HitResult>
    getGlobalHitResult(options?:any) : Promise<HitResult>
    updateGameHitResults(hitResults: GameHitResult[], options?: any) : Promise<void>
}

export {
    GameHitResultRepository
}
