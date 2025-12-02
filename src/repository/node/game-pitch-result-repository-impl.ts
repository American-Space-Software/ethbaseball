import {  inject, injectable } from "inversify"

import { GamePitchResultRepository } from "../game-pitch-result-repository.js"
import { GamePitchResult, PitchResult } from "../../dto/game-pitch-result.js"
import { Player } from "../../dto/player.js"
import dayjs from "dayjs"

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

    async get(gameId:string, playerId:string, options?:any): Promise<GamePitchResult> {

        let queryOptions = {
            where: {
                gameId: gameId,
                playerId: playerId
            }
        }

        return GamePitchResult.findOne(Object.assign(queryOptions, options))
    }

    async getByPlayer(playerId:string, options?:any): Promise<GamePitchResult[]> {

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

    async getCareerSeasonsPitchResult(playerId:string, options?:any) : Promise<PitchResult[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,

            replacements: { 
                playerId: playerId
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT 
                playerId,
                age,
                COUNT(*) games,
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
                SUM(experience) experience,
                SUM(teamWins) teamWins,
                SUM(teamLosses) teamLosses,

                SUM(balls) balls,
                SUM(strikes) strikes,
                SUM(fouls) fouls,
                SUM(pitches) pitches,
                SUM(wildPitches) wildPitches,

                SUM(swings) swings,
                SUM(swingAtBalls) swingAtBalls,
                SUM(swingAtStrikes) swingAtStrikes,

                SUM(inZone) inZone,
                SUM(sacFlys) sacFlys,

                SUM(ballsInPlay) ballsInPlay,

                SUM(totalPitchQuality) totalPitchQuality,
                SUM(totalPitchPowerQuality) totalPitchPowerQuality,
                SUM(totalPitchLocationQuality) totalPitchLocationQuality,
                SUM(totalPitchMovementQuality) totalPitchMovementQuality


            FROM game_pitch_result gpr
            
            WHERE playerId = :playerId
            GROUP BY playerId, age
            ORDER by age asc
    
        `, Object.assign(queryOptions, options))

        return queryResults
    

    }

    async getCareerPitchResult(playerId:string, options?:any) : Promise<PitchResult> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,

            replacements: { 
                playerId: playerId
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT 
                playerId,
                COUNT(*) games,
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
                SUM(experience) experience,
                SUM(teamWins) teamWins,
                SUM(teamLosses) teamLosses,

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


            FROM game_pitch_result
            
            WHERE playerId = :playerId
            GROUP BY playerId
    
        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }


    }

    async getTeamPitchResult(teamId:number, options?:any) : Promise<PitchResult> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,

            replacements: { 
                teamId: teamId
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT 
                teamId,
                COUNT(*) games,
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
                SUM(experience) experience,
                SUM(teamWins) teamWins,
                SUM(teamLosses) teamLosses,

                SUM(balls) balls,
                SUM(strikes) strikes,
                SUM(fouls) fouls,
                SUM(pitches) pitches,

                SUM(wildPitches) wildPitches,

                SUM(swings) swings,
                SUM(swingAtBalls) swingAtBalls,
                SUM(swingAtStrikes) swingAtStrikes,

                SUM(inZone) inZone,

                SUM(inZoneContact) inZoneContact,
                SUM(outZoneContact) outZoneContact,

                SUM(ballsInPlay) ballsInPlay,

                SUM(sacFlys) sacFlys,

                SUM(totalPitchQuality) totalPitchQuality,
                SUM(totalPitchPowerQuality) totalPitchPowerQuality,
                SUM(totalPitchLocationQuality) totalPitchLocationQuality,
                SUM(totalPitchMovementQuality) totalPitchMovementQuality


            FROM game_pitch_result
            
            WHERE teamId = :teamId
            GROUP BY teamId
    
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
                SUM(experience) experience,
                SUM(teamWins) teamWins,
                SUM(teamLosses) teamLosses,

                SUM(balls) balls,
                SUM(strikes) strikes,
                SUM(fouls) fouls,
                SUM(pitches) pitches,

                SUM(wildPitches) wildPitches,

                SUM(swings) swings,
                SUM(swingAtBalls) swingAtBalls,
                SUM(swingAtStrikes) swingAtStrikes,

                SUM(inZone) inZone,

                SUM(inZoneContact) inZoneContact,
                SUM(outZoneContact) outZoneContact,
                SUM(ballsInPlay) ballsInPlay,


                SUM(sacFlys) sacFlys,

                SUM(totalPitchQuality) totalPitchQuality,
                SUM(totalPitchPowerQuality) totalPitchPowerQuality,
                SUM(totalPitchLocationQuality) totalPitchLocationQuality,
                SUM(totalPitchMovementQuality) totalPitchMovementQuality


            FROM game_pitch_result
    
        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }


    }

    async getPlayersWithCareerPitchResult(playerIds:string[], options?:any) {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                playerIds: playerIds
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT
                p.*,
                c.name as cityName,
                t.name as teamName,
                t._id as teamId,
                game_stats.games as gs_games,
                game_stats.atBats AS gs_atBats,
                game_stats.hits AS gs_hits,
                game_stats.battersFaced AS gs_battersFaced,
                game_stats.bb AS gs_bb,
                game_stats.bs AS gs_bs,
                game_stats.cg AS gs_cg,
                game_stats.doubles AS gs_doubles,
                game_stats.er AS gs_er,
                
                game_stats.flyBalls AS gs_flyBalls,
                game_stats.flyOuts AS gs_flyOuts,
                
                game_stats.groundBalls AS gs_groundBalls,
                groundOuts AS gs_groundOuts,
                game_stats.hbp AS gs_hbp,
                game_stats.homeRuns AS gs_homeRuns,
                game_stats.lineDrives AS gs_lineDrives,
                game_stats.lineOuts AS gs_lineOuts,
        
                game_stats.losses AS gs_losses,
                game_stats.outs AS gs_outs,
                game_stats.runs AS gs_runs,
                game_stats.saves AS gs_saves,
                game_stats.sho AS gs_sho,
                
                game_stats.singles AS gs_singles,
                game_stats.so AS gs_so,
                game_stats.starts AS gs_starts,
        
                game_stats.triples AS gs_triples,
                game_stats.wins AS gs_wins,
                game_stats.wpa AS gs_wpa,
                game_stats.experience AS gs_experience,
                game_stats.teamWins AS gs_teamWins,
                game_stats.teamLosses AS gs_teamLosses,
        
                game_stats.balls AS gs_balls,
                game_stats.strikes AS gs_strikes,
                game_stats.fouls AS gs_fouls,
                game_stats.pitches AS gs_pitches,
                game_stats.wildPitches as gs_wildPitches
        
                game_stats.swings AS gs_swings,
                game_stats.swingAtBalls AS gs_swingAtBalls,
                game_stats.swingAtStrikes AS gs_swingAtStrikes,
        
                game_stats.inZone AS gs_inZone,
                game_stats.inZoneContact AS gs_inZoneContact,
                game_stats.outZoneContact AS gs_outZoneContact,

                
                game_stats.ballsInPlay AS gs_ballsInPlay,

                game_stats.sacFlys AS gs_sacFlys,

                game_stats.totalPitchQuality as gs_totalPitchQuality,
                game_stats.totalPitchPowerQuality as gs_totalPitchPowerQuality,
                game_stats.totalPitchLocationQuality as gs_totalPitchLocationQuality,
                game_stats.totalPitchMovementQuality as gs_totalPitchMovementQuality

            FROM player p
            
            LEFT JOIN (
                SELECT
                    playerId,
                    COUNT(*) AS games,
                    SUM(atBats) AS atBats,
                    SUM(hits) AS hits,
                    SUM(battersFaced) AS battersFaced,
                    SUM(bb) AS bb,
                    SUM(bs) AS bs,
                    SUM(cg) AS cg,
                    SUM(doubles) AS doubles,
                    SUM(er) AS er,
                    
                    SUM(flyBalls) AS flyBalls,
                    SUM(flyOuts) AS flyOuts,
                    
                    SUM(groundBalls) AS groundBalls,
                    SUM(groundOuts) AS groundOuts,
                    SUM(hbp) AS hbp,
                    SUM(homeRuns) AS homeRuns,
                    SUM(lineDrives) AS lineDrives,
                    SUM(lineOuts) AS lineOuts,
            
                    SUM(losses) AS losses,
                    SUM(outs) AS outs,
                    SUM(runs) AS runs,
                    SUM(saves) AS saves,
                    SUM(sho) AS sho,
                    
                    SUM(singles) AS singles,
                    SUM(so) AS so,
                    SUM(starts) AS starts,
            
                    SUM(triples) AS triples,
                    SUM(wins) AS wins,
                    SUM(wpa) AS wpa,
                    SUM(experience) AS experience,
                    SUM(teamWins) AS teamWins,
                    SUM(teamLosses) AS teamLosses,
            
                    SUM(balls) AS balls,
                    SUM(strikes) AS strikes,
                    SUM(fouls) AS fouls,
                    SUM(pitches) AS pitches,
                    SUM(wildPitches) AS wildPitches,
                    SUM(swings) AS swings,
                    SUM(swingAtBalls) AS swingAtBalls,
                    SUM(swingAtStrikes) AS swingAtStrikes,
            
                    SUM(inZone) AS inZone,
                    SUM(inZoneContact) inZoneContact,
                    SUM(outZoneContact) outZoneContact,
            
                    SUM(ballsInPlay) ballsInPlay,

                    SUM(sacFlys) sacFlys,

                    SUM(totalPitchQuality) totalPitchQuality,
                    SUM(totalPitchPowerQuality) totalPitchPowerQuality,
                    SUM(totalPitchLocationQuality) totalPitchLocationQuality,
                    SUM(totalPitchMovementQuality) totalPitchMovementQuality
            
                FROM game_pitch_result
                GROUP BY playerId
            ) AS game_stats ON p._id = game_stats.playerId

            LEFT JOIN team t ON p.teamId = t._id
            LEFT JOIN city c on t.cityId = c._id

            where p._id in (:playerIds)

        `, Object.assign(queryOptions, options))

        return queryResults


    }

    async getAverageCareerPitchResult(playerId:string, options?:any) : Promise<PitchResult> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,

            replacements: { 
                playerId: playerId
            }
        }

        const [queryResults, metadata] = await s.query(`

            select 
                playerId,
                COUNT(*) games,
                AVG(atBats) atBats,
                AVG(hits) hits,
                AVG(battersFaced) battersFaced,
                AVG(bb) bb,
                AVG(bs) bs,
                AVG(cg) cg,
                AVG(doubles) doubles,
                AVG(er) er,
                
                AVG(flyBalls) flyBalls,
                AVG(flyOuts) flyOuts,
                
                AVG(groundBalls) groundBalls,
                AVG(groundOuts) groundOuts,
                AVG(hbp) hbp,
                AVG(hits) hits,
                AVG(homeRuns) homeRuns,
                AVG(lineDrives) lineDrives,
                AVG(lineOuts) lineOuts,
                
                AVG(losses) losses,
                AVG(outs) outs,

                AVG(runs) runs,
                AVG(saves) saves,
                AVG(sho) sho,
                
                AVG(singles) singles,
                AVG(so) so,
                AVG(starts) starts,

                AVG(triples) triples,
                AVG(wins) wins,
                AVG(wpa) wpa,

                AVG(experience),
                AVG(teamWins),
                AVG(teamLosses),

                AVG(balls) balls,
                AVG(strikes) strikes,
                AVG(fouls) fouls,
                AVG(pitches) pitches,
                AVG(wildPitches) wildPitches,
                
                AVG(swings) swings,
                AVG(swingAtBalls) swingAtBalls,
                AVG(swingAtStrikes) swingAtStrikes,

                AVG(inZone) inZone,
                AVG(ballsInPlay) ballsInPlay,

                AVG(inZoneContact) inZoneContact,
                AVG(outZoneContact) outZoneContact,

                AVG(sacFlys) sacFlys,

                AVG(totalPitchQuality) totalPitchQuality,
                AVG(totalPitchPowerQuality) totalPitchPowerQuality,
                AVG(totalPitchLocationQuality) totalPitchLocationQuality,
                AVG(totalPitchMovementQuality) totalPitchMovementQuality



            FROM (SELECT 
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
                SUM(experience) experience,
                SUM(teamWins) teamWins,
                SUM(teamLosses) teamLosses,

                SUM(balls) balls,
                SUM(strikes) strikes,
                SUM(fouls) fouls,
                SUM(pitches) pitches,
                SUM(wildPitches) wildPitches,
                
                SUM(swings) swings,
                SUM(swingAtBalls) swingAtBalls,
                SUM(swingAtStrikes) swingAtStrikes,

                SUM(inZone) inZone,
                SUM(inZoneContact) inZoneContact,
                SUM(outZoneContact) outZoneContact,

                SUM(ballsInPlay) ballsInPlay,

                SUM(sacFlys) sacFlys,

                SUM(totalPitchQuality) totalPitchQuality,
                SUM(totalPitchPowerQuality) totalPitchPowerQuality,
                SUM(totalPitchLocationQuality) totalPitchLocationQuality,
                SUM(totalPitchMovementQuality) totalPitchMovementQuality

            FROM game_pitch_result gpr
                INNER JOIN 'game' g on gpr.gameId = g._id
            WHERE gpr.playerId = :playerId
            GROUP BY playerId
            ORDER BY g.lastUpdated desc)
        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }

    }

    async getGameAveragePitchResult(options?:any) : Promise<PitchResult> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,

        }

        const [queryResults, metadata] = await s.query(`

            select 
                COUNT(*) games,
                AVG(atBats) atBats,
                AVG(hits) hits,
                AVG(battersFaced) battersFaced,
                AVG(bb) bb,
                AVG(bs) bs,
                AVG(cg) cg,
                AVG(doubles) doubles,
                AVG(er) er,
                
                AVG(flyBalls) flyBalls,
                AVG(flyOuts) flyOuts,
                
                AVG(games) games,
                AVG(groundBalls) groundBalls,
                AVG(groundOuts) groundOuts,
                AVG(hbp) hbp,
                AVG(hits) hits,
                AVG(homeRuns) homeRuns,
                AVG(lineDrives) lineDrives,
                AVG(lineOuts) lineOuts,
                
                AVG(losses) losses,
                AVG(outs) outs,

                AVG(runs) runs,
                AVG(saves) saves,
                AVG(sho) sho,
                
                AVG(singles) singles,
                AVG(so) so,
                AVG(starts) starts,

                AVG(triples) triples,
                AVG(wins) wins,
                AVG(wpa) wpa,

                AVG(balls) balls,
                AVG(strikes) strikes,
                AVG(fouls) fouls,
                AVG(pitches) pitches,
                AVG(wildPitches) wildPitches,

                AVG(swings) swings,
                AVG(swingAtBalls) swingAtBalls,
                AVG(swingAtStrikes) swingAtStrikes,

                AVG(inZone) inZone,
                AVG(ballsInPlay) ballsInPlay,

                AVG(inZoneContact) inZoneContact,
                AVG(outZoneContact) outZoneContact,

                AVG(sacFlys) sacFlys,

                AVG(totalPitchQuality) totalPitchQuality,
                AVG(totalPitchPowerQuality) totalPitchPowerQuality,
                AVG(totalPitchLocationQuality) totalPitchLocationQuality,
                AVG(totalPitchMovementQuality) totalPitchMovementQuality


            FROM (SELECT 
                ${SUM_QUERY_FIELDS}
            FROM game_pitch_result gpr
                INNER JOIN 'game' g on gpr.gameId = g._id
            WHERE g.isComplete = true
            GROUP BY gameId
            ORDER BY g.lastUpdated desc
            ${options?.limit ? `LIMIT ${options.limit}` : ''}
            ) 

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
            WHERE g.gameDate = :gameDate AND gpr.playerId
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