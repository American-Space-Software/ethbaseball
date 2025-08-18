import {  inject, injectable } from "inversify"

import { LadderChallenge } from "../../dto/ladder-challenge.js"
import { LadderChallengeRepository } from "../ladder-challenge-repository.js"
import { Team } from "../../dto/team.js"
import { Op, QueryTypes } from "sequelize"


@injectable()
class LadderChallengeRepositoryNodeImpl implements LadderChallengeRepository {

    @inject("sequelize")
    private sequelize:Function

    async get(id:string, options?:any): Promise<LadderChallenge> {
        return LadderChallenge.findByPk(id, options)
    }

    async put(ladderChallenge:LadderChallenge, options?:any): Promise<LadderChallenge> {

        await ladderChallenge.save(options)
        return ladderChallenge

    }

    // async getOpenByTeam(team:Team, options?:any): Promise<LadderChallenge[]> {

    //     let queryOptions = {
    //         where: {
    //             [Op.and]: [
    //                 [Op.or]: [{ toId: team._id }, { fromId: team._id }],

    //             ]
    //             gameId: null
    //         },
    //         order: [['dateCreated', 'desc']]
    //     }

    //     return LadderChallenge.findAll(Object.assign(queryOptions, options))

    // }


    async getSentByTeam(team:Team, options?:any): Promise<LadderChallenge[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            model: LadderChallenge,
            mapToModel: true,
            replacements: {
                teamId: team._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                lc.* FROM league_challenge as lc 
            WHERE lc.fromId = :teamId AND lc.gameId is null 
        `, Object.assign(queryOptions, options))

        return queryResults

    }

    async getReceivedByTeam(team:Team, options?:any): Promise<LadderChallenge[]> {

        let s = await this.sequelize()

        let queryOptions = {
            type: QueryTypes.RAW,
            plain: false,
            model: LadderChallenge,
            mapToModel: true,
            replacements: {
                teamId: team._id
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT  
                lc.* FROM league_challenge as lc 
            WHERE lc.toId = :teamId AND lc.gameId is null 
        `, Object.assign(queryOptions, options))

        return queryResults

    }

}


export {
    LadderChallengeRepositoryNodeImpl
}