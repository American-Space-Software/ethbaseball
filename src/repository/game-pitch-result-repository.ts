import { GameHitResult } from "../dto/game-hit-result.js"
import { GamePitchResult, PitchResult } from "../dto/game-pitch-result.js"
import { Player } from "../dto/player.js"

interface GamePitchResultRepository {
    get(gameId:string, playerId:string, options?:any): Promise<GamePitchResult>
    getByPlayer(playerId:string, options?:any): Promise<GamePitchResult[]>
    put(gamePitchResult:GamePitchResult, options?:any) : Promise<GamePitchResult>
    getCareerSeasonsPitchResult(playerId:string, options?:any) : Promise<PitchResult[]> 
    getCareerPitchResult(playerId:string, options?:any) : Promise<PitchResult>
    getAverageCareerPitchResult(playerId:string, options?:any) : Promise<PitchResult>
    getGameAveragePitchResult(options?:any) : Promise<PitchResult> 
    getPlayersWithCareerPitchResult(playerIds:string[], options?:any)
    getTeamPitchResult(teamId:number, options?:any) : Promise<PitchResult>
    getGlobalPitchResult(options?:any) : Promise<PitchResult>
    getStartsByPlayer(playerId:string, options?:any): Promise<GamePitchResult[]>
    updateGamePitchResults(pitchResults: GamePitchResult[], options?: any)
}

export {
    GamePitchResultRepository
}
