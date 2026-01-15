import { inject, injectable } from "inversify";

import { League } from "../../dto/league.js";
import { Season } from "../../dto/season.js";
import { PlayerLeagueSeason } from "../../dto/player-league-season.js";
import { PlayerLeagueSeasonRepository } from "../../repository/player-league-season-repository.js";
import { Player } from "../../dto/player.js";
import { Team } from "../../dto/team.js";
import { HitterPitcher,  Position } from "../enums.js";
import { PlayerService } from "./player-service.js";
import { v4 as uuidv4 } from 'uuid';

@injectable()
class PlayerLeagueSeasonService {

    @inject("PlayerLeagueSeasonRepository")
    private playerLeagueSeasonRepository:PlayerLeagueSeasonRepository

    constructor(
    ) {}
        
    async get(player:Player, league:League, season:Season, options?:any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.get(player, league, season, options)
    }

    async getIdsByPlayersSeason(players:Player[], season:Season, options?:any) {
        return this.playerLeagueSeasonRepository.getIdsByPlayersSeason(players, season, options)
    }

    async getByPlayersSeason(players:Player[], season:Season, options?:any) {
        let ids = await this.playerLeagueSeasonRepository.getIdsByPlayersSeason(players, season, options)
        return this.playerLeagueSeasonRepository.getByIds(ids, options)
    }

    async updateGameFields(plss:PlayerLeagueSeason[], options?:any) {
        return this.playerLeagueSeasonRepository.updateGameFields(plss, options)
    }

    async getByPlayerSeason(player:Player,  season:Season, options?:any): Promise<PlayerLeagueSeason> {
        let id = await this.playerLeagueSeasonRepository.getIdByPlayerSeason(player, season, options)
        return this.playerLeagueSeasonRepository.getById(id, options)
    }


    async getBySeason(season: Season, options?: any): Promise<PlayerLeagueSeason[]> {

        let ids = await this.playerLeagueSeasonRepository.getIdsBySeason(season, options)

        return this.playerLeagueSeasonRepository.getByIds(ids, options)

    }


    async listByPlayerSeason(player:Player,  season:Season, options?:any): Promise<PlayerLeagueSeason[]> {

        let ids = await this.playerLeagueSeasonRepository.getIdsByPlayerSeason(player, season, options)

        return this.playerLeagueSeasonRepository.getByIds(ids, options)

    }


    async list(player:Player, options?:any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.list(player, options)
    }

    // async getMostRecentByLeague(league: League, options?: any): Promise<PlayerLeagueSeason[]> {
    //     return this.playerLeagueSeasonRepository.getMostRecentByLeague(league, options)
    // }

    async getCurrentByTeam(team:Team, options?:any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.getCurrentByTeam(team, options)
    }

    async put(pls:PlayerLeagueSeason, options?:any): Promise<PlayerLeagueSeason> {
        return this.playerLeagueSeasonRepository.put(pls, options)
    }

    async listAll(options?:any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.listAll(options)
    }

    async getMostRecentByPlayerSeason(player: Player, season:Season, options?: any): Promise<PlayerLeagueSeason> {
        return this.playerLeagueSeasonRepository.getMostRecentByPlayerSeason(player, season, options)
    }


    async getMostRecentByTeam(team: Team, options?: any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.getMostRecentByTeam(team, options)
    }

    async getFreeAgentsByPosition(position:Position, season:Season, limit:number, offset:number , options?:any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.getFreeAgentsByPosition(position, season, limit, offset, options)
    }

    async getById(_id:string, options?:any): Promise<PlayerLeagueSeason> {
        return this.playerLeagueSeasonRepository.getById(_id, options)
    }

    async getByIds(ids: string[], options?: any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.getByIds(ids, options)
    }

    async getByTeamSeason(team: Team, season: Season, options?: any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.getByTeamSeason(team, season, options)
    }

    async getByLeagueSeason(league: League, season: Season, positions:Position[], sortColumn:string, sortDirection:string, options?: any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.getByLeagueSeason(league, season, positions, sortColumn, sortDirection, options)
    }

    async getMostRecentByTeamSeason(team: Team, season:Season, options?: any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.getMostRecentByTeamSeason(team, season, options)
    }

    async getMostRecentByLeagueSeason(league: League, season:Season, options?: any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.getMostRecentByLeagueSeason(league, season, options)
    }

    async getMostRecentBySeason(season:Season, options?: any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.getMostRecentBySeason(season, options)
    }

    async listActive(player: Player, options?: any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.listActive(player, options)
    }

    async getFreeAgentsBySeason(season:Season,positions:Position[], sortColumn:string, sortDirection:string, options?:any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.getFreeAgentsBySeason(season, positions, sortColumn, sortDirection, options)
    }

    async getByPlayer(player: Player, options?: any): Promise<PlayerLeagueSeason[]> {
        return this.playerLeagueSeasonRepository.getByPlayer(player, options)
    }

    async getFreeAgentIdsBySeason(season:Season, options?:any): Promise<string[]> {
        return this.playerLeagueSeasonRepository.getFreeAgentIdsBySeason(season, options)
    }

    async delete(pls:PlayerLeagueSeason, options?:any) {
        return this.playerLeagueSeasonRepository.delete(pls, options)
    }

    async createPlayerLeagueSeason(player:Player, season:Season, seasonIndex:number, options?:any) : Promise<PlayerLeagueSeason> {
        
        //Create player season
        let pls:PlayerLeagueSeason = new PlayerLeagueSeason()
        pls._id = uuidv4()
        pls.playerId = player._id
        pls.seasonId = season._id
        pls.seasonIndex = seasonIndex
        pls.primaryPosition = player.primaryPosition
        pls.startDate = season.startDate
        pls.endDate = season.endDate
        pls.overallRating = player.overallRating
        pls.displayRating = player.displayRating
        pls.pitchRatings = player.pitchRatings
        pls.hittingRatings = player.hittingRatings
        pls.stats = player.careerStats
        pls.age = player.age


        await this.playerLeagueSeasonRepository.put(pls, options)

        return this.playerLeagueSeasonRepository.getById(pls._id, options)


    }

}

export {
    PlayerLeagueSeasonService
}