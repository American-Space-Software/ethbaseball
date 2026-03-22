import {  inject, injectable } from "inversify"

import { Game } from "../../dto/game.js"
import { GameRepository } from "../game-repository.js"
import dayjs from "dayjs"
import { Team } from "../../dto/team.js"
import { Season } from "../../dto/season.js"
import { League } from "../../dto/league.js"
import { Player } from "../../dto/player.js"
import { Op } from "sequelize"
import { OverallRecord } from "../../service/enums.js"



@injectable()
class GameRepositoryNodeImpl implements GameRepository {


    @inject("sequelize")
    private sequelize:Function


    async getIdsNoSummary(options?: any) : Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                limit: options?.limit || 25,
                offset: options?.offset || 0
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                g._id
            from game g 
            WHERE 
                g.summary is null
            ORDER BY g.lastUpdated DESC
            LIMIT :limit OFFSET :offset
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getIdsUpdatedSince(lastUpdated:Date, options?: any) : Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                lastUpdated: lastUpdated
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                g._id
            from game g 
            WHERE 
                g.lastUpdated > :lastUpdated
            ORDER BY g.lastUpdated DESC
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getLastUpdate(options?:any) : Promise<Date> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false
        }

        const [queryResults, metadata] = await s.query(`
            select g.currentSimDate
            FROM game g
            order by g.currentSimDate DESC LIMIT 1

        `, Object.assign(queryOptions, options))

        if (queryResults.length > 0) {
            return queryResults[0].currentSimDate
        }

        return undefined

    }

    async getRecentScheduledDate(options?:any) : Promise<Date> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false
        }

        const [queryResults, metadata] = await s.query(`
            select g.startdate
            FROM game g
            order by g.startdate DESC LIMIT 1

        `, Object.assign(queryOptions, options))

        if (queryResults.length > 0) {
            return queryResults[0].startdate
        }

        return undefined

    }

    async getInProgressIds(options?:any) : Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false
        }

        const [queryResults, metadata] = await s.query(`
            select g._id
            FROM game g
            WHERE g.isComplete = 0 AND g.isStarted = 1
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getInProgressIdsByDate(date:Date, options?:any) : Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                theDate: dayjs(date).format("YYYY-MM-DD")
            }
        }

        const [queryResults, metadata] = await s.query(`
            select g._id
            FROM game g
            WHERE DATE(g.startDate) = :theDate AND g.isStarted = 1
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getInProgressIdsByTeam(team:Team, options?:any) : Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                teamId: team._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            select g._id
            from game g 
            INNER JOIN game_team gt on gt.gameId = g._id
            WHERE 
                gt.teamId = :teamId AND
                g.isComplete = 0 AND g.isStarted = 1
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getReadyForIncrementIds(options?:any) : Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false
        }

        const [queryResults, metadata] = await s.query(`
            select g._id
            FROM game g
            WHERE g.isComplete = 0 AND g.startDate < NOW()
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getIdsByTeam(team:Team, limit:number, offset:number, options?:any) {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                teamId: team._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                g._id
            from game g 
            INNER JOIN game_team gt on gt.gameId = g._id
            WHERE 
                gt.teamId = :teamId
            ORDER BY gt.updatedAt DESC
            ${limit ? `LIMIT ${limit}` : ''}
            ${offset ? `OFFSET ${offset}` : ''}
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getRecentIdsByTeam(team:Team, limit:number, offset:number, options?:any) {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                teamId: team._id,
                theDate: dayjs().format("YYYY-MM-DD")
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                g._id
            from game g 
            INNER JOIN game_team gt on gt.gameId = g._id
            WHERE 
                gt.teamId = :teamId AND
                DATE(g.startDate) <= :theDate
            ORDER BY g.startDate DESC
            ${limit ? `LIMIT ${limit}` : ''}
            ${offset ? `OFFSET ${offset}` : ''}
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getUpcomingIdsByTeam(team:Team, limit:number, offset:number, options?:any) {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                teamId: team._id,
                theDate: dayjs().format("YYYY-MM-DD")
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                g._id
            from game g 
            INNER JOIN game_team gt on gt.gameId = g._id
            WHERE 
                gt.teamId = :teamId AND
                DATE(g.startDate) >= :theDate
            ORDER BY g.startDate ASC
            ${limit ? `LIMIT ${limit}` : ''}
            ${offset ? `OFFSET ${offset}` : ''}
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getIdsByTeamAndPeriod(team:Team, start:Date, end:Date, options?:any) {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                teamId: team._id,
                start: dayjs(start).format("YYYY-MM-DD"),
                end: dayjs(end).format("YYYY-MM-DD")
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                g._id
            from game g 
            INNER JOIN game_team gt on gt.gameId = g._id
            WHERE 
                gt.teamId = :teamId AND
                g.gameDate >= :start && g.gameDate <= :end
            ORDER BY g.gameDate, g.currentSimDate ASC
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getIdsByTeamAndSeason(team:Team, season:Season, options?:any) {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                teamId: team._id,
                start: dayjs(season.startDate).format("YYYY-MM-DD"),
                end: dayjs(season.endDate).format("YYYY-MM-DD")
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                g._id
            from game g 
            INNER JOIN game_team gt on gt.gameId = g._id
            WHERE 
                gt.teamId = :teamId AND
                g.startDate >= :start && g.startDate <= :end
            ORDER BY g.startDate ASC
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getByDateIds(date:Date, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                theDate: dayjs(date).format("YYYY-MM-DD"),
            }
        }

        const [queryResults, metadata] = await s.query(`
            select g._id
            FROM game g
            WHERE DATE(g.gameDate) = :theDate
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)


    }

    async getByDateAndLeagueIds(date:Date, league:League, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                theDate: dayjs(date).format("YYYY-MM-DD"),
                leagueId: league._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            select g._id
            FROM game g
            WHERE g.gameDate = :theDate AND g.leagueId = :leagueId
            order by g.startDate ASC
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)


    }

    async getByLeagueIds(league:League, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                leagueId: league._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            select g._id
            FROM game g
            WHERE g.leagueId = :leagueId
            order by g.dateCreated DESC
            ${options?.limit ? `LIMIT ${options.limit} `: ''}
            ${options?.offset ? `OFFSET ${options.offset} `: ''}            
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)


    }


    async getByDateAndTeamIds(date:Date, teams:Team[], options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                theDate: dayjs(date).format("YYYY-MM-DD"),
                teamIds: teams.map( t => t._id)
            }
        }

        const [queryResults, metadata] = await s.query(`

            select g._id
            FROM game g
			INNER JOIN game_team gt on gt.gameId = g._id
            WHERE g.gameDate = :theDate and gt.teamId in (:teamIds)
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)


    }

    async getByDatesAndTeamIds(dates:Date[], teams:Team[], options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                theDates: dates.map( d => dayjs(d).format("YYYY-MM-DD")) ,
                teamIds: teams.map( t => t._id)
            }
        }

        const [queryResults, metadata] = await s.query(`
            select g._id
            FROM game g
			INNER JOIN game_team gt on gt.gameId = g._id
            WHERE g.gameDate in (:theDates) and gt.teamId in (:teamIds)
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)

    }

    async getUnfinishedByDateIds(date:Date, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                theDate: dayjs(date).format("YYYY-MM-DD"),
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                g._id
            FROM game g
            WHERE g.gameDate = :theDate && g.isFinished = 0
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)


    }

    async getUnfinishedByDateAndLeagueIds(date:Date, league:League, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                theDate: dayjs(date).format("YYYY-MM-DD"),
                leagueId: league._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                g._id
            FROM game g
            WHERE g.gameDate = :theDate AND g.isFinished = 0 AND g.leagueId = :leagueId
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)


    }

    async getUnfinishedByLeagueIds(league:League, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                leagueId: league._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                g._id
            FROM game g
            WHERE g.isFinished = 0 AND g.leagueId = :leagueId
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)


    }

    async getResultsByDate(date:Date, options?:any): Promise<{ winningTeamId:string, losingTeamId:string }[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                theDate: dayjs(date).format("YYYY-MM-DD"),
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                g.winningTeamId,
                g.losingTeamId
            FROM game g
            WHERE g.gameDate = :theDate && g.isFinished = 1
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults


    }

    async getPreviousDatesWithUnfinishedGames(date:Date, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                theDate: dayjs(date).format("YYYY-MM-DD"),
            }
        }

        const [queryResults, metadata] = await s.query(`
            select 
                DISTINCT date(date_format(g.startDate, '%Y-%m-%d')) as uniqueDate
            FROM game g
            WHERE DATE(g.startDate) < :theDate && g.isFinished = 0
            order by uniqueDate ASC

        `, Object.assign(queryOptions, options))


        return queryResults?.map(r => r.uniqueDate)

    }

    async getCompleteAndUnfinishedByDateIds(date:Date, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                theDate: dayjs(date).format("YYYY-MM-DD"),
            }
        }

        const [queryResults, metadata] = await s.query(`
            select g._id
            FROM game g
            WHERE DATE(g.startDate) = :theDate && g.isComplete = 1 && g.isFinished = 0
            order by g.startDate ASC

        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => r._id)


    }

    async getByIds(ids: string[], options?: any): Promise<Game[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.SELECT,
            mapToModel: true,
            model: Game,
            replacements: {
                ids: ids
            }
        }

        const queryResults = await s.query(`
            select g.*
            FROM game g
            WHERE g._id IN (:ids)
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async get(id:string, options?:any): Promise<Game> {
        return Game.findByPk(id, options)
    }

    async put(game:Game, options?:any): Promise<Game> {

        await game.save(options)
        return game

    }

    async getOverallRecordsByLeagueAndSeason(league:League, season:Season, options?:any) : Promise<OverallRecord> {

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
            select 
                COUNT(g.winningTeamId) as wins,
                COUNT(g.losingTeamId) as losses,
                gt.teamId as teamId
            FROM game g
            INNER JOIN game_team gt on gt.gameId = g._id
            WHERE g.isComplete = 1 AND g.seasonId = :seasonId AND g.leagueId = :leagueId
            GROUP BY gt.teamId
            
        `, Object.assign(queryOptions, options))

        return queryResults?.map(r => parseInt(r._id))


    }

    async updateGameRatings(games:Game[], options?:any) {

        let queryOptions = Object.assign({ 
            fields: ["_id", "home", "away", "playIndex", "seasonId", "leagueId", "stadiumId"], 
            updateOnDuplicate: ["_id", "home", "away"],
        }, options)

        let updateGames = games.map( g => {
            return {
                _id: g._id,
                home: g.home,
                away: g.away,
                playIndex: g.playIndex,
                seasonId: g.seasonId,
                leagueId: g.leagueId,
                stadiumId: g.stadiumId
            }
        })

        await Game.bulkCreate(updateGames, queryOptions)
    }

    async getGameCountsByTeamSeason(team:Team, season:Season, date:Date, options?:any) {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                teamId: team._id,
                start: dayjs(season.startDate).format("YYYY-MM-DD"),
                end: dayjs(season.endDate).format("YYYY-MM-DD"),
                currentDate: dayjs(date).format("YYYY-MM-DD")
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT
            COALESCE(SUM(g.gameDate <= :currentDate), 0) AS totalGamesPlayed,
            COALESCE(SUM(g.gameDate >  :currentDate), 0) AS totalGamesRemaining,
            COALESCE(SUM(g.gameDate <= :currentDate
                AND JSON_UNQUOTE(JSON_EXTRACT(g.home, '$._id')) = CAST(:teamId AS CHAR)), 0) AS homeGamesPlayed,
            COALESCE(SUM(g.gameDate >  :currentDate
                AND JSON_UNQUOTE(JSON_EXTRACT(g.home, '$._id')) = CAST(:teamId AS CHAR)), 0) AS homeGamesRemaining
            FROM game g
            JOIN game_team gt ON gt.gameId = g._id
            WHERE
            gt.teamId = :teamId
            -- If you filter the season by date, prefer gameDate to avoid DATETIME vs DATE mismatches:
            AND g.gameDate >= :start
            AND g.gameDate <= :end;


        `, Object.assign(queryOptions, options))

        return {
            homeGamesPlayed: parseInt(queryResults[0].homeGamesPlayed),
            homeGamesRemaining: parseInt(queryResults[0].homeGamesRemaining),
            totalGamesPlayed: parseInt(queryResults[0].totalGamesPlayed),
            totalGamesRemaining: parseInt(queryResults[0].totalGamesRemaining),
        }



    }

    async getPlayerWPAByDate(player:Player, option?:any) {

        
        

    }

}

interface GameAverages {
    averageTotalRuns:number
    averageInnings:number
}


export {
    GameRepositoryNodeImpl, GameAverages
}






    // async getGlobalHitResult(options?:any) : Promise<HitResult> {
        
    //     let s = await this.sequelize()

    //     let queryOptions = {
    //         type: s.QueryTypes.RAW,
    //         plain: true,
    //         mapToModel: false
    //     }

    //     const [queryResults, metadata] = await s.query(`
    //         select 
    //             COUNT(g._id) games,
    //             COUNT(DISTINCT g._id) uniqueGames,
    //             SUM(p.hitResult->>'$.teamWins') AS teamWins,
    //             SUM(p.hitResult->>'$.teamLosses') AS teamLosses,
    //             SUM(p.hitResult->>'$.pa') AS pa,
    //             SUM(p.hitResult->>'$.atBats') AS atBats,
    //             SUM(p.hitResult->>'$.hits') AS hits,
    //             SUM(p.hitResult->>'$.singles') AS singles,
    //             SUM(p.hitResult->>'$.doubles') AS doubles,
    //             SUM(p.hitResult->>'$.triples') AS triples,
    //             SUM(p.hitResult->>'$.homeRuns') AS homeRuns,

    //             SUM(p.hitResult->>'$.runs') AS runs,
    //             SUM(p.hitResult->>'$.rbi') AS rbi,
    //             SUM(p.hitResult->>'$.bb') AS bb,
    //             SUM(p.hitResult->>'$.sb') AS sb,
    //             SUM(p.hitResult->>'$.sbAttempts') AS sbAttempts,
    //             SUM(p.hitResult->>'$.cs') AS cs,
    //             SUM(p.hitResult->>'$.hbp') AS hbp,
    //             SUM(p.hitResult->>'$.so') AS so,
    //             SUM(p.hitResult->>'$.lob') AS lob,
    //             SUM(p.hitResult->>'$.sacBunts') AS sacBunts,
    //             SUM(p.hitResult->>'$.sacFlys') AS sacFlys,
    //             SUM(p.hitResult->>'$.groundOuts') AS groundOuts,
    //             SUM(p.hitResult->>'$.flyOuts') AS flyOuts,
    //             SUM(p.hitResult->>'$.lineOuts') AS lineOuts,
    //             SUM(p.hitResult->>'$.outs') AS outs,
    //             SUM(p.hitResult->>'$.groundBalls') AS groundBalls,
    //             SUM(p.hitResult->>'$.lineDrives') AS lineDrives,
    //             SUM(p.hitResult->>'$.flyBalls') AS flyBalls,
    //             SUM(p.hitResult->>'$.gidp') AS gidp,
    //             SUM(p.hitResult->>'$.po') AS po,
    //             SUM(p.hitResult->>'$.assists') AS assists,
    //             SUM(p.hitResult->>'$.outfieldAssists') AS outfieldAssists,
    //             SUM(p.hitResult->>'$.e') AS e,
    //             SUM(p.hitResult->>'$.passedBalls') AS passedBalls,
    //             SUM(p.hitResult->>'$.csDefense') AS csDefense,
    //             SUM(p.hitResult->>'$.doublePlays') AS doublePlays,
    //             SUM(p.hitResult->>'$.wpa') AS wpa,
    //             SUM(p.hitResult->>'$.experience') AS experience,
    //             SUM(p.hitResult->>'$.pitches') AS pitches,
    //             SUM(p.hitResult->>'$.balls') AS balls,
    //             SUM(p.hitResult->>'$.strikes') AS strikes,
    //             SUM(p.hitResult->>'$.fouls') AS fouls,
    //             SUM(p.hitResult->>'$.swings') AS swings,
    //             SUM(p.hitResult->>'$.swingAtBalls') AS swingAtBalls,
    //             SUM(p.hitResult->>'$.swingAtStrikes') AS swingAtStrikes,
    //             SUM(p.hitResult->>'$.inZoneContact') AS inZoneContact,
    //             SUM(p.hitResult->>'$.outZoneContact') AS outZoneContact,
    //             SUM(p.hitResult->>'$.inZone') AS inZone,
    //             SUM(p.hitResult->>'$.ballsInPlay') AS ballsInPlay,
    //             SUM( p.hitResult->>'$.totalPitchQuality') AS totalPitchQuality,
    //             SUM(p.hitResult->>'$.totalPitchPowerQuality') AS totalPitchPowerQuality,
    //             SUM(p.hitResult->>'$.totalPitchLocationQuality') AS totalPitchLocationQuality,
    //             SUM(p.hitResult->>'$.totalPitchMovementQuality') AS totalPitchMovementQuality   
    //         FROM game g, 
            
    //             json_table(
    //                 json_merge_preserve(JSON_EXTRACT(g.home, '$.players'), JSON_EXTRACT(g.away, '$.players')), 
    //                 "$[*]" COLUMNS( 
    //                     _id VARCHAR(100) PATH "$._id",
    //                     hitResult JSON PATH "$.hitResult"
    //                 )
    //             ) p
            
                
    //         WHERE g.isComplete = 1
            
    //     `, Object.assign(queryOptions, options))

    //     return queryResults[0]

    // }

    // async getGlobalPitchResult(options?:any) : Promise<PitchResult> {
        
    //     let s = await this.sequelize()

    //     let queryOptions = {
    //         type: s.QueryTypes.RAW,
    //         plain: true,
    //         mapToModel: false
    //     }

    //     const [queryResults, metadata] = await s.query(`
    //         select 
	// 			COUNT(g._id) games,
    //             COUNT(DISTINCT g._id) uniqueGames,
    //             SUM(p.pitchResult->>'$.teamWins') AS teamWins,
    //             SUM(p.pitchResult->>'$.teamLosses') AS teamLosses,
                
    //             SUM(p.pitchResult->>'$.starts') AS starts,
    //             SUM(p.pitchResult->>'$.wins') AS wins,
    //             SUM(p.pitchResult->>'$.losses') AS losses,
    //             SUM(p.pitchResult->>'$.saves') AS saves,
    //             SUM(p.pitchResult->>'$.bs') AS bs,
                
    //             SUM(p.pitchResult->>'$.outs') AS outs,
    //             SUM(p.pitchResult->>'$.er') AS er,
    //             SUM(p.pitchResult->>'$.so') AS so,
    //             SUM(p.pitchResult->>'$.hits') AS hits,
    //             SUM(p.pitchResult->>'$.bb') AS bb,
    //             SUM(p.pitchResult->>'$.sho') AS sho,
    //             SUM(p.pitchResult->>'$.cg') AS cg,
    //             SUM(p.pitchResult->>'$.hbp') AS hbp,
                
    //             SUM(p.pitchResult->>'$.singles') AS singles,
    //             SUM(p.pitchResult->>'$.doubles') AS doubles,
    //             SUM(p.pitchResult->>'$.triples') AS triples,
    //             SUM(p.pitchResult->>'$.battersFaced') AS battersFaced,
    //             SUM(p.pitchResult->>'$.atBats') AS atBats,
    //             SUM(p.pitchResult->>'$.runs') AS runs,
    //             SUM(p.pitchResult->>'$.homeRuns') AS homeRuns,
                
    //             SUM(p.pitchResult->>'$.groundOuts') AS groundOuts,
    //             SUM(p.pitchResult->>'$.flyOuts') AS flyOuts,
    //             SUM(p.pitchResult->>'$.lineOuts') AS lineOuts,
	// 			SUM(p.pitchResult->>'$.groundBalls') AS groundBalls,
    //             SUM(p.pitchResult->>'$.lineDrives') AS lineDrives,
    //             SUM(p.pitchResult->>'$.flyBalls') AS flyBalls,
                
    //             SUM(p.pitchResult->>'$.wpa') AS wpa,
    //             SUM(p.pitchResult->>'$.experience') AS experience,
                
    //             SUM(p.pitchResult->>'$.pitches') AS pitches,
    //             SUM(p.pitchResult->>'$.balls') AS balls,
    //             SUM(p.pitchResult->>'$.strikes') AS strikes,
    //             SUM(p.pitchResult->>'$.fouls') AS fouls,
    //             SUM(p.pitchResult->>'$.wildPitches') AS wildPitches,
                
	// 			SUM(p.pitchResult->>'$.swings') AS swings,
    //             SUM(p.pitchResult->>'$.swingAtBalls') AS swingAtBalls,
    //             SUM(p.pitchResult->>'$.swingAtStrikes') AS swingAtStrikes,
	// 			SUM(p.pitchResult->>'$.inZoneContact') AS inZoneContact,
    //             SUM(p.pitchResult->>'$.outZoneContact') AS outZoneContact,
    //             SUM(p.pitchResult->>'$.ballsInPlay') AS ballsInPlay,
                
    //             SUM(p.pitchResult->>'$.inZone') AS inZone,
	// 			SUM(p.pitchResult->>'$.ip') AS ip,
    //             SUM(p.pitchResult->>'$.sacFlys') AS sacFlys,

	// 			SUM( p.pitchResult->>'$.totalPitchQuality') AS totalPitchQuality,
    //             SUM(p.pitchResult->>'$.totalPitchPowerQuality') AS totalPitchPowerQuality,
	// 			SUM(p.pitchResult->>'$.totalPitchLocationQuality') AS totalPitchLocationQuality,
    //             SUM(p.pitchResult->>'$.totalPitchMovementQuality') AS totalPitchMovementQuality
                
    //         FROM game g, 
            
    //             json_table(
    //                 json_merge_preserve(JSON_EXTRACT(g.home, '$.players'), JSON_EXTRACT(g.away, '$.players')), 
    //                 "$[*]" COLUMNS( 
	// 					_id VARCHAR(100) PATH "$._id",
    //                     pitchResult JSON PATH "$.pitchResult"
	// 				)
    //             ) p
            
                
    //         WHERE g.isComplete = 1
            
    //     `, Object.assign(queryOptions, options))

    //     return queryResults[0]

    // }

    // async getAverageHitterChange(options?:any) : Promise<HitterChange> {

    //     let s = await this.sequelize()

    //     let queryOptions = {
    //         type: s.QueryTypes.RAW,
    //         plain: true,
    //         mapToModel: false
    //     }

    //     const [queryResults, metadata] = await s.query(`
    //         select 
    //         AVG(p.hitterChangeVsL->>'$.armChange') AS vsLArmChange,
    //         AVG(p.hitterChangeVsL->>'$.plateDisiplineChange') AS vsLPlateDisiplineChange,
    //         AVG(p.hitterChangeVsL->>'$.contactChange') AS vsLContactChange,
    //         AVG(p.hitterChangeVsL->>'$.gapPowerChange') AS vsLGapPowerChange,
    //         AVG(p.hitterChangeVsL->>'$.hrPowerChange') AS vsLHrPowerChange,
    //         AVG(p.hitterChangeVsL->>'$.speedChange') AS vsLSpeedChange,
    //         AVG(p.hitterChangeVsL->>'$.stealsChange') AS vsLStealsChange,
    //         AVG(p.hitterChangeVsL->>'$.defenseChange') AS vsLDefenseChange,

    //         AVG(p.hitterChangeVsR->>'$.armChange') AS vsRArmChange,
    //         AVG(p.hitterChangeVsR->>'$.plateDisiplineChange') AS vsRPlateDisiplineChange,
    //         AVG(p.hitterChangeVsR->>'$.contactChange') AS vsRContactChange,
    //         AVG(p.hitterChangeVsR->>'$.gapPowerChange') AS vsRGapPowerChange,
    //         AVG(p.hitterChangeVsR->>'$.hrPowerChange') AS vsRHrPowerChange,
    //         AVG(p.hitterChangeVsR->>'$.speedChange') AS vsRSpeedChange,
    //         AVG(p.hitterChangeVsR->>'$.stealsChange') AS vsRStealsChange,
    //         AVG(p.hitterChangeVsR->>'$.defenseChange') AS vsRDefenseChange


    //         FROM game g, 
            
    //             json_table(
    //                 json_merge_preserve(JSON_EXTRACT(g.home, '$.players'), JSON_EXTRACT(g.away, '$.players')), 
    //                 "$[*]" COLUMNS( 
    //                     _id VARCHAR(100) PATH "$._id",
    //                     currentPosition VARCHAR(100) PATH "$.currentPosition",
    //                     hitterChangeVsL JSON PATH "$.hitterChange.vsL",
    //                     hitterChangeVsR JSON PATH "$.hitterChange.vsR"
    //                 )
    //             ) p
            
                
    //         WHERE g.isComplete = 1 AND p.currentPosition != "P"
            
    //     `, Object.assign(queryOptions, options))

    //     return queryResults[0]

    // }

    // async getAveragePitcherChange(options?:any) : Promise<PitcherChange> {

    //     let s = await this.sequelize()

    //     let queryOptions = {
    //         type: s.QueryTypes.RAW,
    //         plain: true,
    //         mapToModel: false
    //     }

    //     const [queryResults, metadata] = await s.query(`
    //         select 
    //         AVG(p.pitcherChangeVsL->>'$.powerChange') AS vsLPowerChange,
    //         AVG(p.pitcherChangeVsL->>'$.controlChange') AS vsLControlChange,
    //         AVG(p.pitcherChangeVsL->>'$.movementChange') AS vsLMovementChange,

    //         AVG(p.pitcherChangeVsR->>'$.powerChange') AS vsRPowerChange,
    //         AVG(p.pitcherChangeVsR->>'$.controlChange') AS vsRControlChange,
    //         AVG(p.pitcherChangeVsR->>'$.movementChange') AS vsRMovementChange

    //         FROM game g, 
            
    //             json_table(
    //                 json_merge_preserve(JSON_EXTRACT(g.home, '$.players'), JSON_EXTRACT(g.away, '$.players')), 
    //                 "$[*]" COLUMNS( 
    //                     _id VARCHAR(100) PATH "$._id",
    //                     currentPosition VARCHAR(100) PATH "$.currentPosition",
    //                     pitcherChangeVsL JSON PATH "$.pitcherChange.vsL",
    //                     pitcherChangeVsR JSON PATH "$.pitcherChange.vsR"
    //                 )
    //             ) p
            
                
    //         WHERE g.isComplete = 1 AND p.currentPosition = "P"
            
    //     `, Object.assign(queryOptions, options))

    //     return queryResults[0]

    // }

    // async getHitResultByPlayerOnOrBeforeDate(player:Player, date:Date, options?:any) : Promise<HitResultGame[]> {

    //     let s = await this.sequelize()

    //     let queryOptions = {
    //         type: s.QueryTypes.RAW,
    //         plain: true,
    //         mapToModel: false,
    //         replacements: {
    //             playerId: player._id,
    //             theDate: date
    //         }
    //     }

    //     const [queryResults, metadata] = await s.query(`
    //         WITH filtered_games AS (
    //             SELECT 
    //                 g._id AS gameId,
    //                 g.startDate,
    //                 g.home,
    //                 g.away
    //             FROM game g
    //             INNER JOIN game_player gp ON gp.gameId = g._id
    //             WHERE g.isComplete = 1 
    //             AND gp.playerId = :playerId
    //         ),
    //         home_players AS (
    //             SELECT 
    //                 fg.gameId,
    //                 fg.startDate,
    //                 jt.playerId,
    //                 jt.hitResult,
    //                 jt.seasonStats
    //             FROM filtered_games fg
    //             JOIN JSON_TABLE(
    //                 JSON_EXTRACT(fg.home, '$.players'), 
    //                 "$[*]" COLUMNS(
    //                     playerId VARCHAR(100) PATH "$._id",
    //                     hitResult JSON PATH "$.hitResult",
    //                     seasonStats JSON PATH "$.seasonStats.after"
    //                 )
    //             ) jt ON jt.playerId = :playerId
    //         ),
    //         away_players AS (
    //             SELECT 
    //                 fg.gameId,
    //                 fg.startDate,
    //                 jt.playerId,
    //                 jt.hitResult,
    //                 jt.seasonStats
    //             FROM filtered_games fg
    //             JOIN JSON_TABLE(
    //                 JSON_EXTRACT(fg.away, '$.players'), 
    //                 "$[*]" COLUMNS(
    //                     playerId VARCHAR(100) PATH "$._id",
    //                     hitResult JSON PATH "$.hitResult",
    //                     seasonStats JSON PATH "$.seasonStats.after"
    //                 )
    //             ) jt ON jt.playerId = :playerId
    //         )
    //         SELECT gameId, startDate, playerId, hitResult, seasonStats
    //         FROM (
    //             SELECT * FROM home_players
    //             UNION ALL
    //             SELECT * FROM away_players
    //         ) AS combined_players
    //         ORDER BY startDate DESC
    //         LIMIT ${options.limit}
    //     `, Object.assign(queryOptions, options))

    //     return queryResults

    // }

    // async getPitchResultByPlayerOnOrBeforeDate(player:Player, date:Date, options?:any) : Promise<PitchResultGame[]> {

    //     let s = await this.sequelize()

    //     let queryOptions = {
    //         type: s.QueryTypes.RAW,
    //         plain: true,
    //         mapToModel: false,
    //         replacements: {
    //             playerId: player._id,
    //             theDate: date
    //         }
    //     }

    //     const [queryResults, metadata] = await s.query(`
    //         WITH filtered_games AS (
    //             SELECT 
    //                 g._id AS gameId,
    //                 g.startDate,
    //                 g.home,
    //                 g.away
    //             FROM game g
    //             INNER JOIN game_player gp ON gp.gameId = g._id
    //             WHERE g.isComplete = 1 
    //             AND gp.playerId = :playerId
    //         ),
    //         home_players AS (
    //             SELECT 
    //                 fg.gameId,
    //                 fg.startDate,
    //                 jt.playerId,
    //                 jt.pitchResult,
    //                 jt.seasonStats
    //             FROM filtered_games fg
    //             JOIN JSON_TABLE(
    //                 JSON_EXTRACT(fg.home, '$.players'), 
    //                 "$[*]" COLUMNS(
    //                     playerId VARCHAR(100) PATH "$._id",
    //                     pitchResult JSON PATH "$.pitchResult",
    //                     seasonStats JSON PATH "$.seasonStats.after"
    //                 )
    //             ) jt ON jt.playerId = :playerId
    //         ),
    //         away_players AS (
    //             SELECT 
    //                 fg.gameId,
    //                 fg.startDate,
    //                 jt.playerId,
    //                 jt.pitchResult,
    //                 jt.seasonStats
    //             FROM filtered_games fg
    //             JOIN JSON_TABLE(
    //                 JSON_EXTRACT(fg.away, '$.players'), 
    //                 "$[*]" COLUMNS(
    //                     playerId VARCHAR(100) PATH "$._id",
    //                     pitchResult JSON PATH "$.pitchResult",
    //                     seasonStats JSON PATH "$.seasonStats.after"
    //                 )
    //             ) jt ON jt.playerId = :playerId
    //         )
    //         SELECT gameId, startDate, playerId, pitchResult, seasonStats
    //         FROM (
    //             SELECT * FROM home_players
    //             UNION ALL
    //             SELECT * FROM away_players
    //         ) AS combined_players
    //         ORDER BY startDate DESC
    //         LIMIT ${options.limit}
            
    //     `, Object.assign(queryOptions, options))

    //     return queryResults

    // }