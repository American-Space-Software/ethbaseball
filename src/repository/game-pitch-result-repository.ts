import { GamePitchResult, PitchResult } from "../dto/game-pitch-result.js"
import { Game } from "../dto/game.js"
import { Player } from "../dto/player.js"
import { Season } from "../dto/season.js"

interface GamePitchResultRepository {
    get(game:Game, player:Player, options?:any): Promise<GamePitchResult>
    getByPlayer(player:Player, options?:any): Promise<GamePitchResult[]>
    put(gamePitchResult:GamePitchResult, options?:any) : Promise<GamePitchResult>
    getPlayersCareerPitchResults(playerIds: string[], options?: any): Promise<PitchResult[]>
    getPlayersSeasonPitchResults(playerIds: string[], seasonId: string, options?: any): Promise<PitchResult[]>
    getPlayerCareerPitchResult(player:Player, options?:any) : Promise<PitchResult>     
    getPlayerSeasonPitchResult(player: Player, season: Season, options?: any): Promise<PitchResult | undefined>
    getGlobalPitchResult(options?:any) : Promise<PitchResult>
    getStartsByPlayer(playerId:string, options?:any): Promise<GamePitchResult[]>
    updateGamePitchResults(pitchResults: GamePitchResult[], options?: any)
    getSumsByPlayerAndDate(player:Player, date:Date, options?:any) : Promise<PitchResult>
}

export {
    GamePitchResultRepository
}
