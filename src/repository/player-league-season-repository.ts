
import { League } from "../dto/league.js"
import { PlayerLeagueSeason } from "../dto/player-league-season.js"
import { Player } from "../dto/player.js"
import { Season } from "../dto/season.js"
import { Team } from "../dto/team.js"
import { HitterPitcher, Position } from "../service/enums.js"

interface PlayerLeagueSeasonRepository {
    getById(_id: string, options?: any): Promise<PlayerLeagueSeason>
    get(player:Player, league:League, season:Season, options?:any): Promise<PlayerLeagueSeason[]>     
    getByPlayerSeason(player:Player, season:Season, options?:any): Promise<PlayerLeagueSeason[]>
    getByPlayer(player: Player, options?: any): Promise<PlayerLeagueSeason[]>
    getCurrentByTeam(team:Team, options?:any): Promise<PlayerLeagueSeason[]>
    put(pls:PlayerLeagueSeason, options?:any) : Promise<PlayerLeagueSeason>
    list(player:Player, options?:any): Promise<PlayerLeagueSeason[]>
    getByIds(ids: string[], options?: any): Promise<PlayerLeagueSeason[]>
    listAll(options?:any): Promise<PlayerLeagueSeason[]>
    listActive(player: Player, options?: any): Promise<PlayerLeagueSeason[]> 
    getIdsByPlayerSeason(player:Player, season:Season, options?:any) : Promise<string[]>
    getIdByPlayerSeason(player:Player, season:Season, options?:any) : Promise<string>
    updateGameFields(plss:PlayerLeagueSeason[], options?:any)
    getIdsByPlayersSeason(players:Player[], season:Season, options?:any)
    getIdsBySeason(season: Season, options?: any): Promise<string[]>
    // getByTeamOnDate(team: Team, date:Date, options?: any): Promise<PlayerLeagueSeason[]>
    getMostRecentByTeam(team: Team, options?: any): Promise<PlayerLeagueSeason[]>
    // getMostRecentByLeague(league: League, options?: any): Promise<PlayerLeagueSeason[]>
    getMostRecentByLeagueSeason(league: League, season:Season, options?: any): Promise<PlayerLeagueSeason[]>
    getMostRecentBySeason(season:Season, options?: any): Promise<PlayerLeagueSeason[]>
    getMostRecentByTeamSeason(team: Team, season:Season, options?: any): Promise<PlayerLeagueSeason[]>
    getMostRecentByPlayerSeason(player: Player, season:Season, options?: any): Promise<PlayerLeagueSeason>
    getByTeamSeason(team: Team, season: Season, options?: any): Promise<PlayerLeagueSeason[]> 
    getByLeagueSeason(league: League, season: Season, positions:Position[], sortColumn:string, sortDirection:string, options?: any): Promise<PlayerLeagueSeason[]>
    getFreeAgentsByPosition(position:Position, season:Season, limit:number, offset:number , options?:any): Promise<PlayerLeagueSeason[]>
    getFreeAgentsBySeason(season:Season, positions:Position[], sortColumn:string, sortDirection:string, options?:any): Promise<PlayerLeagueSeason[]>
    getFreeAgentIdsBySeason(season:Season, options?:any): Promise<string[]>
    delete(pls:PlayerLeagueSeason, options?:any)
    
}

export {
    PlayerLeagueSeasonRepository
}
