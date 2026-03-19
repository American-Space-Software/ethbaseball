import { Game } from "../dto/game.js"
import { League } from "../dto/league.js"
import { Season } from "../dto/season.js"
import { Team } from "../dto/team.js"


interface GameRepository {
    get(id:string, options?:any): Promise<Game>
    put(game:Game, options?:any) : Promise<Game>
    getIdsNoSummary(options?: any) : Promise<string[]>
    getInProgressIds(options?:any) : Promise<string[]>
    getInProgressIdsByTeam(team:Team, options?:any) : Promise<string[]>
    getByIds(ids: string[], options?: any): Promise<Game[]>
    getByDateIds(date:Date, options?:any): Promise<string[]>
    getByDateAndLeagueIds(date:Date, league:League, options?:any): Promise<string[]>
    getByLeagueIds(league:League, options?:any): Promise<string[]>    
    getByDateAndTeamIds(date:Date, teams:Team[], options?:any): Promise<string[]>
    getByDatesAndTeamIds(dates:Date[], teams:Team[], options?:any): Promise<string[]>
    getIdsByTeamAndPeriod(team:Team, start:Date, end:Date, options?:any)
    getIdsByTeamAndSeason(team:Team, season:Season, options?:any)
    getReadyForIncrementIds(options?:any) : Promise<string[]>
    getLastUpdate(options?:any) : Promise<Date>
    getRecentScheduledDate(options?:any) : Promise<Date>
    getIdsByTeam(team:Team, limit:number, offset:number, options?:any) : Promise<string[]>
    getRecentIdsByTeam(team:Team, limit:number, offset:number, options?:any)
    getUpcomingIdsByTeam(team:Team, limit:number, offset:number, options?:any)
    getUnfinishedByDateIds(date:Date, options?:any): Promise<string[]>
    getUnfinishedByDateAndLeagueIds(date:Date, league:League, options?:any): Promise<string[]>
    getUnfinishedByLeagueIds(league:League, options?:any): Promise<string[]>
    getResultsByDate(date:Date, options?:any): Promise<{ winningTeamId:string, losingTeamId:string }[]> 
    getPreviousDatesWithUnfinishedGames(date:Date, options?:any): Promise<string[]>
    getCompleteAndUnfinishedByDateIds(date:Date, options?:any): Promise<string[]>
    getInProgressIdsByDate(date:Date, options?:any) : Promise<string[]>
    updateGameRatings(games:Game[], options?:any)
    getGameCountsByTeamSeason(team:Team, season:Season, date:Date, options?:any)
    getIdsUpdatedSince(lastUpdated:Date, options?: any) : Promise<string[]>
}

export {
    GameRepository
}
