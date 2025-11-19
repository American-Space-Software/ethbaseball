import { inject, injectable } from "inversify"
import { PlayerRepository } from "../player-repository.js"
import { Player } from "../../dto/player.js"

import { Owner } from "../../dto/owner.js"
import { Op, QueryTypes } from "sequelize"

import dayjs from "dayjs"
import { HittingRatings, PitchRating, PitchRatings, PitchType, PlayerFinalContract, PlayerPercentileRatings, PlayerReport, Position } from "../../service/enums.js"
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
    private sequelize: Function

    async get(id: string, options?: any): Promise<Player> {

        let player: Player = await Player.findByPk(id, options)

        //Some way to make sequelize do this?
        if (player?.lastGamePlayed) {
            player.lastGamePlayed = dayjs(player.lastGamePlayed).toDate()
        }

        return player
    }

    async put(player: Player, options?: any): Promise<Player> {

        await player.save(options)
        return player

    }

    async putAll(players: Player[], options?: any): Promise<void> {
        for (let player of players) {
            await this.put(player, options)
        }
    }

    async delete(player: Player, options?: any) {
        return player.destroy(options)
    }

    async updateGameFields(players: Player[], options?: any) {

        let queryOptions = Object.assign({
            fields: ["_id", "overallRating", "displayRating", "hittingRatings", "pitchRatings", "percentileRatings", "careerStats", "firstName", "lastName", "primaryPosition", "zodiacSign", "pitchingProfile", "hittingProfile", "throws", "hits", "isRetired", "lastGamePlayed", "lastGamePitched",  "age", "personalityType"],
            updateOnDuplicate: ["_id", "overallRating", "displayRating", "hittingRatings", "pitchRatings", "percentileRatings", "careerStats", "lastGamePlayed", "lastGamePitched", "age"],
        }, options)

        let updatePlayers = players.map(p => {
            return {
                _id: p._id,
                overallRating: p.overallRating,
                displayRating: p.displayRating,
                hittingRatings: p.hittingRatings,
                pitchRatings: p.pitchRatings,
                careerStats: p.careerStats,
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
                percentileRatings: p.percentileRatings,
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

    async getByOwner(owner: Owner, options?: any): Promise<Player[]> {

        let queryOptions = {
            where: {
                ownerId: owner._id
            },
            order: [['lastName', 'ASC'], ['firstName', 'ASC']]
        }

        return Player.findAll(Object.assign(queryOptions, options))

    }

    async getMaxTokenId(options?: any): Promise<number> {

        let maxTokenId: number = await Player.max("_id", options)
        if (!maxTokenId) maxTokenId = 0

        return maxTokenId

    }

    async countByOwner(owner: Owner, options?: any): Promise<number> {

        let queryOptions = Object.assign({
            where: {
                ownerId: owner._id
            }
        }, options)


        let result = await Player.count(queryOptions)

        //@ts-ignore
        return result

    }

    async count(options?: any): Promise<number> {

        let queryOptions = Object.assign({
            where: {}
        }, options)

        let result = await Player.count(queryOptions)

        //@ts-ignore
        return result

    }

    async countActive(options?: any): Promise<number> {

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

    async getPitcherIds(options?: any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p._id FROM player as p 
            WHERE p.primaryPosition = "P"
            ORDER BY p.overallRating DESC
        `, Object.assign(queryOptions, options))

        return queryResults.map(i => i._id)

    }

    async getHitterIds(options?: any): Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                p._id FROM player as p 
            WHERE p.primaryPosition != "P"
            ORDER BY p.overallRating DESC
        `, Object.assign(queryOptions, options))

        return queryResults.map(i => i._id)

    }

    async getPitcherIdsByOwner(owner: Owner, options?: any): Promise<string[]> {

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

        return queryResults.map(i => i._id)

    }

    async getHitterIdsByOwner(owner: Owner, options?: any): Promise<string[]> {

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

        return queryResults.map(i => i._id)

    }

    async getFreeAgentPitcherIds(date: Date, options?: any): Promise<string[]> {

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

        return queryResults.map(i => i._id)

    }

    async getFreeAgentHitterIds(date: Date, options?: any): Promise<string[]> {

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

        return queryResults.map(i => i._id)

    }

    async getFreeAgentIdsByPositionAndSalary(position: Position, salary: bigint, date: Date, limit: number, offset: number, options?: any): Promise<string[]> {

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

        return queryResults.map(i => i._id)

    }

    async list(options?: any): Promise<Player[]> {


        let queryOptions = {
            order: [
                ['overallRating', 'desc']
            ]
        }

        return Player.findAll(Object.assign(queryOptions, options))

    }

    async listWithTeams(options?: any): Promise<any[]> {

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

    async listByOwnerWithTeams(owner: Owner, options?: any): Promise<any[]> {

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

    async getIds(options?: any): Promise<string[]> {

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

        return queryResults.map(i => i._id)

    }

    async getPlayerReport(options?: any): Promise<PlayerReport> {

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

    async getLatest(options?: any): Promise<Player> {

        let s = await this.sequelize()

        const maxIdToken = await Player.findOne({
            attributes: [[s.fn('max', s.col('_id')), 'max_id']],
            //@ts-ignore
        }, options)

        //@ts-ignore
        return this.get(maxIdToken?.get('max_id', options))
    }

    async clearAllTransactions(options?: any): Promise<void> {

        await Player.update({
            transactionsViewModel: { transactions: [], rowItemViewModels: {} }

        }, Object.assign({ where: {} }, options))

    }

    async getUpdatedLastGameSince(lastUpdated: Date, options?: any): Promise<Player[]> {

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


    async getLeagueAverageHitterRatings(league: League, season: Season, options?: any): Promise<HittingRatings> {

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

    async getLeagueAveragePitcherRatings(league: League, season: Season, options?: any): Promise<PitchRatings> {

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

    async getFreeAgentsAfterSeason(season: Season, options?: any): Promise<PlayerFinalContract[]> {

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

    // async getPurgeable(options?: any): Promise<Player[]> {

    //     let s = await this.sequelize()


    //     let queryOptions = {
    //         type: QueryTypes.RAW,
    //         plain: false,
    //         mapToModel: false
    //     }

    //     const [queryResults, metadata] = await s.query(`
    //         SELECT  
    //             p._id
	// 		FROM player as p
    //         WHERE p.overallRating = 40 AND p.age > 20
    //     `, Object.assign(queryOptions, options))

    //     return this.getByIds(queryResults.map(qr => qr._id), options)


    // }

    async getPlayerPercentileRatings(options?: any): Promise<PlayerPercentileRatings[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacment: {}
        }

        const [queryResults, metadata] = await s.query(`
            WITH RECURSIVE seq(n) AS (
                SELECT 0
                UNION ALL
                SELECT n + 1 FROM seq WHERE n < 64   -- supports up to 65 pitches per player; raise if needed
                ),
                base AS (
                SELECT
                    p._id AS player_id,
                    p.overallRating AS overall_n,

                    /* hitting (player.hittingRatings) */
                    CAST(p.hittingRatings->>"$.arm"                 AS DECIMAL(10,4)) AS arm_n,
                    CAST(p.hittingRatings->>"$.defense"             AS DECIMAL(10,4)) AS defense_n,
                    CAST(p.hittingRatings->>"$.speed"               AS DECIMAL(10,4)) AS speed_n,
                    CAST(p.hittingRatings->>"$.steals"              AS DECIMAL(10,4)) AS steals_n,

                    CAST(p.hittingRatings->>"$.vsR.plateDiscipline" AS DECIMAL(10,4)) AS r_plateDiscipline_n,
                    CAST(p.hittingRatings->>"$.vsR.contact"         AS DECIMAL(10,4)) AS r_contact_n,
                    CAST(p.hittingRatings->>"$.vsR.gapPower"        AS DECIMAL(10,4)) AS r_gapPower_n,
                    CAST(p.hittingRatings->>"$.vsR.homerunPower"    AS DECIMAL(10,4)) AS r_homerunPower_n,

                    CAST(p.hittingRatings->>"$.vsL.plateDiscipline" AS DECIMAL(10,4)) AS l_plateDiscipline_n,
                    CAST(p.hittingRatings->>"$.vsL.contact"         AS DECIMAL(10,4)) AS l_contact_n,
                    CAST(p.hittingRatings->>"$.vsL.gapPower"        AS DECIMAL(10,4)) AS l_gapPower_n,
                    CAST(p.hittingRatings->>"$.vsL.homerunPower"    AS DECIMAL(10,4)) AS l_homerunPower_n,

                    /* pitching (player_league_season.pitchRatings) */
                    CAST(pls.pitchRatings->>"$.power"               AS DECIMAL(10,4)) AS power_n,
                    CAST(pls.pitchRatings->>"$.vsR.control"         AS DECIMAL(10,4)) AS r_control_n,
                    CAST(pls.pitchRatings->>"$.vsR.movement"        AS DECIMAL(10,4)) AS r_movement_n,
                    CAST(pls.pitchRatings->>"$.vsL.control"         AS DECIMAL(10,4)) AS l_control_n,
                    CAST(pls.pitchRatings->>"$.vsL.movement"        AS DECIMAL(10,4)) AS l_movement_n,

                    /* keep full JSON for pitch array extraction */
                    pls.pitchRatings AS pitch_json
                FROM player p
                JOIN player_league_season pls
                    ON pls.playerId = p._id
                /* WHERE pls.seasonId = ? -- add filters if needed */
                ),

                /* explode pitchRatings.pitches -> one row per (player, pitchType) */
                pitches AS (
                SELECT
                    b.player_id,
                    JSON_UNQUOTE(JSON_EXTRACT(b.pitch_json, CONCAT('$.pitches[', s.n, '].type')))     AS pitchType,
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pitch_json, CONCAT('$.pitches[', s.n, '].rating'))) AS DECIMAL(10,4)) AS rating_n
                FROM base b
                JOIN seq s
                    ON s.n < JSON_LENGTH(b.pitch_json, '$.pitches')
                ),

                /* compute percentile per pitchType among non-NULL ratings */
                pitch_pct AS (
                SELECT
                    player_id,
                    pitchType,
                    ROUND(100 * CUME_DIST() OVER (
                    PARTITION BY pitchType, (rating_n IS NOT NULL)
                    ORDER BY rating_n
                    ), 1) AS rating_pct
                FROM pitches
                ),

                /* roll per-player pitch percentiles into a JSON map: {"FF": 82.1, "SC": 67.9, ...} */
                pitch_by_player AS (
                SELECT
                    player_id,
                    JSON_OBJECTAGG(pitchType, rating_pct) AS pitches_pct
                FROM pitch_pct
                GROUP BY player_id
                )

                SELECT
                b.player_id,

                /* overall */
                ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.overall_n IS NOT NULL) ORDER BY b.overall_n), 1) AS overallRating_pct,

                /* hitting percentiles */
                CASE WHEN b.arm_n IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.arm_n IS NOT NULL) ORDER BY b.arm_n), 1) END AS arm_pct,
                CASE WHEN b.defense_n IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.defense_n IS NOT NULL) ORDER BY b.defense_n), 1) END AS defense_pct,
                CASE WHEN b.speed_n IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.speed_n IS NOT NULL) ORDER BY b.speed_n), 1) END AS speed_pct,
                CASE WHEN b.steals_n IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.steals_n IS NOT NULL) ORDER BY b.steals_n), 1) END AS steals_pct,

                CASE WHEN b.r_plateDiscipline_n IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.r_plateDiscipline_n IS NOT NULL) ORDER BY b.r_plateDiscipline_n), 1) END AS r_plateDiscipline_pct,
                CASE WHEN b.r_contact_n          IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.r_contact_n          IS NOT NULL) ORDER BY b.r_contact_n),          1) END AS r_contact_pct,
                CASE WHEN b.r_gapPower_n         IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.r_gapPower_n         IS NOT NULL) ORDER BY b.r_gapPower_n),         1) END AS r_gapPower_pct,
                CASE WHEN b.r_homerunPower_n     IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.r_homerunPower_n     IS NOT NULL) ORDER BY b.r_homerunPower_n),     1) END AS r_homerunPower_pct,

                CASE WHEN b.l_plateDiscipline_n IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.l_plateDiscipline_n IS NOT NULL) ORDER BY b.l_plateDiscipline_n), 1) END AS l_plateDiscipline_pct,
                CASE WHEN b.l_contact_n          IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.l_contact_n          IS NOT NULL) ORDER BY b.l_contact_n),          1) END AS l_contact_pct,
                CASE WHEN b.l_gapPower_n         IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.l_gapPower_n         IS NOT NULL) ORDER BY b.l_gapPower_n),         1) END AS l_gapPower_pct,
                CASE WHEN b.l_homerunPower_n     IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.l_homerunPower_n     IS NOT NULL) ORDER BY b.l_homerunPower_n),     1) END AS l_homerunPower_pct,

                /* pitching percentiles */
                CASE WHEN b.power_n      IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.power_n      IS NOT NULL) ORDER BY b.power_n),      1) END AS power_pct,
                CASE WHEN b.r_control_n  IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.r_control_n  IS NOT NULL) ORDER BY b.r_control_n),  1) END AS r_control_pct,
                CASE WHEN b.r_movement_n IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.r_movement_n IS NOT NULL) ORDER BY b.r_movement_n), 1) END AS r_movement_pct,
                CASE WHEN b.l_control_n  IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.l_control_n  IS NOT NULL) ORDER BY b.l_control_n),  1) END AS l_control_pct,
                CASE WHEN b.l_movement_n IS NULL THEN NULL ELSE ROUND(100 * CUME_DIST() OVER (PARTITION BY (b.l_movement_n IS NOT NULL) ORDER BY b.l_movement_n), 1) END AS l_movement_pct,

                /* dynamic per-pitch percentile map */
                pbp.pitches_pct

                FROM base b
                LEFT JOIN pitch_by_player pbp USING (player_id);



        `, Object.assign(queryOptions, options))

        // Build a set of valid enum values (works for string enums; filters out numeric reverse-maps)
        const pitchTypeValues = new Set<string>(
            (Object.values(PitchType) as string[]).filter(v => typeof v === 'string')
        )

        // If your DB codes match enum values exactly, this is enough:
        const toPitchType = (code: string): PitchType | undefined =>
            pitchTypeValues.has(code) ? (code as PitchType) : undefined

        // If your DB codes differ from enum values, add a mapping here:
        // const codeToPitchType: Record<string, PitchType> = { FF: PitchType.FourSeam, SC: PitchType.Screwball, ... }
        // const toPitchType = (code: string): PitchType | undefined => codeToPitchType[code]

        // helpers
        const parseJsonObject = <T = Record<string, number> | null>(v: unknown): T | null => {
            if (v == null) return null
            if (typeof v === 'object') return v as T
            if (typeof v === 'string' && v.trim()) { try { return JSON.parse(v) as T } catch { return null } }
            return null
        }
        const num = (v: any): number | undefined => (v == null ? undefined : Number(v))
        const nonEmpty = <T extends object>(o: T): T | undefined => Object.values(o as any).some(v => v !== undefined) ? o : undefined

        // Convert {"FF": 82.1, "SC": 67.9} -> PitchRating[]
        const mapPitches = (m: Record<string, number> | null | undefined): PitchRating[] | undefined => {
            if (!m) return undefined
            const arr: PitchRating[] = []
            for (const [code, rating] of Object.entries(m)) {
                if (rating == null) continue
                const pt = toPitchType(code)
                if (pt) arr.push({ type: pt, rating: Number(rating) })
            }
            return arr.length ? arr : undefined
        }

        const mapRowToPlayerRatingPercentiles = (row: any): PlayerPercentileRatings => {
            const pitchesMap = parseJsonObject<Record<string, number>>(row.pitches_pct)

            const hittingVsR = nonEmpty({
                plateDiscipline: num(row.r_plateDiscipline_pct),
                contact: num(row.r_contact_pct),
                gapPower: num(row.r_gapPower_pct),
                homerunPower: num(row.r_homerunPower_pct),
            })
            const hittingVsL = nonEmpty({
                plateDiscipline: num(row.l_plateDiscipline_pct),
                contact: num(row.l_contact_pct),
                gapPower: num(row.l_gapPower_pct),
                homerunPower: num(row.l_homerunPower_pct),
            })
            const pitchVsR = nonEmpty({
                control: num(row.r_control_pct),
                movement: num(row.r_movement_pct),
            })
            const pitchVsL = nonEmpty({
                control: num(row.l_control_pct),
                movement: num(row.l_movement_pct),
            })

            const hittingRatings: HittingRatings = {
                defense: num(row.defense_pct),
                arm: num(row.arm_pct),
                speed: num(row.speed_pct),
                steals: num(row.steals_pct),
                ...(hittingVsR ? { vsR: hittingVsR } : {}),
                ...(hittingVsL ? { vsL: hittingVsL } : {}),
            }

            const pitchRatings: PitchRatings = {
                power: num(row.power_pct),
                ...(pitchVsR ? { vsR: pitchVsR } : {}),
                ...(pitchVsL ? { vsL: pitchVsL } : {}),
                pitches: mapPitches(pitchesMap),
            }

            return {
                _id: String(row.player_id),
                overallRating_pct: row.overallRating_pct ?? null,
                hittingRatings,
                pitchRatings,
            }
        }

        return queryResults.map(mapRowToPlayerRatingPercentiles)

    }

    async getPlayerIdsByGameDate(date:Date, options?:any) : Promise<string[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            mapToModel: false,
            replacements: {
                gameDate: dayjs(date).format("YYYY-MM-DD")
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                DISTINCT p._id
			FROM player as p
            INNER JOIN game_player gp on gp.playerId = p._id
            INNER JOIN game g on g._id = gp.gameId
            WHERE g.gameDate = :gameDate
        `, Object.assign(queryOptions, options))

        return queryResults.map( qr => qr._id)


    }

}




export {
    PlayerRepositoryNodeImpl
}