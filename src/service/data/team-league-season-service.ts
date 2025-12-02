import { inject, injectable } from "inversify";

import { TeamLeagueSeasonRepository } from "../../repository/team-league-season-repository.js";
import { FinanceSeason, Team } from "../../dto/team.js";
import { League } from "../../dto/league.js";
import { TeamLeagueSeason } from "../../dto/team-league-season.js";
import { Season } from "../../dto/season.js";
import { Stadium } from "../../dto/stadium.js";
import { City } from "../../dto/city.js";
import { Position, TeamSeasonId } from "../enums.js";
import { v4 as uuidv4 } from 'uuid';
import { Owner } from "../../dto/owner.js";
import { User } from "../../dto/user.js";

@injectable()
class TeamLeagueSeasonService {

    @inject("TeamLeagueSeasonRepository")
    private teamLeagueSeasonRepository:TeamLeagueSeasonRepository

    constructor(
    ) {}

    initNew(team:Team, league:League, season:Season, city:City, stadium:Stadium, financeSeason:FinanceSeason) : TeamLeagueSeason {

        let tls = new TeamLeagueSeason()
        tls._id = uuidv4()
        tls.teamId = team._id
        tls.team = team

        tls.leagueId = league._id
        tls.league = league

        tls.seasonId = season._id
        tls.season = season

        tls.cityId = city?._id
        tls.city = city

        tls.stadiumId = stadium?._id
        tls.stadium = stadium

        tls.financeSeason = financeSeason


        //Generate initial fan interest 
        tls.fanInterestShortTerm = .5
        tls.fanInterestLongTerm = .5

        tls.lineups = [{
            order: [{},{},{},{},{},{},{},{},{ position: Position.PITCHER }],
            rotation: [
                {},{},{},{},{}
            ]
        }]

        tls.hasValidLineup = false

        tls.seasonRating = team.seasonRating
        tls.longTermRating = team.longTermRating

        tls.overallRecord = { 
            wins: 0, 
            losses: 0,
            gamesBehind: 0,
            resultLast10: [],
            rank: 0,
            runsAgainst: 0,
            runsScored: 0,
            winPercent: 0
        }
        

        return tls

    }


    init(previous:TeamLeagueSeason, team:Team, financeSeason:FinanceSeason) : TeamLeagueSeason {

        let tls = new TeamLeagueSeason()
        tls._id = uuidv4()
        tls.teamId = team._id
        tls.team = team

        tls.leagueId = previous.leagueId
        tls.league = previous.league

        tls.seasonId = previous.seasonId
        tls.season = previous.season

        tls.cityId = previous.cityId
        tls.city = previous.city

        tls.stadiumId = previous.stadiumId
        tls.stadium = previous.stadium

        tls.fanInterestShortTerm = .5
        tls.fanInterestLongTerm = previous.fanInterestLongTerm
        tls.lineups = previous.lineups
        tls.hasValidLineup = previous.hasValidLineup
        tls.seasonRating = previous.seasonRating
        tls.longTermRating = previous.longTermRating

        tls.overallRecord = { 
            wins: 0, 
            losses: 0,
            gamesBehind: 0,
            resultLast10: [],
            rank: 0,
            runsAgainst: 0,
            runsScored: 0,
            winPercent: 0
        }
        
        tls.financeSeason = financeSeason


        return tls

    }

    async get(team:Team, league:League, season:Season, options?:any): Promise<TeamLeagueSeason> {
        return this.teamLeagueSeasonRepository.get(team, league, season, options)
    }

    async put(tls:TeamLeagueSeason, options?:any): Promise<TeamLeagueSeason> {

        if (tls.lineups[0].order[8].position != Position.PITCHER) {
            throw new Error("Invalid lineup")
        } else if (tls.lineups[0].order[8]._id != undefined) {
            throw new Error("Invalid lineup (pitcher)")
        }       

        return this.teamLeagueSeasonRepository.put(tls, options)
    }

    async listByLeagueAndSeason(league:League, season:Season, options?:any): Promise<TeamLeagueSeason[]> {
        return this.teamLeagueSeasonRepository.listByLeagueAndSeason(league, season, options)
    }

    async listBySeason(season:Season, options?:any): Promise<TeamLeagueSeason[]> {
        return this.teamLeagueSeasonRepository.listBySeason(season, options)
    }

    async getMostRecent(team:Team, options?:any): Promise<TeamLeagueSeason> {
        return this.teamLeagueSeasonRepository.getMostRecent(team, options)
    }

    async getByTeamSeason(team:Team, season:Season, options?:any): Promise<TeamLeagueSeason> {
        return this.teamLeagueSeasonRepository.getByTeamSeason(team, season, options)
    }

    async getByTeam(team:Team, options?:any): Promise<TeamLeagueSeason[]> {
        return this.teamLeagueSeasonRepository.getByTeam(team, options)
    }

    async listByUserAndSeason(user:User, season:Season, options?:any): Promise<TeamLeagueSeason[]> {
        return this.teamLeagueSeasonRepository.listByUserAndSeason(user, season, options)
    }

    async getByTeamSeasonIds(tokenSeasonIds:TeamSeasonId[], options?: any): Promise<TeamLeagueSeason[]> {
        return this.teamLeagueSeasonRepository.getByTeamSeasonIds(tokenSeasonIds, options)
    }

}

export {
    TeamLeagueSeasonService
}