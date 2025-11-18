import { inject, injectable } from "inversify"

import { Team } from "../../dto/team.js"
import { TeamLeagueSeasonRepository } from "../team-league-season-repository.js"
import { TeamLeagueSeason } from "../../dto/team-league-season.js"
import { Season } from "../../dto/season.js"
import { League } from "../../dto/league.js"
import { Stadium } from "../../dto/stadium.js"
import { City } from "../../dto/city.js"
import { Owner } from "../../dto/owner.js"
import { TeamSeasonId, TokenSeasonId } from "../../service/enums.js"
import { Op } from "sequelize"
import { User } from "../../dto/user.js"



@injectable()
class TeamLeagueSeasonRepositoryNodeImpl implements TeamLeagueSeasonRepository {

    @inject("sequelize")
    private sequelize: Function

    async getById(_id: string, options?: any): Promise<TeamLeagueSeason> {
        return TeamLeagueSeason.findByPk(_id, options)
    }

    async getByIds(_ids: string[], options?: any): Promise<TeamLeagueSeason[]> {

        let s = await this.sequelize()

        let query = {

            where: {
                _id: {
                    [Op.in]: _ids
                }
            },
            order: [[s.col('season.startDate'), 'DESC']],
            include: [Team, League, Season, City, Stadium]
        }

        return TeamLeagueSeason.findAll(Object.assign(query, options))
    }

    async get(team: Team, league: League, season: Season, options?: any): Promise<TeamLeagueSeason> {

        let query = {

            where: {
                teamId: team._id,
                seasonId: season._id,
                leagueId: league._id
            },
            include: [Team, League, Season, City, Stadium]
        }

        return TeamLeagueSeason.findOne(Object.assign(query, options))

    }


    async getByTeam(team: Team, options?: any): Promise<TeamLeagueSeason[]> {

        let s = await this.sequelize()

        let query = {

            where: {
                teamId: team._id
            },
            order: [[s.col('season.startDate'), 'DESC']],
            include: [Team, League, Season, City, Stadium]
        }

        return TeamLeagueSeason.findAll(Object.assign(query, options))


    }

    async getByTeamSeason(team: Team, season: Season, options?: any): Promise<TeamLeagueSeason> {

        let s = await this.sequelize()

        let query = {

            where: {
                teamId: team._id,
                seasonId: season._id
            },
            order: [[s.col('season.startDate'), 'DESC']],
            include: [Team, League, Season, City, Stadium]
        }

        return TeamLeagueSeason.findOne(Object.assign(query, options))


    }


    async getByTeamSeasonIds( teamSeasonIds:TeamSeasonId[], options?: any): Promise<TeamLeagueSeason[]> {

        let s = await this.sequelize()

        if (teamSeasonIds?.length < 1) {
            return []
        }
        

        // Generate parameterized placeholders
        const replacements: any = {}
        const values = teamSeasonIds
            .map(({ teamId, seasonId }, index) => {
                replacements[`teamId${index}`] = teamId
                replacements[`seasonId${index}`] = seasonId
                return `(:teamId${index}, :seasonId${index})`
            })
            .join(", ")


        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: replacements
        }
    
        let query = `SELECT tls._id
            FROM team_league_season tls
            WHERE (tls.teamId, tls.seasonId) IN (${values})
            ORDER BY tls.seasonId DESC
            ${options?.limit ? `LIMIT :limit` : ''}
            ${options?.offset ? `OFFSET :offset` : ''}`


        const queryResults = await s.query(query, Object.assign(queryOptions, options) )

        let ids = queryResults[0].map(qr => qr._id)

        return this.getByIds(ids, options)


    }

    async getMostRecent(team: Team, options?: any): Promise<TeamLeagueSeason> {

        let s = await this.sequelize()


        let query = {

            where: {
                teamId: team._id
            },
            order: [[s.col('season.startDate'), 'DESC']],
            include: [Team, League, Season, City, Stadium]
        }

        return TeamLeagueSeason.findOne(Object.assign(query, options))


    }



    async put(tls: TeamLeagueSeason, options?: any): Promise<TeamLeagueSeason> {

        await tls.save(options)
        return tls

    }

    async listByUserAndSeason(user: User, season: Season, options?: any): Promise<TeamLeagueSeason[]> {

        let query = {

            where: {
                seasonId: season._id,
                '$team.userId$': user._id
            },

            order: [
                ['longTermRating.rating', 'desc'],
                ['seasonRating.rating', 'desc'],
            ],
            include: [Team, League, Season, City, Stadium]

        }

        return TeamLeagueSeason.findAll(Object.assign(query, options))
    }



    async listByLeagueAndSeason(league: League, season: Season, options?: any): Promise<TeamLeagueSeason[]> {

        let query = {

            where: {
                seasonId: season._id,
                leagueId: league._id,
            },
            order: [
                ['longTermRating.rating', 'desc'],
                ['seasonRating.rating', 'desc'],
            ],
            include: [Team, League, Season, City, Stadium]

        }

        return TeamLeagueSeason.findAll(Object.assign(query, options))
    }


    async listBySeason(season: Season, options?: any): Promise<TeamLeagueSeason[]> {

        let query = {

            where: {
                seasonId: season._id
            },
            order: [
                ['longTermRating.rating', 'desc'],
                ['seasonRating.rating', 'desc'],
            ],
            include: [Team, League, Season, City, Stadium]

        }

        return TeamLeagueSeason.findAll(Object.assign(query, options))
    }

}



export {
    TeamLeagueSeasonRepositoryNodeImpl
}