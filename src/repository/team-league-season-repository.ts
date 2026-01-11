
import { League } from "../dto/league.js"
import { Owner } from "../dto/owner.js"
import { Season } from "../dto/season.js"
import { TeamLeagueSeason } from "../dto/team-league-season.js"
import { Team } from "../dto/team.js"
import { User } from "../dto/user.js"
import { TeamSeasonId } from "../service/enums.js"

interface TeamLeagueSeasonRepository {
    get(team:Team, league:League, season:Season, options?:any): Promise<TeamLeagueSeason>    
    getById(_id:string, options?:any): Promise<TeamLeagueSeason>
    getByIds(_ids: string[], options?: any): Promise<TeamLeagueSeason[]>
    getByTeam(team:Team, options?:any): Promise<TeamLeagueSeason[]>
    getByTeamSeasonIds( tokenSeasonIds:TeamSeasonId[], options?: any): Promise<TeamLeagueSeason[]>
    getMostRecent(team:Team, options?:any): Promise<TeamLeagueSeason> 
    put(tls:TeamLeagueSeason, options?:any) : Promise<TeamLeagueSeason>
    listByLeagueAndSeason(league:League, season:Season, options?:any): Promise<TeamLeagueSeason[]>
    listBySeason(season:Season, options?:any): Promise<TeamLeagueSeason[]>
    getByTeamSeason(team:Team, season:Season, options?:any): Promise<TeamLeagueSeason>
    listByUserAndSeason(user:User, season:Season, options?:any): Promise<TeamLeagueSeason[]>
    listUserTeamsByLeagueAndSeason(league: League, season: Season, options?: any): Promise<TeamLeagueSeason[]>
}

export {
    TeamLeagueSeasonRepository
}
