import {  inject, injectable } from "inversify"

import { GamePitchResultRepository } from "../game-pitch-result-repository.js"
import { GamePitchResult, PitchResult } from "../../dto/game-pitch-result.js"
import { Player } from "../../dto/player.js"
import dayjs from "dayjs"
import { Game } from "../../dto/game.js"
import { Season } from "../../dto/season.js"

const SUM_QUERY_FIELDS = `
    SUM(atBats) atBats,
    SUM(hits) hits,
    SUM(battersFaced) battersFaced,
    SUM(bb) bb,
    SUM(bs) bs,
    SUM(cg) cg,
    SUM(doubles) doubles,
    SUM(er) er,

    SUM(flyBalls) flyBalls,
    SUM(flyOuts) flyOuts,

    SUM(groundBalls) groundBalls,
    SUM(groundOuts) groundOuts,
    SUM(hbp) hbp,
    SUM(hits) hits,
    SUM(homeRuns) homeRuns,
    SUM(lineDrives) lineDrives,
    SUM(lineOuts) lineOuts,

    SUM(losses) losses,
    SUM(outs) outs,

    SUM(runs) runs,
    SUM(saves) saves,
    SUM(sho) sho,

    SUM(singles) singles,
    SUM(so) so,
    SUM(starts) starts,

    SUM(triples) triples,
    SUM(wins) wins,
    SUM(wpa) wpa,

    SUM(balls) balls,
    SUM(strikes) strikes,
    SUM(fouls) fouls,
    SUM(pitches) pitches,
    SUM(wildPitches) wildPitches,

    SUM(swings) swings,
    SUM(swingAtBalls) swingAtBalls,
    SUM(swingAtStrikes) swingAtStrikes,

    SUM(inZoneContact) inZoneContact,
    SUM(outZoneContact) outZoneContact,

    SUM(inZone) inZone,
    SUM(ballsInPlay) ballsInPlay,

    SUM(sacFlys) sacFlys,

    SUM(totalPitchQuality) totalPitchQuality,
    SUM(totalPitchPowerQuality) totalPitchPowerQuality,
    SUM(totalPitchLocationQuality) totalPitchLocationQuality,
    SUM(totalPitchMovementQuality) totalPitchMovementQuality
`

@injectable()
class GamePitchResultRepositoryNodeImpl implements GamePitchResultRepository {

    @inject("sequelize")
    private sequelize:Function

    async get(game:Game, player:Player, options?:any): Promise<GamePitchResult> {

        let queryOptions = {
            where: {
                gameId: game._id,
                playerId: player._id
            }
        }

        return GamePitchResult.findOne(Object.assign(queryOptions, options))
    }

    async getByPlayer(player:Player, options?:any): Promise<GamePitchResult[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: true,
            model: GamePitchResult,

            replacements: { 
                playerId: player._id
            }
        }

        const [queryResults, metadata] = await s.query(`

            SELECT gpr.*
            FROM game_pitch_result gpr
            INNER join game g on gpr.gameId = g._id
            WHERE gpr.playerId = :playerId
            ORDER BY gpr.startDate desc
            ${options.limit ? 'LIMIT ' + options.limit : ''}
        `, Object.assign(queryOptions, options))

        return queryResults
    }

    async getStartsByPlayer(playerId:string, options?:any): Promise<GamePitchResult[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: true,
            model: GamePitchResult,

            replacements: { 
                playerId: playerId
            }
        }

        const [queryResults, metadata] = await s.query(`

            SELECT gpr.*
            FROM game_pitch_result gpr
            INNER join game g on gpr.gameId = g._id
            WHERE gpr.playerId = :playerId && gpr.starts = 1
            ORDER BY gpr.startDate desc
            ${options.limit ? 'LIMIT ' + options.limit : ''}
        `, Object.assign(queryOptions, options))

        return queryResults
    }

    async put(gamePitchResult: GamePitchResult, options?: any): Promise<GamePitchResult> {
        await gamePitchResult.save(options)
        return gamePitchResult
    }

    async getPlayersCareerPitchResults(playerIds: string[], options?: any): Promise<PitchResult[]> {

        const s = await this.sequelize()

        const queryOptions = {
            type: s.QueryTypes.RAW,
            plain: false,
            mapToModel: true,
            model: GamePitchResult,
            replacements: { playerIds }
        }

        const [rows, metadata] = await s.query(`
            SELECT
            gpr.playerId,
            COUNT(*) games,
            ${SUM_QUERY_FIELDS}
            FROM game_pitch_result gpr
            WHERE gpr.playerId IN (:playerIds)
            GROUP BY gpr.playerId
        `, Object.assign(queryOptions, options))

        return (rows || []) as PitchResult[]

    }

    async getPlayersSeasonPitchResults(playerIds: string[], seasonId: string, options?: any): Promise<PitchResult[]> {

        const s = await this.sequelize()

        const queryOptions = {
            type: s.QueryTypes.RAW,
            plain: false,
            mapToModel: true,
            model: GamePitchResult,
            replacements: { playerIds, seasonId }
        }

        const [rows, metadata] = await s.query(`
            SELECT
                gpr.playerId,
                COUNT(*) games,
            ${SUM_QUERY_FIELDS}
            FROM game_pitch_result gpr
            JOIN game g ON g._id = gpr.gameId
            WHERE g.seasonId = :seasonId
            AND gpr.playerId IN (:playerIds)
            GROUP BY gpr.playerId
        `, Object.assign(queryOptions, options))

        return (rows || []) as PitchResult[]
    }



    
    async getPlayerCareerPitchResult(player:Player, options?:any) : Promise<PitchResult> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: true,
            model: GamePitchResult,

            replacements: { 
                playerId: player._id
            }
        }

        const [queryResults, metadata] = await s.query(`

            SELECT 
                playerId,
                COUNT(*) games,
                ${SUM_QUERY_FIELDS}
            FROM game_pitch_result

            WHERE playerId = :playerId

            GROUP BY playerId

        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }

    }

    async getPlayerSeasonPitchResult(player: Player, season: Season, options?: any): Promise<PitchResult | undefined> {

        const s = await this.sequelize()

        const queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: true,
            model: GamePitchResult,
            replacements: {
                playerId: player._id,
                seasonId: season._id
            }
        }

        const [queryResults, metadata] = await s.query(`

            SELECT
                ghr.playerId,
                COUNT(*) games,
                ${SUM_QUERY_FIELDS}
            FROM game_pitch_result ghr
            JOIN game g ON g._id = ghr.gameId
            WHERE ghr.playerId = :playerId
            AND g.seasonId = :seasonId
            GROUP BY ghr.playerId

        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }

    }

    async getGlobalPitchResult(options?:any) : Promise<PitchResult> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false
        }

        const [queryResults, metadata] = await s.query(`
            SELECT 
                COUNT(*) games,
                COUNT(DISTINCT gameId) uniqueGames,
                ${SUM_QUERY_FIELDS}
            FROM game_pitch_result
    
        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }


    }

    async getSumsByPlayerAndDate(player:Player, date:Date, options?:any) : Promise<PitchResult> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                gameDate: dayjs(date).format("YYYY-MM-DD"),
                playerId: player._id
            }
        }

        const [queryResults, metadata] = await s.query(`

            select 
                COUNT(*) games,
                ${SUM_QUERY_FIELDS}
            FROM game_pitch_result gpr
                INNER JOIN game g on gpr.gameId = g._id
            WHERE g.seasonId is not NULL AND g.gameDate = :gameDate AND gpr.playerId 
            ORDER BY g.lastUpdated desc
            
        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }

    }

    async updateGamePitchResults(pitchResults: GamePitchResult[], options?: any) {

        const updateObjects = pitchResults.map(p => ({
            gameId: p.gameId,
            teamId: p.teamId,
            playerId: p.playerId,
            age: p.age,
            teamWins: p.teamWins,
            teamLosses: p.teamLosses,
            starts: p.starts,
            wins: p.wins,
            losses: p.losses,
            saves: p.saves,
            bs: p.bs,
            outs: p.outs,
            er: p.er,
            so: p.so,
            hits: p.hits,
            bb: p.bb,
            sho: p.sho,
            cg: p.cg,
            hbp: p.hbp,
            singles: p.singles,
            doubles: p.doubles,
            triples: p.triples,
            battersFaced: p.battersFaced,
            atBats: p.atBats,
            runs: p.runs,
            homeRuns: p.homeRuns,
            groundOuts: p.groundOuts,
            flyOuts: p.flyOuts,
            lineOuts: p.lineOuts,
            groundBalls: p.groundBalls,
            lineDrives: p.lineDrives,
            flyBalls: p.flyBalls,
            sacFlys: p.sacFlys,
            wpa: p.wpa,
            wildPitches: p.wildPitches,
            pitches: p.pitches,
            strikes: p.strikes,
            balls: p.balls,
            fouls: p.fouls,
            inZone: p.inZone,
            swings: p.swings,
            swingAtBalls: p.swingAtBalls,
            swingAtStrikes: p.swingAtStrikes,
            ballsInPlay: p.ballsInPlay,
            inZoneContact: p.inZoneContact,
            outZoneContact: p.outZoneContact,
            totalPitchQuality: p.totalPitchQuality,
            totalPitchPowerQuality: p.totalPitchPowerQuality,
            totalPitchLocationQuality: p.totalPitchLocationQuality,
            totalPitchMovementQuality: p.totalPitchMovementQuality,
            overallRatingBefore: p.overallRatingBefore,
            overallRatingAfter: p.overallRatingAfter,
            careerStats: p.careerStats,
            startDate: p.startDate,
            lastUpdated: p.lastUpdated,
            dateCreated: p.dateCreated
        }))

        const queryOptions = Object.assign({
            fields: Object.keys(updateObjects[0]),
            updateOnDuplicate: Object.keys(updateObjects[0]).filter(k => !['gameId', 'playerId'].includes(k))
        }, options)

        await GamePitchResult.bulkCreate(updateObjects, queryOptions)
    }



}



export {
    GamePitchResultRepositoryNodeImpl, SUM_QUERY_FIELDS
}