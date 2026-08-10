import { GamePitchResult } from "../dto/game-pitch-result.js"
import { Game } from "../dto/game.js"
import { Player } from "../dto/player.js"
import { Season } from "../dto/season.js"
import { PitchResultCount }  from 'baseball-sim-engine';

interface GamePitchResultRepository {
    get(game:Game, player:Player, options?:any): Promise<GamePitchResult>
    getByPlayer(player:Player, options?:any): Promise<GamePitchResult[]>
    put(gamePitchResult:GamePitchResult, options?:any) : Promise<GamePitchResult>
    getPlayersCareerPitchResults(playerIds: string[], options?: any): Promise<PitchResultCount[]>
    getPlayersSeasonPitchResults(playerIds: string[], seasonId: string, options?: any): Promise<PitchResultCount[]>
    getPlayerCareerPitchResult(player:Player, options?:any) : Promise<PitchResultCount>     
    getPlayerSeasonPitchResult(player: Player, season: Season, options?: any): Promise<PitchResultCount | undefined>
    getGlobalPitchResult(options?:any) : Promise<PitchResultCount>
    getStartsByPlayer(playerId:string, options?:any): Promise<GamePitchResult[]>
    updateGamePitchResults(pitchResults: GamePitchResult[], options?: any)
    getSumsByPlayerAndDate(player:Player, date:Date, options?:any) : Promise<PitchResultCount>
}

export {
    GamePitchResultRepository
}
