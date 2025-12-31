import {  inject, injectable } from "inversify"

import { TeamRepository } from "../team-repository.js"
import { OverallRecord, Team } from "../../dto/team.js"
import { Owner } from "../../dto/owner.js"
import { Rating } from "../../service/enums.js"
import { Op, QueryTypes } from "sequelize"
import { City } from "../../dto/city.js"
import { Stadium } from "../../dto/stadium.js"
import { Season } from "../../dto/season.js"
import { League } from "../../dto/league.js"
import { User } from "../../dto/user.js"
import dayjs from "dayjs"


@injectable()
class TeamRepositoryNodeImpl implements TeamRepository {

    @inject("sequelize")
    private sequelize:Function
    
    async getHighestTokenId(options?: any): Promise<Team> {

        let query = {

            order: [
                ['tokenId', 'DESC']
            ]
        }

        return Team.findOne(Object.assign(query, options))
    }

    async get(id:string, options?:any): Promise<Team> {
        return Team.findByPk(id, options)
    }

    async getByTokenId(tokenId: number, options?: any): Promise<Team> {

        let queryOptions = {
            where: {
                tokenId: tokenId
            },
            order: [
                ['tokenId', 'desc']
            ]
        }

        return Team.findOne(Object.assign(queryOptions, options))
    }

    async getByIds(_ids:string[], options?:any): Promise<Team[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.SELECT,
            mapToModel: true,
            model: Team,
            replacements: {
                ids: _ids
            }
        }

        const queryResults = await s.query(`
            select t.*
            FROM team t
            WHERE t._id IN (:ids)
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async getByTokenIds(_ids:number[], options?:any): Promise<Team[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.SELECT,
            mapToModel: true,
            model: Team,
            replacements: {
                ids: _ids
            }
        }

        const queryResults = await s.query(`
            select t.*
            FROM team t
            WHERE t.tokenId IN (:ids)
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async getWithCityAndStadium(_id:string, options?:any): Promise<Team> {

        let query = {
            where: {
                _id: _id
            },
            include: [Stadium, City],
        }

        return Team.findOne(Object.assign(query, options))

    }


    async getClosetRatedBot(rating:number, options?:any): Promise<Team> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.SELECT,
            mapToModel: true,
            model: Team,
            replacements: {
                rating: rating
            }
        }

        const queryResults = await s.query(`
            select t.*
            FROM team t
            WHERE t.userId is null
            ORDER BY ABS(CAST(longTermRating->>"$.rating" AS SIGNED))
            LIMIT 1
        `, Object.assign(queryOptions, options))


        if (queryResults?.length > 0) {
            return queryResults[0]
        }

        

    }


    async put(team:Team, options?:any): Promise<Team> {

        await team.save(options)
        return team

    }

    async getByUser(user:User, options?: any): Promise<Team[]> {

        let queryOptions = {
            where: {
                userId: user._id
            },
            order: [
                ['seasonRating.rating', 'desc']
            ]
        }

        return Team.findAll(Object.assign(queryOptions, options))
    }

    async getIds(options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                t._id FROM team as t 
        `, Object.assign(queryOptions, options))

        return queryResults.map( i => i._id)

    }

    async count(options?:any): Promise<number> {

        let queryOptions = Object.assign({}, options)

        let result = await Team.count(queryOptions)

        //@ts-ignore
        return result

    }

    async countByLeague(league:League, options?:any): Promise<number> {

        let query = {

            where: {
                leagueId: league._id
            },

            order: [
                ['seasonRating.rating', 'DESC']
            ]
        }

        let result = await Team.count(Object.assign(query, options))

        //@ts-ignore
        return result

    }

    async getMaxRanking(options?:any) : Promise<number> {

        let queryOptions = Object.assign({}, options)

        let result = await Team.max('ranking', queryOptions)

        //@ts-ignore
        return result

    }

    async list(limit: number, skip: number, options?:any): Promise<Team[]> {

        let query = {
            limit: limit,
            offset: skip,
            order: [
                ['seasonRating.rating', 'DESC']
            ]
        }

        return Team.findAll(Object.assign(query, options))

    }

    async listByLeagueAndSeason(league:League, season:Season, options?:any): Promise<Team[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                leagueId: league._id,
                seasonId: season._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT 
                t.*
            FROM team t 
            INNER JOIN team_league_season tls on tls.leagueId = :leagueId AND tls.seasonId = :seasonId and tls.teamId = t._id
            ORDER by t.seasonRating->>"$.rating" DESC
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async listBySeason(season:Season, options?:any): Promise<Team[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                seasonId: season._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT 
                t.*
            FROM team t 
            INNER JOIN team_league_season tls on tls.seasonId = :seasonId and tls.teamId = t._id
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    // async ghost(options?:any): Promise<Team> {

    //     let query = {
    //         where: {
    //             isGhost: true
    //         }
    //     }

    //     return Team.findOne(Object.assign(query, options))

    // }

    async getEligibleTeams(options?:any): Promise<Team[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: true,
            model:Team
        }

        const [queryResults, metadata] = await s.query(`
            select 
            t._id, 
            t.seasonRating, 
            JSON_EXTRACT(t.seasonRating, '$.seasonRating') AS sortRating 
            from team t
            where t.isGhost = 0 AND t.hasValidLineup = 1 AND t._id NOT IN (
                select 
                    JSON_UNQUOTE(JSON_EXTRACT(g.away, '$._id')) id
                FROM game g
                WHERE g.isComplete = 0
                Union
                select 
                    JSON_UNQUOTE(JSON_EXTRACT(g.home, '$._id')) id
                FROM game g
                WHERE g.isComplete = 0
            )
            ORDER BY sortRating DESC
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async getRatings(options?:any)  {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false
        }

        const [queryResults, metadata] = await s.query(`
            SELECT 
                t._id,
                t.longTermRating,
                t.seasonRating
            FROM team t
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => {
            return {
                _id: r._id,
                longTermRating: r.longTermRating,
                seasonRating: r.seasonRating
            }
        })

    }

    async addToLeagueSeason(team:Team, league:League, season:Season, options?:any){

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                teamId: team._id,
                leagueId: league._id,
                seasonId: season._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            INSERT INTO 'team_league_season' ('teamId', 'leagueId', 'seasonId', 'lastUpdated', 'dateCreated')
            VALUES
                (':teamId', ':leagueId', ':seasonId', NOW(), NOW())
        `, Object.assign(queryOptions, options))

    }

    async getUpdatedSince(lastUpdated:Date, options?: any) : Promise<Team[]> {

        let queryOptions = {
            where: { 
                lastUpdated: {
                    [Op.gte]: lastUpdated
                }
            },
            order: [
                ['lastUpdated', 'desc']
            ]
        }

        return Team.findAll(Object.assign(queryOptions, options))

    }

    async getOverallRecordsBySeason(season:Season, options?:any) : Promise<TeamRecord[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                seasonId: season._id
            }
        }


        const [queryResults, metadata] = await s.query(`
        WITH TeamStats AS (
            SELECT 
                t._id,
                g.leagueId,
                SUM(CASE WHEN g.winningTeamId = t._id AND g.isComplete = 1 THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN g.losingTeamId = t._id AND g.isComplete = 1 THEN 1 ELSE 0 END) AS losses
            FROM team t
            JOIN game g ON g.seasonId = :seasonId
            WHERE g.winningTeamId = t._id OR g.losingTeamId = t._id
            GROUP BY t._id, g.leagueId
        ),
        LeagueLeader AS (
            SELECT 
                leagueId,
                MAX(wins) AS maxWins,
                MIN(losses) AS minLosses
            FROM TeamStats
            GROUP BY leagueId
        )
        SELECT 
            ts._id,
            ts.leagueId,
            ts.wins,
            ts.losses,
            (ts.wins + ts.losses) AS games,
            CASE 
                WHEN (ts.wins + ts.losses) > 0 THEN (CAST(ts.wins AS FLOAT) / (ts.wins + ts.losses))
                ELSE 0
            END AS winPercent,
            RANK() OVER (
                PARTITION BY ts.leagueId
                ORDER BY 
                    CASE 
                        WHEN (ts.wins + ts.losses) > 0 THEN (CAST(ts.wins AS FLOAT) / (ts.wins + ts.losses))
                        ELSE 0
                    END DESC
            ) AS 'rank',
            ((ll.maxWins - ts.wins) + (ts.losses - ll.minLosses)) / 2.0 AS gamesBack
        FROM TeamStats ts
        JOIN LeagueLeader ll ON ts.leagueId = ll.leagueId
        ORDER BY ts.leagueId, winPercent DESC
        `, Object.assign(queryOptions, options))

        return queryResults.map( qr => {
            return {
                _id: qr._id,
                leagueId: qr.leagueId,
                overallRecord: {
                    wins: qr.wins,
                    losses: qr.losses,
                    winPercent: qr.winPercent,
                    rank: qr.rank,
                    gamesBack: qr.gamesBack
                }
            }
        })


    }

    async getOverallRecordBySeason(team:Team, season:Season, options?:any) : Promise<TeamRecord> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                seasonId: season._id,
                teamId: team._id
            }
        }


        const [queryResults, metadata] = await s.query(`
        WITH TeamStats AS (
            SELECT 
                t._id,
                g.leagueId,
                SUM(
                    CASE 
                        WHEN g.winningTeamId = t._id AND g.isComplete = 1 
                        THEN 1 
                        ELSE 0 
                    END
                ) AS wins,
                SUM(
                    CASE 
                        WHEN g.losingTeamId = t._id AND g.isComplete = 1 
                        THEN 1 
                        ELSE 0 
                    END
                ) AS losses
            FROM team t
            JOIN game g ON g.seasonId = :seasonId
            WHERE g.winningTeamId = t._id OR g.losingTeamId = t._id
            GROUP BY t._id, g.leagueId
        ),
        LeagueLeader AS (
            SELECT 
                leagueId,
                MAX(wins) AS maxWins,
                MIN(losses) AS minLosses
            FROM TeamStats
            GROUP BY leagueId
        ),
        Ranked AS (
            SELECT 
                ts._id,
                ts.leagueId,
                ts.wins,
                ts.losses,
                (ts.wins + ts.losses) AS games,
                CASE 
                    WHEN (ts.wins + ts.losses) > 0 
                        THEN (CAST(ts.wins AS FLOAT) / (ts.wins + ts.losses))
                    ELSE 0
                END AS winPercent,
                RANK() OVER (
                    PARTITION BY ts.leagueId
                    ORDER BY 
                        CASE 
                            WHEN (ts.wins + ts.losses) > 0 
                                THEN (CAST(ts.wins AS FLOAT) / (ts.wins + ts.losses))
                            ELSE 0
                        END DESC
                ) AS 'rank',
                ((ll.maxWins - ts.wins) + (ts.losses - ll.minLosses)) / 2.0 AS gamesBack
            FROM TeamStats ts
            JOIN LeagueLeader ll ON ts.leagueId = ll.leagueId
        )
        SELECT *
        FROM Ranked
        WHERE _id = :teamId
        ORDER BY leagueId, winPercent DESC
        `, Object.assign(queryOptions, options))

        let qr = queryResults[0]

        return {
            _id: qr._id,
            overallRecord: {
                wins: qr.wins,
                losses: qr.losses,
                winPercent: qr.winPercent,
                rank: qr.rank,
                gamesBehind: qr.gamesBack
            }
        }


    }

    async getTeamIdsBySeason(season:Season, options?:any) : Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                startDate: dayjs(season.startDate).format("YYYY-MM-DD"),
                endDate: dayjs(season.endDate).format("YYYY-MM-DD"),
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT DISTINCT t._id
            FROM team t
            INNER JOIN game_team gt ON gt.teamId = t._id
            INNER JOIN game g ON g._id = gt.gameId
            WHERE g.gameDate BETWEEN :startDate AND :endDate
        `, Object.assign(queryOptions, options))

        return queryResults.map( qr => qr._id)


    }

}

interface TeamRating {
    _id:string
    rating:Rating
}

interface TeamRecord {
    _id:string
    overallRecord:OverallRecord
}

export {
    TeamRepositoryNodeImpl, TeamRating, TeamRecord
}