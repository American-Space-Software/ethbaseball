import { League } from "../dto/league.js"
import { Owner } from "../dto/owner.js"
import { Player } from "../dto/player.js"
import { Season } from "../dto/season.js"
import { Team } from "../dto/team.js"
import { GameLevel, HittingRatings, PitchRatings, PlayerFinalContract, PlayerPercentileRatings, PlayerReport, Position } from "../service/enums.js"

interface PlayerRepository {
    get(id:string, options?:any): Promise<Player>
    getByTokenId(tokenId:number, options?:any) : Promise<Player>
    getByTokenIdWithTeam(tokenId: number, options?: any): Promise<Player>
    getByTokenIds(tokenIds:number[], options?:any) : Promise<Player[]>
    getByIds(ids:string[], options?:any) : Promise<Player[]>

    getWithTeamByIds(ids: string[], options?: any): Promise<any[]>
    getWithTeam(id: string, options?: any): Promise<Player>

    delete(player:Player, options?:any)

    list(options?: any) : Promise<Player[]>
    listWithTeams(options?: any) : Promise<any[]>
    listByOwnerWithTeams(owner:Owner, options?: any) : Promise<any[]>
    getByOwner(owner:Owner, options?:any): Promise<Player[]>

    getLatest(options?:any): Promise<Player>

    countByOwner(owner:Owner, options?:any) : Promise<number>
    count(options?:any): Promise<number>
    countActive(options?:any): Promise<number>
    // countGames(playerIds:string[], options?:any)
    getMaxTokenId(options?:any) : Promise<number>
    put(player:Player, options?:any) : Promise<Player>
    putAll(players:Player[], options?:any) : Promise<void>
    getPlayerReport(options?:any) : Promise<PlayerReport>
    updateGameFields(players:Player[], options?:any): Promise<void>
    clearAllTransactions( options?:any) : Promise<void>
    getUpdatedLastGameSince(lastUpdated:Date, options?: any) : Promise<Player[]>
    // setLastGameUpdate(playerIds: string[], options?: any)
    // setLastGamePlayed(playerIds: string[], gameDate:Date, options?: any)
    
    getIds(options?:any): Promise<string[]> 

    getHitterIds(options?:any): Promise<string[]>
    getHitterIdsByOwner(owner:Owner, options?:any): Promise<string[]> 

    getPitcherIds(options?:any): Promise<string[]> 
    getPitcherIdsByOwner(owner:Owner, options?:any): Promise<string[]>

    getDisplayPlayersById(playerIds:string[], options?:any)
    // getRecentAveragePlayerRating(options?:any) : Promise<{ age:number, averageRating:number }>    
    // getLeagueAveragePlayerRating(league:League, options?:any) : Promise<{ age:number, averageRating:number }>

    getLeagueAverageHitterRatings(league:League, season:Season, options?:any) : Promise<HittingRatings>
    getLeagueAveragePitcherRatings(league:League, season:Season, options?:any) : Promise<PitchRatings>
    
    getFreeAgentPitcherIds(date:Date, options?:any): Promise<string[]>
    getFreeAgentHitterIds(date:Date, options?:any): Promise<string[]>
    // getFreeAgentIdsByPosition(position:Position, limit:number, offset:number, options?:any): Promise<string[]>    
    getFreeAgentIdsByPositionAndSalary(position:Position, salary:bigint, date:Date, limit:number, offset:number , options?:any): Promise<string[]>
    getFreeAgentsAfterSeason(season:Season, options?:any) : Promise<PlayerFinalContract[]>

    getPurgeable(options?: any) : Promise<Player[]>
    getPlayerPercentileRatings(options?:any) : Promise<PlayerPercentileRatings[]>
}

export {
    PlayerRepository
}
