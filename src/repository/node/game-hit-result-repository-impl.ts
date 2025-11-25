import {  inject, injectable } from "inversify"

import { GameHitResultRepository } from "../game-hit-result-repository.js"
import { GameHitResult, HitResult } from "../../dto/game-hit-result.js"
import { Player } from "../../dto/player.js"
import dayjs from "dayjs"

const SUM_QUERY_FIELDS = `
    SUM(pa) pa,
    SUM(assists) assists,
    SUM(atBats) atBats,
    SUM(hits) hits,
    SUM(runs) runs,
    SUM(bb) bb,
    SUM(cs) cs,
    SUM(singles) singles,
    SUM(doubles) doubles,
    SUM(triples) triples,
    SUM(e) e,
    SUM(flyBalls) flyBalls,
    SUM(flyOuts) flyOuts,
    SUM(gidp) gidp,
    SUM(passedBalls) passedBalls,
    SUM(groundBalls) groundBalls,
    SUM(groundOuts) groundOuts,
    SUM(hbp) hbp,
    SUM(homeRuns) homeRuns,
    SUM(lineDrives) lineDrives,
    SUM(lineOuts) lineOuts,
    SUM(outs) outs,
    SUM(lob) lob,
    SUM(po) po,
    SUM(rbi) rbi,
    SUM(sacBunts) sacBunts,
    SUM(sacFlys) sacFlys,
    SUM(sb) sb,
    SUM(so) so,
    SUM(wpa) wpa,
    SUM(experience) experience,
    SUM(teamWins) teamWins,
    SUM(teamLosses) teamLosses,
    SUM(pitches) pitches,
    SUM(balls) balls,
    SUM(strikes) strikes,
    SUM(fouls) fouls,

    SUM(swings) swings,
    SUM(swingAtBalls) swingAtBalls,
    SUM(swingAtStrikes) swingAtStrikes,

    SUM(inZoneContact) inZoneContact,
    SUM(outZoneContact) outZoneContact,

    SUM(inZone) inZone,
    SUM(ballsInPlay) ballsInPlay,
    SUM(sbAttempts) sbAttempts,

    SUM(totalPitchQuality) totalPitchQuality,
    SUM(totalPitchPowerQuality) totalPitchPowerQuality,
    SUM(totalPitchLocationQuality) totalPitchLocationQuality,
    SUM(totalPitchMovementQuality) totalPitchMovementQuality,

    SUM(csDefense) csDefense,
    SUM(doublePlays) doublePlays
`

@injectable()
class GameHitResultRepositoryNodeImpl implements GameHitResultRepository {

    @inject("sequelize")
    private sequelize:Function

    async get(gameId:string, playerId:string, options?:any): Promise<GameHitResult> {

        let queryOptions = {
            where: {
                gameId: gameId,
                playerId: playerId
            }
        }

        return GameHitResult.findOne(Object.assign(queryOptions, options))
    }

    async getByPlayer(playerId:string, options?:any): Promise<GameHitResult[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: true,
            model: GameHitResult,

            replacements: { 
                playerId: playerId
            }
        }

        const [queryResults, metadata] = await s.query(`

        SELECT ghr.*
        FROM game_hit_result ghr
        INNER join game g on ghr.gameId = g._id
        WHERE ghr.playerId = :playerId
        ORDER BY ghr.startDate desc
        ${options.limit ? 'LIMIT ' + options.limit : ''}
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async put(gameHitResult: GameHitResult, options?: any): Promise<GameHitResult> {
        await gameHitResult.save(options)
        return gameHitResult
    }

    async getCareerSeasonsHitResult(playerId:string, options?:any) : Promise<HitResult[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: true,
            model: GameHitResult,

            replacements: { 
                playerId: playerId
            }
        }

        const [queryResults, metadata] = await s.query(`

            SELECT 
                playerId,
                age,
                COUNT(*) games,
                ${SUM_QUERY_FIELDS}
            FROM game_hit_result ghr
            INNER join game g on ghr.gameId = g._id

            WHERE playerId = :playerId
            GROUP BY playerId, age
            ORDER by age asc
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async getCareerHitResult(playerId:string, options?:any) : Promise<HitResult> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: true,
            model: GameHitResult,

            replacements: { 
                playerId: playerId
            }
        }

        const [queryResults, metadata] = await s.query(`

            SELECT 
                playerId,
                COUNT(*) games,
                ${SUM_QUERY_FIELDS}
            FROM game_hit_result

            WHERE playerId = :playerId

            GROUP BY playerId
        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }

    }

    async getTeamHitResult(teamId:number, options?:any) : Promise<HitResult> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: true,
            model: GameHitResult,

            replacements: { 
                teamId: teamId
            }
        }

        const [queryResults, metadata] = await s.query(`

            SELECT 
                teamId,
                COUNT(*) games,
                ${SUM_QUERY_FIELDS}
            FROM game_hit_result

            WHERE teamId = :teamId

            GROUP BY teamId
        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }

    }

    async getGlobalHitResult(options?:any) : Promise<HitResult> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: true,
            model: GameHitResult
        }

        const [queryResults, metadata] = await s.query(`

            SELECT 
                COUNT(*) games,
                COUNT(DISTINCT gameId) uniqueGames,
                ${SUM_QUERY_FIELDS}
            FROM game_hit_result
            
        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }

    }


    async getAverageCareerHitResult(playerId:string, options?:any) : Promise<HitResult> {

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
                AVG(pa) pa,
                AVG(assists) assists,
                AVG(atBats) atBats,
                AVG(hits) hits,
                AVG(runs) runs,
                AVG(bb) bb,
                AVG(cs) cs,
                AVG(singles) singles,
                AVG(doubles) doubles,
                AVG(triples) triples,
                AVG(e) e,
                AVG(flyBalls) flyBalls,
                AVG(flyOuts) flyOuts,
                AVG(gidp) gidp,
                AVG(passedBalls) passedBalls,
                AVG(groundBalls) groundBalls,
                AVG(groundOuts) groundOuts,
                AVG(hbp) hbp,
                AVG(homeRuns) homeRuns,
                AVG(lineDrives) lineDrives,
                AVG(lineOuts) lineOuts,
                AVG(outs) outs,
                AVG(lob) lob,
                AVG(po) po,
                AVG(rbi) rbi,
                AVG(sacBunts) sacBunts,
                AVG(sacFlys) sacFlys,
                AVG(sb) sb,
                AVG(so) so,
                AVG(wpa) wpa,
                AVG(experience) experience,
                AVG(teamWins) teamWins,
                AVG(teamLosses) teamLosses,
                AVG(pitches) pitches,
                AVG(balls) balls,
                AVG(strikes) strikes,
                AVG(fouls) fouls,

                AVG(swings) swings,
                AVG(swingAtBalls) swingAtBalls,
                AVG(swingAtStrikes) swingAtStrikes,
                AVG(sbAttempts) sbAttempts,

                AVG(inZone) inZone,
                AVG(ballsInPlay) ballsInPlay,

                AVG(inZoneContact) inZoneContact,
                AVG(outZoneContact) outZoneContact,

                AVG(totalPitchQuality) totalPitchQuality,
                AVG(totalPitchPowerQuality) totalPitchPowerQuality,
                AVG(totalPitchLocationQuality) totalPitchLocationQuality,
                AVG(totalPitchMovementQuality) totalPitchMovementQuality,


            FROM (SELECT 
                ${SUM_QUERY_FIELDS}
            FROM game_hit_result ghr
                INNER JOIN 'game' g on ghr.gameId = g._id
            WHERE ghr.playerId = :playerId
            GROUP BY playerId
            ORDER BY g.lastUpdated desc)
        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }

    }

    async getGameAverageHitResult(options?:any) : Promise<HitResult> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,

        }

        const [queryResults, metadata] = await s.query(`

            select 
                COUNT(*) games,
                AVG(pa) pa,
                AVG(assists) assists,
                AVG(atBats) atBats,
                AVG(hits) hits,
                AVG(runs) runs,
                AVG(bb) bb,
                AVG(cs) cs,
                AVG(singles) singles,
                AVG(doubles) doubles,
                AVG(triples) triples,
                AVG(e) e,
                AVG(flyBalls) flyBalls,
                AVG(flyOuts) flyOuts,
                AVG(gidp) gidp,
                AVG(passedBalls) passedBalls,
                AVG(groundBalls) groundBalls,
                AVG(groundOuts) groundOuts,
                AVG(hbp) hbp,
                AVG(homeRuns) homeRuns,
                AVG(lineDrives) lineDrives,
                AVG(lineOuts) lineOuts,
                AVG(outs) outs,
                AVG(lob) lob,
                AVG(po) po,
                AVG(rbi) rbi,
                AVG(sacBunts) sacBunts,
                AVG(sacFlys) sacFlys,
                AVG(sb) sb,
                AVG(so) so,
                AVG(wpa) wpa,
                AVG(experience) experience,
                AVG(teamWins) teamWins,
                AVG(teamLosses) teamLosses,
                AVG(sbAttempts) sbAttempts,

                AVG(pitches) pitches,
                AVG(balls) balls,
                AVG(strikes) strikes,
                AVG(fouls) fouls,

                AVG(swings) swings,
                AVG(swingAtBalls) swingAtBalls,
                AVG(swingAtStrikes) swingAtStrikes,

                AVG(inZone) inZone,
                AVG(ballsInPlay) ballsInPlay,

                AVG(inZoneContact) inZoneContact,
                AVG(outZoneContact) outZoneContact,


                AVG(totalPitchQuality) totalPitchQuality,
                AVG(totalPitchPowerQuality) totalPitchPowerQuality,
                AVG(totalPitchLocationQuality) totalPitchLocationQuality,
                AVG(totalPitchMovementQuality) totalPitchMovementQuality


            FROM (SELECT 
                ${SUM_QUERY_FIELDS}
            FROM game_hit_result ghr
                INNER JOIN 'game' g on ghr.gameId = g._id
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

    async getSumsByPlayerAndDate(player:Player, date:Date, options?:any) : Promise<HitResult> {

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
            FROM game_hit_result ghr
                INNER JOIN game g on ghr.gameId = g._id
            WHERE g.gameDate = :gameDate AND ghr.playerId
            ORDER BY g.lastUpdated desc
            

        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }

    }


    async updateGameHitResults(hitResults: GameHitResult[], options?: any) {

        const queryOptions = Object.assign({
            fields: [
                'gameId', 'teamId', 'playerId', 'age', 'teamWins', 'teamLosses', 'pa', 'atBats', 'hits',
                'singles', 'doubles', 'triples', 'homeRuns', 'runs', 'rbi', 'bb', 'sbAttempts', 'sb', 'cs',
                'hbp', 'so', 'lob', 'sacBunts', 'sacFlys', 'groundOuts', 'flyOuts', 'lineOuts', 'outs',
                'groundBalls', 'lineDrives', 'flyBalls', 'gidp', 'po', 'assists', 'outfieldAssists',
                'csDefense', 'doublePlays', 'e', 'passedBalls', 'wpa', 'pitches', 'balls', 'strikes',
                'fouls', 'inZone', 'swings', 'swingAtBalls', 'swingAtStrikes', 'ballsInPlay',
                'inZoneContact', 'outZoneContact', 'totalPitchQuality', 'totalPitchPowerQuality',
                'totalPitchLocationQuality', 'totalPitchMovementQuality', 'overallRatingBefore',
                'overallRatingAfter', 'careerStats', 'startDate', 'lastUpdated', 'dateCreated'
            ],
            updateOnDuplicate: [
                'age', 'teamWins', 'teamLosses', 'pa', 'atBats', 'hits', 'singles', 'doubles', 'triples',
                'homeRuns', 'runs', 'rbi', 'bb', 'sbAttempts', 'sb', 'cs', 'hbp', 'so', 'lob', 'sacBunts',
                'sacFlys', 'groundOuts', 'flyOuts', 'lineOuts', 'outs', 'groundBalls', 'lineDrives',
                'flyBalls', 'gidp', 'po', 'assists', 'outfieldAssists', 'csDefense', 'doublePlays', 'e',
                'passedBalls', 'wpa', 'pitches', 'balls', 'strikes', 'fouls', 'inZone', 'swings',
                'swingAtBalls', 'swingAtStrikes', 'ballsInPlay', 'inZoneContact', 'outZoneContact',
                'totalPitchQuality', 'totalPitchPowerQuality', 'totalPitchLocationQuality',
                'totalPitchMovementQuality', 'overallRatingBefore', 'overallRatingAfter', 'careerStats',
                'startDate', 'lastUpdated'
            ]
        }, options)


        const updateHitResults = hitResults.map(h => ({
            gameId: h.gameId,
            teamId: h.teamId,
            playerId: h.playerId,
            age: h.age,
            teamWins: h.teamWins,
            teamLosses: h.teamLosses,
            pa: h.pa,
            atBats: h.atBats,
            hits: h.hits,
            singles: h.singles,
            doubles: h.doubles,
            triples: h.triples,
            homeRuns: h.homeRuns,
            runs: h.runs,
            rbi: h.rbi,
            bb: h.bb,
            sbAttempts: h.sbAttempts,
            sb: h.sb,
            cs: h.cs,
            hbp: h.hbp,
            so: h.so,
            lob: h.lob,
            sacBunts: h.sacBunts,
            sacFlys: h.sacFlys,
            groundOuts: h.groundOuts,
            flyOuts: h.flyOuts,
            lineOuts: h.lineOuts,
            outs: h.outs,
            groundBalls: h.groundBalls,
            lineDrives: h.lineDrives,
            flyBalls: h.flyBalls,
            gidp: h.gidp,
            po: h.po,
            assists: h.assists,
            outfieldAssists: h.outfieldAssists,
            csDefense: h.csDefense,
            doublePlays: h.doublePlays,
            e: h.e,
            passedBalls: h.passedBalls,
            wpa: h.wpa,
            pitches: h.pitches,
            balls: h.balls,
            strikes: h.strikes,
            fouls: h.fouls,
            inZone: h.inZone,
            swings: h.swings,
            swingAtBalls: h.swingAtBalls,
            swingAtStrikes: h.swingAtStrikes,
            ballsInPlay: h.ballsInPlay,
            inZoneContact: h.inZoneContact,
            outZoneContact: h.outZoneContact,
            totalPitchQuality: h.totalPitchQuality,
            totalPitchPowerQuality: h.totalPitchPowerQuality,
            totalPitchLocationQuality: h.totalPitchLocationQuality,
            totalPitchMovementQuality: h.totalPitchMovementQuality,
            overallRatingBefore: h.overallRatingBefore,
            overallRatingAfter: h.overallRatingAfter,
            careerStats: h.careerStats,
            startDate: h.startDate,
            lastUpdated: h.lastUpdated,
            dateCreated: h.dateCreated
        }))


        await GameHitResult.bulkCreate(updateHitResults, queryOptions);
    }

}



export {
    GameHitResultRepositoryNodeImpl, SUM_QUERY_FIELDS
}