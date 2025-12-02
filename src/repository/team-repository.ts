import { League } from "../dto/league.js"
import { Owner } from "../dto/owner.js"
import { Season } from "../dto/season.js"
import { Team } from "../dto/team.js"
import { User } from "../dto/user.js"
import { TeamRating, TeamRecord } from "./node/team-repository-impl.js"

interface TeamRepository {
    get(id:string, options?:any): Promise<Team>
    getByTokenId(tokenId: number, options?: any): Promise<Team> 
    getHighestTokenId(options?: any): Promise<Team>
    getByIds(_ids:string[], options?:any): Promise<Team[]>
    getByTokenIds(_ids:number[], options?:any): Promise<Team[]>
    getWithCityAndStadium(_id:string, options?:any): Promise<Team>
    put(team:Team, options?:any) : Promise<Team>
    getByUser(user:User, options?: any): Promise<Team[]>
    count(options?:any): Promise<number> 
    countByLeague(league:League, options?:any): Promise<number>
    list(limit: number, skip: number, options?:any): Promise<Team[]> 
    listByLeagueAndSeason(league:League, season:Season, options?:any): Promise<Team[]>
    listBySeason(season:Season, options?:any): Promise<Team[]>
    getEligibleTeams(options?:any) : Promise<Team[]>
    getRatings(options?:any)
    getMaxRanking(options?:any) : Promise<number>
    getIds(options?:any): Promise<string[]>
    getUpdatedSince(lastUpdated:Date, options?: any) : Promise<Team[]>
    getOverallRecordsBySeason(season:Season, options?:any) : Promise<TeamRecord[]>
    getOverallRecordBySeason(team:Team, season:Season, options?:any)
    addToLeagueSeason(team:Team, league:League, season:Season, options?:any)
    getClosetRatedBot(rating:number, options?:any): Promise<Team>
}

export {
    TeamRepository
}
