import { inject, injectable } from "inversify"

import { Season } from "../../dto/season.js"
import { League } from "../../dto/league.js"
import { PlayerLeagueSeasonRepository } from "../player-league-season-repository.js"
import { PlayerLeagueSeason } from "../../dto/player-league-season.js"
import { Player } from "../../dto/player.js"
import { Team } from "../../dto/team.js"
import { Op, QueryTypes } from "sequelize"
import { HitterPitcher, PLAYER_STATS_SORT_EXPRESSION, Position } from "../../service/enums.js"








@injectable()
class PlayerLeagueSeasonRepositoryNodeImpl implements PlayerLeagueSeasonRepository {

    @inject("sequelize")
    private sequelize: Function

    async delete(pls:PlayerLeagueSeason, options?:any) {
        return pls.destroy(options)
    }

    async getById(_id: string, options?: any): Promise<PlayerLeagueSeason> {

        let queryOptions = {
            where: {
                _id: _id
            },
            include: [Season, Team, League, Player]
        }

        return PlayerLeagueSeason.findOne(Object.assign(queryOptions, options))
    }

    async getByIds(ids: string[], options?: any): Promise<PlayerLeagueSeason[]> {

        let queryOptions = {
            where: {
                _id: {
                    [Op.in]: ids
                }
            },
            include: [Season, Team, League, Player]
        }

        return PlayerLeagueSeason.findAll(Object.assign(queryOptions, options))
    }

    async get(player: Player, league: League, season: Season, options?: any): Promise<PlayerLeagueSeason[]> {

        let query: any = {

            where: {
                playerId: player._id,
                seasonId: season._id,
                leagueId: league._id
            },
            include: [Season, Team, League, Player]
        }

        return PlayerLeagueSeason.findAll(Object.assign(query, options))

    }

    async getIdByPlayerSeason(player: Player, season: Season, options?: any): Promise<string> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                playerId: player._id,
                seasonId: season._id
            }
        }

        const [idQueryResults, metadata] = await s.query(`
            SELECT 
                pls.*
            FROM player_league_season pls 
            WHERE
                pls.seasonId = :seasonId AND pls.playerId = :playerId
            ORDER BY pls.startDate DESC, pls.seasonIndex DESC
            LIMIT 1
        `, Object.assign(queryOptions, options))


        return idQueryResults.map(qr => qr._id)[0]

    }

    async getIdsByPlayersSeason(players: Player[], season: Season, options?: any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                playerIds: players.map(p => p._id),
                seasonId: season._id
            }
        }

        const [idQueryResults, metadata] = await s.query(`
            SELECT 
                pls._id
            FROM player_league_season pls 
            WHERE
                pls.seasonId = :seasonId AND pls.playerId IN (:playerIds)
            ORDER BY pls.startDate DESC, pls.seasonIndex DESC
        `, Object.assign(queryOptions, options))


        return idQueryResults.map(qr => qr._id)

    }

    async getIdsBySeason(season: Season, options?: any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                seasonId: season._id
            }
        }

        const [idQueryResults, metadata] = await s.query(`
            SELECT 
                pls._id
            FROM player_league_season pls 
            WHERE
                pls.seasonId = :seasonId
            ORDER BY pls.startDate DESC, pls.seasonIndex DESC
        `, Object.assign(queryOptions, options))


        return idQueryResults.map(qr => qr._id)

    }

    async getCurrentByTeam(team: Team, options?: any): Promise<PlayerLeagueSeason[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                teamId: team._id
            }
        }

        const [idQueryResults, metadata] = await s.query(`
            WITH ranked_seasons AS (
                SELECT pls._id, pls.playerId, pls.teamId, pls.seasonIndex, pls.startDate, pls.endDate,
                    ROW_NUMBER() OVER (PARTITION BY pls.playerId, pls.teamId ORDER BY pls.seasonIndex DESC, pls.startDate DESC) AS row_num
                FROM player_league_season pls
                WHERE pls.teamId = :teamId
                AND pls.startDate IS NOT NULL
                AND pls.startDate <= CURDATE()
                AND (pls.endDate >= CURDATE() OR pls.endDate IS NULL)
            )
            SELECT _id
            FROM ranked_seasons
            WHERE row_num = 1
            ORDER BY startDate DESC, seasonIndex DESC;
        `, Object.assign(queryOptions, options))


        return this.getByIds(idQueryResults.map(qr => qr._id), options)

    }

    async getMostRecentByTeam(team: Team, options?: any): Promise<PlayerLeagueSeason[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                teamId: team._id
            }
        }

        const [idQueryResults, metadata] = await s.query(`
            WITH ranked_seasons AS (
                SELECT pls._id, pls.playerId, pls.teamId, pls.seasonIndex, pls.startDate,
                    ROW_NUMBER() OVER (PARTITION BY pls.playerId, pls.teamId ORDER BY pls.seasonIndex DESC) AS row_num
                FROM player_league_season pls
                WHERE pls.teamId = :teamId
            )
            SELECT _id
            FROM ranked_seasons
            WHERE row_num = 1
            ORDER BY startDate DESC, seasonIndex DESC;

        `, Object.assign(queryOptions, options))


        return this.getByIds(idQueryResults.map(qr => qr._id), options)

    }

    async getMostRecentByTeamSeason(team: Team, season:Season, options?: any): Promise<PlayerLeagueSeason[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                teamId: team._id,
                seasonId: season._id
            }
        }

        const [idQueryResults, metadata] = await s.query(`
            SELECT pls._id
            FROM player_league_season pls
            JOIN (
                SELECT playerId, MAX(seasonIndex) AS maxSeasonIndex
                FROM player_league_season
                WHERE seasonId = :seasonId
                GROUP BY playerId
            ) latest
                ON latest.playerId = pls.playerId
            AND latest.maxSeasonIndex = pls.seasonIndex
            WHERE pls.seasonId = :seasonId
                AND pls.teamId = :teamId
            ORDER BY pls.startDate DESC, pls.seasonIndex DESC

        `, Object.assign(queryOptions, options))


        return this.getByIds(idQueryResults.map(qr => qr._id), options)

    }

    async getMostRecentByLeagueSeason(league: League, season:Season, options?: any): Promise<PlayerLeagueSeason[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                leagueId: league._id,
                seasonId: season._id
            },
            logging: console.log
        }

        const [idQueryResults, metadata] = await s.query(`
            WITH ranked_seasons AS (
                SELECT pls._id, pls.playerId, pls.leagueId, pls.seasonIndex, pls.startDate,
                    ROW_NUMBER() OVER (PARTITION BY pls.playerId ORDER BY pls.seasonIndex DESC) AS row_num
                FROM player_league_season pls
                WHERE pls.seasonId = :seasonId
                AND pls.leagueId = :leagueId
            )
            SELECT _id
            FROM ranked_seasons
            WHERE row_num = 1
            ORDER BY startDate DESC, seasonIndex DESC;
        `, Object.assign(queryOptions, options))


        return this.getByIds(idQueryResults.map(qr => qr._id), options)


    }

    async getMostRecentBySeason(season:Season, options?: any): Promise<PlayerLeagueSeason[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                seasonId: season._id
            }
        }

        const [maxSeasonIndexQueryResults, maxSeasonIndexMetadata] = await s.query(`
            SELECT playerId, MAX(seasonIndex) AS maxSeasonIndex
            FROM player_league_season
            WHERE seasonId = :seasonId
            GROUP BY playerId, seasonId
        `, Object.assign(queryOptions, options))


        const playerList = maxSeasonIndexQueryResults.map(qr => `('${qr.playerId}', '${qr.maxSeasonIndex}')`).join(", ")

        const [idQueryResults, metadata] = await s.query(`
            SELECT pls._id
            FROM player_league_season pls
            WHERE 
                pls.seasonId = :seasonId AND
                (pls.playerId, pls.seasonIndex) IN (
                    ${playerList}
                )
        `, Object.assign(queryOptions, options));
    

        return this.getByIds(idQueryResults.map(qr => qr._id), options)

    }

    async getMostRecentByPlayerSeason(player: Player, season:Season, options?: any): Promise<PlayerLeagueSeason> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                playerId: player._id,
                seasonId: season._id
            }
        }

        const [idQueryResults, metadata] = await s.query(`
            WITH ranked_seasons AS (
                SELECT pls._id, pls.playerId, pls.seasonIndex, pls.startDate,
                    ROW_NUMBER() OVER (PARTITION BY pls.playerId ORDER BY pls.seasonIndex DESC) AS row_num
                FROM player_league_season pls
                WHERE pls.seasonId = :seasonId
                AND pls.playerId = :playerId
            )
            SELECT _id
            FROM ranked_seasons
            WHERE row_num = 1
            ORDER BY startDate DESC, seasonIndex DESC
            LIMIT 1;
        `, Object.assign(queryOptions, options))


        return this.getById(idQueryResults[0]._id, options)

    }

    async getMostRecentByPlayersSeason( players: Player[], season: Season, options?: any ): Promise<PlayerLeagueSeason[]> {

        if (!players?.length) return []

        const s = await this.sequelize()

        const playerIds = players.map(p => p._id)

        let queryOptions = {
            type: QueryTypes.SELECT,
            plain: false,
            mapToModel: false,
            replacements: {
                seasonId: season._id,
                playerIds
            }
        }


        // Grab the most-recent PLS _id per player (for this season) in ONE query
        const idRows = await s.query(
            `
        WITH ranked_seasons AS (
        SELECT
            pls._id,
            pls.playerId,
            pls.seasonIndex,
            pls.startDate,
            ROW_NUMBER() OVER (
            PARTITION BY pls.playerId
            ORDER BY pls.seasonIndex DESC
            ) AS row_num
        FROM player_league_season pls
        WHERE pls.seasonId = :seasonId
            AND pls.playerId IN (:playerIds)
        )
        SELECT _id
        FROM ranked_seasons
        WHERE row_num = 1
        ORDER BY startDate DESC, seasonIndex DESC;
        `, Object.assign( queryOptions, options ) ) as { _id: string }[]

        if (!idRows?.length) return []

        return this.getByIds(idRows.map(r => r._id), options)
    }



    async getByPlayer(player: Player, options?: any): Promise<PlayerLeagueSeason[]> {

        let query = {

            where: {
                playerId: player._id
            },

            include: [Season, Team, League, Player],


            order: [['startDate', 'ASC'], ['seasonIndex', 'ASC']]
        }

        return PlayerLeagueSeason.findAll(Object.assign(query, options))

    }

    async getByLeagueSeason(league: League, season: Season, positions:Position[], sortColumn:string, sortDirection:string, options?: any): Promise<PlayerLeagueSeason[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: true,
            model: PlayerLeagueSeason,
            replacements: {
                limit: Math.max(0, Number(options.limit) | 0),
                offset: Math.max(0, Number(options.offset) | 0),
                leagueId: league._id,
                seasonId: season._id,
                positions: positions
            }
        }

        const DEFAULT_SORT = 'overallRating' 
        const expr = PLAYER_STATS_SORT_EXPRESSION[sortColumn] ?? PLAYER_STATS_SORT_EXPRESSION[DEFAULT_SORT]

        const safeDir = sortDirection === 'ASC' ? 'ASC' : 'DESC'
        let theQuery = `
            SELECT pls._id
            FROM player_league_season pls
            JOIN (
                SELECT playerId, MAX(seasonIndex) AS maxSeasonIndex
                FROM player_league_season
                WHERE seasonId = :seasonId
                GROUP BY playerId
            ) latest
            ON latest.playerId = pls.playerId
                AND latest.maxSeasonIndex = pls.seasonIndex
            JOIN player p
                ON p._id = pls.playerId
            WHERE pls.leagueId = :leagueId
            AND pls.seasonId = :seasonId
            AND pls.primaryPosition IN (:positions)
            AND pls.teamId IS NOT NULL
            ORDER BY ${expr} ${safeDir}
            LIMIT :limit OFFSET :offset


        `

        const [idQueryResults, metadata] = await s.query(theQuery, Object.assign(queryOptions, options))

        let idOptions = JSON.parse(JSON.stringify(options))
        delete idOptions.limit
        delete idOptions.offset

        let ids = idQueryResults.map(qr => qr._id)

        let pls = await this.getByIds(ids, idOptions)

        //Sort so it matches ids order
        pls.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })


        return pls


    }

    async getFreeAgentsByPosition(position:Position, season:Season, limit:number, offset:number , options?:any): Promise<PlayerLeagueSeason[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: true,
            model: PlayerLeagueSeason,
            replacements: {
                position: position.toString(),
                seasonId: season._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT 
                pls.*
            FROM player_league_season pls 
            INNER JOIN player p on pls.playerId = p._id
            WHERE pls.primaryPosition = :position AND pls.seasonId = :seasonId AND pls.teamId is null
			ORDER BY pls.startDate DESC, pls.seasonIndex DESC, p.overallRating DESC
            LIMIT ${limit} OFFSET ${offset}
        `, Object.assign(queryOptions, options))


        return queryResults

    }

    async getFreeAgentsBySeason(season:Season, positions:Position[], sortColumn:string, sortDirection:string, options?:any): Promise<PlayerLeagueSeason[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                limit: Math.max(0, Number(options.limit) | 0),
                offset: Math.max(0, Number(options.offset) | 0),
                seasonId: season._id,
                positions: positions
            }
        }

        const DEFAULT_SORT = 'overallRating' 
        const expr = PLAYER_STATS_SORT_EXPRESSION[sortColumn] ?? PLAYER_STATS_SORT_EXPRESSION[DEFAULT_SORT]

        const safeDir = sortDirection === 'ASC' ? 'ASC' : 'DESC'
        let theQuery = `
            SELECT pls._id
            FROM player_league_season pls
            JOIN (
                SELECT playerId, MAX(seasonIndex) AS maxSeasonIndex
                FROM player_league_season
                WHERE seasonId = :seasonId
                GROUP BY playerId
            ) latest
            ON latest.playerId = pls.playerId
            AND latest.maxSeasonIndex = pls.seasonIndex
            WHERE pls.seasonId = :seasonId
            AND pls.teamId IS NULL
            AND pls.primaryPosition IN (:positions)
            ORDER BY ${expr} ${safeDir}
            LIMIT :limit OFFSET :offset

        `

        const [idQueryResults, metadata] = await s.query(theQuery, Object.assign(queryOptions, options))

        let idOptions = JSON.parse(JSON.stringify(options))
        delete idOptions.limit
        delete idOptions.offset

        let ids = idQueryResults.map(qr => qr._id)

        let pls = await this.getByIds(ids, idOptions)

        //Sort so it matches ids order
        pls.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })


        return pls
    }

    async put(pls: PlayerLeagueSeason, options?: any): Promise<PlayerLeagueSeason> {

        await pls.save(options)
        return pls

    }

    async updateGameFields(plss: PlayerLeagueSeason[], options?: any) {

        let queryOptions = Object.assign({
            fields: ["_id", "playerId", "leagueId", "seasonId", "teamId", "stats", "startDate", "endDate", "overallRating",  "hittingRatings", "pitchRatings","potentialOverallRating",  "potentialPitchRatings", "potentialHittingRatings", "percentileRatings", "primaryPosition", "age", "seasonIndex"],
            updateOnDuplicate: ["_id", "playerId", "leagueId", "seasonId", "stats",  "teamId", "startDate", "endDate", "overallRating", "hittingRatings","potentialOverallRating",  "potentialPitchRatings", "potentialHittingRatings", "percentileRatings", "pitchRatings", "primaryPosition",  "age", "seasonIndex"],
        }, options)

        let updatePlayers = plss.map(p => {
            return {
                _id: p._id,
                playerId: p.playerId,
                leagueId: p.leagueId,
                seasonId: p.seasonId,
                teamId: p.teamId,
                stats: p.stats,
                startDate: p.startDate,
                endDate: p.endDate,
                overallRating: p.overallRating,
                hittingRatings: p.hittingRatings,
                pitchRatings: p.pitchRatings,
                potentialOverallRating: p.potentialOverallRating,
                potentialPitchRatings: p.potentialPitchRatings,
                potentialHittingRatings: p.potentialHittingRatings,

                percentileRatings: p.percentileRatings,

                primaryPosition: p.primaryPosition,
                age: p.age,
                seasonIndex: p.seasonIndex
            }
        })


        await PlayerLeagueSeason.bulkCreate(updatePlayers, queryOptions)
    }

}


export {
    PlayerLeagueSeasonRepositoryNodeImpl
}