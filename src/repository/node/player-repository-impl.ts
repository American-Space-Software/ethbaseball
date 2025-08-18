import {  inject, injectable } from "inversify"
import { PlayerRepository } from "../player-repository.js"
import { Player } from "../../dto/player.js"

import { Owner } from "../../dto/owner.js"
import { Op, QueryTypes } from "sequelize"

import dayjs from "dayjs"
import { HittingRatings, PitchRatings, PlayerFinalContract, PlayerReport, Position } from "../../service/enums.js"
import { Team } from "../../dto/team.js"

import { League } from "../../dto/league.js"
import { City } from "../../dto/city.js"
import { Season } from "../../dto/season.js"

const HIT_SUM_QUERY_FIELDS = `
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

const PITCH_SUM_QUERY_FIELDS = `
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

    SUM(games) games,
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
class PlayerRepositoryNodeImpl implements PlayerRepository {

    @inject("sequelize")
    private sequelize:Function

    async get(id:string, options?:any): Promise<Player> {

        let player:Player = await Player.findByPk(id, options)

        //Some way to make sequelize do this?
        if (player?.lastGamePlayed) {
            player.lastGamePlayed = dayjs(player.lastGamePlayed).toDate()
        }

        return player
    }

    async put(player:Player, options?:any): Promise<Player> {

        await player.save(options)
        return player

    }

    async putAll(players:Player[], options?:any) : Promise<void> {
        for (let player of players) {
            await this.put(player, options)
        }
    }

    async delete(player:Player, options?:any) {
        return player.destroy(options)
    }

    async updateGameFields(players:Player[], options?:any) {

            let queryOptions = Object.assign({ 
                fields: ["_id","overallRating", "hittingRatings", "pitchRatings","careerStats", "firstName", "lastName", "primaryPosition", "zodiacSign", "pitchingProfile", "hittingProfile", "throws", "hits", "isRetired", "lastGamePlayed", "lastGamePitched", "lastGameUpdate", "contract", "age", "personalityType"], 
                updateOnDuplicate: ["_id", "overallRating", "hittingRatings", "pitchRatings","careerStats","lastGamePlayed", "lastGamePitched", "lastGameUpdate", "contract", "age"],
            }, options)

            let updatePlayers = players.map( p => {
                return {
                    _id: p._id,
                    overallRating: p.overallRating,
                    hittingRatings: p.hittingRatings,
                    pitchRatings: p.pitchRatings,
                    careerStats: p.careerStats,
                    lastGameUpdate: p.lastGameUpdate,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    primaryPosition: p.primaryPosition,
                    zodiacSign: p.zodiacSign,
                    personalityType: p.personalityType,
                    pitchingProfile: p.pitchingProfile,
                    hittingProfile: p.hittingProfile,
                    throws: p.throws,
                    hits: p.hits,
                    isRetired: p.isRetired,
                    lastGamePitched: p.lastGamePitched,
                    lastGamePlayed: p.lastGamePlayed,
                    contract: p.contract,
                    age: p.age
                }
            })


            await Player.bulkCreate(updatePlayers, queryOptions)
    }

    // async setLastGameUpdate(playerIds: string[], options?: any) {

    //     let s = await this.sequelize()

    //     await Player.update(
    //         {
    //             lastGameUpdate: s.fn('NOW')
    //         },
    //         Object.assign({ 
    //             where: {
    //                 _id: {
    //                   [Op.in]: playerIds
    //                 }
    //               }
    //         }, options)
    //     )

    // }

    // async setLastGamePlayed(playerIds: string[], gameDate:Date, options?: any) {

    //     let s = await this.sequelize()

    //     await Player.update(
    //         {
    //             lastGamePlayed: gameDate
    //         },
    //         Object.assign({ 
    //             where: {
    //                 _id: {
    //                   [Op.in]: playerIds
    //                 }
    //               }
    //         }, options)
    //     )

    // }

    async getByOwner(owner:Owner, options?:any): Promise<Player[]> {

        let queryOptions = {
            where: {
                ownerId: owner._id
            },
            order: [['lastName', 'ASC'], ['firstName', 'ASC']]
        }

        return Player.findAll(Object.assign(queryOptions, options))

    }

    async getMaxTokenId(options?:any): Promise<number> {

        let maxTokenId:number = await Player.max("_id", options)
        if (!maxTokenId) maxTokenId = 0

        return maxTokenId

    }

    async countByOwner(owner:Owner, options?:any): Promise<number> {

        let queryOptions = Object.assign({
            where: {
                ownerId: owner._id
            }
        }, options)


        let result = await Player.count(queryOptions)

        //@ts-ignore
        return result

    }

    async count(options?:any): Promise<number> {

        let queryOptions = Object.assign({
            where: {}
        }, options)

        let result = await Player.count(queryOptions)

        //@ts-ignore
        return result

    }

    async countActive(options?:any): Promise<number> {

        let queryOptions = Object.assign({
            where: {
                isRetired: false
            }
        }, options)

        let result = await Player.count(queryOptions)

        //@ts-ignore
        return result

    }

    async getByTokenId(tokenId: number, options?: any): Promise<Player> {

        let queryOptions = {
            where: {
                tokenId: tokenId
            },
            order: [
                ['tokenId', 'desc']
            ],
            offset: options?.offset ? options.offset : 0,
            limit: options?.limit ? options.limit : 20
        }

        return Player.findOne(Object.assign(queryOptions, options))
    }

    async getByTokenIdWithTeam(tokenId: number, options?: any): Promise<Player> {

        let queryOptions = {
            where: {
                tokenId: tokenId
            },
            order: [
                ['tokenId', 'desc']
            ],
            include: [Team],
            offset: options?.offset ? options.offset : 0,
            limit: options?.limit ? options.limit : 20
        }

        return Player.findOne(Object.assign(queryOptions, options))
    }

    async getByTokenIds(tokenIds: number[], options?: any): Promise<Player[]> {

        let queryOptions = {
            where: {
                tokenId: {
                    [Op.in]: tokenIds
                }
            },
            order: [
                ['overallRating', 'desc']
            ]
        }

        return Player.findAll(Object.assign(queryOptions, options))
    }

    async getByIds(ids: string[], options?: any): Promise<Player[]> {

        let queryOptions = {
            where: {
                _id: {
                    [Op.in]: ids
                }
            },
            order: [
                ['overallRating', 'desc']
            ]
        }

        return Player.findAll(Object.assign(queryOptions, options))
    }

    async getWithTeamByIds(ids: string[], options?: any): Promise<any[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                ids: ids
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT
                p.*,
                c.name as cityName,
                t.name as teamName,
                t._id as teamId
        
            FROM player p
            
            LEFT JOIN team t ON p.teamId = t._id
            LEFT JOIN city c on t.cityId = c._id

            where p._id in (:ids)

        `, Object.assign(queryOptions, options))

        return queryResults


    }

    async getWithTeam(_id: string, options?: any): Promise<Player> {

        let query = {
            where: {
                _id: _id
            },
            include: {
                model: Team,
                include: [City]
            },
        }

        return Player.findOne(Object.assign(query, options))

    }

    async getPitcherIds(options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p._id FROM player as p 
            WHERE p.primaryPosition = "P"
            ORDER BY p.overallRating DESC
        `, Object.assign(queryOptions, options))

        return queryResults.map( i => i._id)

    }

    async getHitterIds(options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p._id FROM player as p 
            WHERE p.primaryPosition != "P"
            ORDER BY p.overallRating DESC
        `, Object.assign(queryOptions, options))

        return queryResults.map( i => i._id)

    }

    async getPitcherIdsByOwner(owner:Owner, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                ownerId: owner._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p._id FROM player as p 
            WHERE p.primaryPosition = "P" and p.ownerId = :ownerId
        `, Object.assign(queryOptions, options))

        return queryResults.map( i => i._id)

    }

    async getHitterIdsByOwner(owner:Owner, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                ownerId: owner._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p._id FROM player as p 
            WHERE p.primaryPosition != "P" and p.ownerId = :ownerId
        `, Object.assign(queryOptions, options))

        return queryResults.map( i => i._id)

    }

    async getFreeAgentPitcherIds(date:Date, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                theDate: date
            }
        }

        const [queryResults, metadata] = await s.query(`

            SELECT  
                p._id FROM player as p 
            INNER JOIN player_league_season pls on pls.playerId = p._id
            WHERE 
                p.primaryPosition = "P" 
                AND pls.teamId is null
                AND (pls.startDate IS NOT NULL AND pls.startDate <= :theDate)
                AND (pls.endDate >= :theDate OR pls.endDate is null)
            ORDER by p.overallRating DESC
            ${options.limit ? `LIMIT ${options.limit}` : ''}
            ${options.offset ? `OFFSET ${options.offset}` : ''}
        `, Object.assign(queryOptions, options))

        return queryResults.map( i => i._id)

    }

    async getFreeAgentHitterIds(date:Date, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                theDate: date
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p._id FROM player as p 
            INNER JOIN player_league_season pls on pls.playerId = p._id
            WHERE 
                p.primaryPosition != "P" 
                AND pls.teamId is null
                AND (pls.startDate IS NOT NULL AND pls.startDate <= :theDate )
                AND (pls.endDate >= :theDate OR pls.endDate is null)
            ORDER by p.overallRating DESC
            ${options.limit ? `LIMIT ${options.limit}` : ''}
            ${options.offset ? `OFFSET ${options.offset}` : ''}
        `, Object.assign(queryOptions, options))

        return queryResults.map( i => i._id)

    }

    async getFreeAgentIdsByPositionAndSalary(position:Position, salary:bigint, date:Date, limit:number, offset:number, options?:any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                position: position.toString(),
                theDate: date
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p._id FROM player p 
            INNER JOIN player_league_season pls on pls.playerId = p._id
            WHERE 
                p.primaryPosition = :position
                AND pls.teamId is null
                AND (pls.startDate IS NOT NULL AND pls.startDate <= :theDate)
                AND (pls.endDate >= :theDate OR pls.endDate is null)
            ORDER by p.overallRating DESC
            LIMIT ${limit} OFFSET ${offset}

        `, Object.assign(queryOptions, options))

        return queryResults.map( i => i._id)

    }

    async list(options?: any) : Promise<Player[]> {


        let queryOptions = {
            order: [
                ['overallRating', 'desc']
            ]
        }

        return Player.findAll(Object.assign(queryOptions, options))

    }

    async listWithTeams(options?: any) : Promise<any[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p.*, 
                t.name as teamName
            FROM player p 
            LEFT JOIN team t on t._id = p.teamId 
            ORDER BY p.overallRating DESC
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async listByOwnerWithTeams(owner:Owner, options?: any) : Promise<any[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                ownerId: owner._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p.*, 
                t.name as teamName
            FROM player p 
            LEFT JOIN team t on t._id = p.teamId 
            WHERE p.ownerId = :ownerId
            ORDER BY p.overallRating DESC
        `, Object.assign(queryOptions, options))

        return queryResults

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
                p._id FROM player as p 
            ORDER BY p.overallRating DESC
        `, Object.assign(queryOptions, options))

        return queryResults.map( i => i._id)

    }

    async getPlayerReport(options?:any) : Promise<PlayerReport> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,

        }

        const [queryResults, metadata] = await s.query(`

            select 
                MAX(JSON_EXTRACT(p.rating, '$.rating')) maxRating,
                MIN(JSON_EXTRACT(p.rating, '$.rating')) minRating,
                AVG(JSON_EXTRACT(p.rating, '$.rating')) avgRating,
                SUM(CASE WHEN p.level == 1 THEN 1 ELSE 0 END) highSchoolCount,
                SUM(CASE WHEN p.level == 2 THEN 1 ELSE 0 END) jucoCount,
                SUM(CASE WHEN p.level == 3 THEN 1 ELSE 0 END) collegeCount,
                SUM(CASE WHEN p.level == 4 THEN 1 ELSE 0 END) minorsCount,
                SUM(CASE WHEN p.level == 5 THEN 1 ELSE 0 END) majorsCount
            from player p
    

        `, Object.assign(queryOptions, options))

        if (queryResults?.length > 0) {
            return queryResults[0]
        }


    }

    async getLatest(options?:any): Promise<Player> {

        let s = await this.sequelize()

        const maxIdToken = await Player.findOne({
            attributes: [[s.fn('max', s.col('_id')), 'max_id']],
        //@ts-ignore
        }, options)
          
        //@ts-ignore
        return this.get(maxIdToken?.get('max_id', options))
    }

    async clearAllTransactions( options?:any ): Promise<void> {
        
        await Player.update({ 
            transactionsViewModel:  {transactions: [],rowItemViewModels: {}}

        }, Object.assign({  where: {} }, options) )

    }

    async getUpdatedLastGameSince(lastUpdated:Date, options?: any) : Promise<Player[]> {

        let queryOptions = {
            where: { 
                lastGameUpdate: {
                    [Op.gte]: lastUpdated
                }
            },
            order: [
                ['lastGameUpdate', 'desc']
            ]
        }

        return Player.findAll(Object.assign(queryOptions, options))

    }

    async getDisplayPlayersById(playerIds:string[], options?:any) {

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

                hit_stats.games as _hit_games,
                hit_stats.assists as _hit_assists,
                hit_stats.outfieldAssists as _hit_outfieldAssists,
                hit_stats.pa as _hit_pa,
                hit_stats.atBats as _hit_atBats,
                hit_stats.hits as _hit_hits,
                hit_stats.runs as _hit_runs,
                hit_stats.bb as _hit_bb,
                hit_stats.cs as _hit_cs,
                hit_stats.csDefense as _hit_csDefense,
                hit_stats.passedBalls as _hit_passedBalls,
                hit_stats.singles as _hit_singles,
                hit_stats.doubles as _hit_doubles,
                hit_stats.triples as _hit_triples,
                hit_stats.e as _hit_e,
                hit_stats.flyBalls as _hit_flyBalls,
                hit_stats.flyOuts as _hit_flyOuts,
                hit_stats.gidp as _hit_gidp,
                hit_stats.groundBalls as _hit_groundBalls,
                hit_stats.groundOuts as _hit_groundOuts,
                hit_stats.doublePlays as _hit_doublePlays,
                hit_stats.hbp as _hit_hbp,
                hit_stats.homeRuns as _hit_homeRuns,
                hit_stats.lineDrives as _hit_lineDrives,
                hit_stats.lineOuts as _hit_lineOuts,
                hit_stats.outs as _hit_outs,
                hit_stats.lob as _hit_lob,
                hit_stats.po  as _hit_po,
                hit_stats.rbi as _hit_rbi,
                hit_stats.sacBunts as _hit_sacBunts,
                hit_stats.sacFlys as _hit_sacFlys,
                hit_stats.sb as _hit_sb,
                hit_stats.sbAttempts as _hit_sbAttempts,

                hit_stats.so as _hit_so,
                hit_stats.wpa as _hit_wpa,
                hit_stats.experience as _hit_experience,
                hit_stats.teamWins as _hit_teamWins,
                hit_stats.teamLosses as _hit_teamLosses,
                hit_stats.pitches as _hit_pitches,
                hit_stats.balls as _hit_balls,
                hit_stats.strikes as _hit_strikes,
                hit_stats.fouls as _hit_fouls,
                hit_stats.swings as _hit_swings,
                hit_stats.swingAtBalls as _hit_swingAtBalls,
                hit_stats.swingAtStrikes as _hit_swingAtStrikes,
                hit_stats.inZone as _hit_inZone,

                hit_stats.inZoneContact AS _hit_inZoneContact,
                hit_stats.outZoneContact AS _hit_outZoneContact

                pitch_stats.games as _pitch_games,
                pitch_stats.atBats AS _pitch_atBats,
                pitch_stats.hits AS _pitch_hits,
                pitch_stats.battersFaced AS _pitch_battersFaced,
                pitch_stats.bb AS _pitch_bb,
                pitch_stats.bs AS _pitch_bs,
                pitch_stats.cg AS _pitch_cg,
                pitch_stats.doubles AS _pitch_doubles,
                pitch_stats.er AS _pitch_er,
                pitch_stats.wildPitches AS _pitch_wildPitches,
                
                pitch_stats.flyBalls AS _pitch_flyBalls,
                pitch_stats.flyOuts AS _pitch_flyOuts,
                
                pitch_stats.groundBalls AS _pitch_groundBalls,
                pitch_stats.groundOuts AS _pitch_groundOuts,
                pitch_stats.hbp AS _pitch_hbp,
                pitch_stats.homeRuns AS _pitch_homeRuns,
                pitch_stats.lineDrives AS _pitch_lineDrives,
                pitch_stats.lineOuts AS _pitch_lineOuts,
        
                pitch_stats.losses AS _pitch_losses,
                pitch_stats.outs AS _pitch_outs,
                pitch_stats.runs AS _pitch_runs,
                pitch_stats.saves AS _pitch_saves,
                pitch_stats.sho AS _pitch_sho,
                
                pitch_stats.singles AS _pitch_singles,
                pitch_stats.so AS _pitch_so,
                pitch_stats.starts AS _pitch_starts,
        
                pitch_stats.triples AS _pitch_triples,
                pitch_stats.wins AS _pitch_wins,
                pitch_stats.wpa AS _pitch_wpa,
                pitch_stats.experience AS _pitch_experience,
                pitch_stats.teamWins AS _pitch_teamWins,
                pitch_stats.teamLosses AS _pitch_teamLosses,
        
                pitch_stats.balls AS _pitch_balls,
                pitch_stats.strikes AS _pitch_strikes,
                pitch_stats.fouls AS _pitch_fouls,
                pitch_stats.pitches AS _pitch_pitches,
        
                pitch_stats.swings AS _pitch_swings,
                pitch_stats.swingAtBalls AS _pitch_swingAtBalls,
                pitch_stats.swingAtStrikes AS _pitch_swingAtStrikes,
        
                
                pitch_stats.inZone AS _pitch_inZone,
                pitch_stats.inZoneContact AS _pitch_inZoneContact,
                pitch_stats.outZoneContact AS _pitch_outZoneContact


            FROM player p
            
            LEFT JOIN (
                SELECT 
                playerId,
                COUNT(*) games,
                ${HIT_SUM_QUERY_FIELDS}
                FROM game_hit_result

                GROUP BY playerId
            ) AS hit_stats ON p._id = hit_stats.playerId

            LEFT JOIN (
                SELECT
                    playerId,
                    COUNT(*) AS games,
                    ${PITCH_SUM_QUERY_FIELDS}
                FROM game_pitch_result
                GROUP BY playerId
            ) AS pitch_stats ON p._id = pitch_stats.playerId

            LEFT JOIN team t ON p.teamId = t._id
            LEFT JOIN city c on t.cityId = c._id
            where p._id in (:playerIds)
            ORDER BY FIELD(p._id, :playerIds)

        `, Object.assign(queryOptions, options))

        return queryResults



    }

    async getLeagueAverageHitterRatings(league:League, season:Season, options?:any) : Promise<HittingRatings> {

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
				AVG(pls.overallRating) overallRating,
                AVG(pls.age) age,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.arm')) arm,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.defense')) defense,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.speed')) speed,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.steals')) steals,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.vsR.plateDiscipline')) r_plateDiscipline,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.vsR.contact')) r_contact,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.vsR.gapPower')) r_gapPower,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.vsR.homerunPower')) r_homerunPower,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.vsL.plateDiscipline')) l_plateDiscipline,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.vsL.contact')) l_contact,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.vsL.gapPower')) l_gapPower,
                AVG(JSON_EXTRACT(pls.hittingRatings, '$.vsL.homerunPower')) l_homerunPower
            FROM player_league_season pls
            INNER join player p on p._id = pls.playerId
            WHERE
               pls.primaryPosition != "P" AND pls.leagueId = :leagueId AND pls.seasonId = :seasonId
        `, Object.assign(queryOptions, options))

        let qr = queryResults[0]

        return {
            defense: qr.defense,
            arm: qr.arm,
            speed: qr.speed,
            steals: qr.steals,

            vsR: {
                plateDiscipline: qr.r_plateDiscipline,
                contact: qr.r_contact,
                gapPower: qr.r_gapPower,
                homerunPower: qr.r_homerunPower 
            },

            vsL: {
                plateDiscipline: qr.l_plateDiscipline,
                contact: qr.l_contact,
                gapPower: qr.l_gapPower,
                homerunPower: qr.l_homerunPower 
            }
        }



    }

    async getLeagueAveragePitcherRatings(league:League, season:Season, options?:any) : Promise<PitchRatings> {

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
				AVG(pls.overallRating) overallRating,
                AVG(pls.age) age,
                AVG(JSON_EXTRACT(pls.pitchRatings, '$.power')) power,
                AVG(JSON_EXTRACT(pls.pitchRatings, '$.vsR.control')) r_control,
                AVG(JSON_EXTRACT(pls.pitchRatings, '$.vsR.movement')) r_movement,
				AVG(JSON_EXTRACT(pls.pitchRatings, '$.vsL.control')) l_control,
                AVG(JSON_EXTRACT(pls.pitchRatings, '$.vsL.movement')) l_movement
            FROM player_league_season pls
            INNER join player p on p._id = pls.playerId
            WHERE
               pls.primaryPosition = "P" AND pls.leagueId = :leagueId AND pls.seasonId = :seasonId
        `, Object.assign(queryOptions, options))

        let qr = queryResults[0]


        return {
            power: qr.power,

            vsR: {
                control: qr.r_control,
                movement: qr.r_movement
            },

            vsL: {
                control: qr.l_control,
                movement: qr.l_movement
            }
        }


    }

    async getFreeAgentsAfterSeason(season:Season, options?:any) : Promise<PlayerFinalContract[]> {
        
        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacment: {
                startDate: season.startDate,
                endDate: season.endDate
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p._id, 
                JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(p.contract, '$.years'), '$[last]'), '$.complete') as contractComplete,
                JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(p.contract, '$.years'), '$[last]'), '$.startDate') as startDate,
                JSON_EXTRACT(JSON_EXTRACT(JSON_EXTRACT(p.contract, '$.years'), '$[last]'), '$.endDate') as endDate
			FROM player as p
            WHERE p.isRetired = 0 AND startDate = :startDate AND endDate = :endDate
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async getPurgeable(options?: any) : Promise<Player[]> {

        let s = await this.sequelize()


        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p._id
			FROM player as p
            WHERE p.overallRating = 40 AND p.age > 20
        `, Object.assign(queryOptions, options))

        return this.getByIds(queryResults.map( qr => qr._id), options)


    }

}




export {
    PlayerRepositoryNodeImpl
}