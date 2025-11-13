import {  injectable } from "inversify"
import { Op } from "sequelize"
import { TeamMintPassRepository } from "../team-mint-pass-repository.js"
import { TeamMintPass } from "../../dto/team-mint-pass.js"


@injectable()
class TeamMintPassRepositoryNodeImpl implements TeamMintPassRepository {


    async get(id:number, options?:any): Promise<TeamMintPass> {
        return TeamMintPass.findByPk(id, options)
    }

   
    async getByAddressAndTeamId(address:string, teamId:string, options?:any): Promise<TeamMintPass[]> {

        let queryOptions = {
            where: {
                [Op.and]: {
                    to: address,
                    teamId: teamId
                }
                
            },
            order: [['_id', 'DESC']]
        }

        return TeamMintPass.findAll(Object.assign(queryOptions, options))

    }


    async getByAddress(address:string, options?:any): Promise<TeamMintPass[]> {

        let queryOptions = {
            where: {
                to: address
            },
            order: [['_id', 'DESC']]
        }

        return TeamMintPass.findAll(Object.assign(queryOptions, options))

    }


    async getByTeamId(teamId:string, options?:any): Promise<TeamMintPass[]> {

        let queryOptions = {
            where: {
                teamId: teamId
            },
            order: [['_id', 'DESC']]
        }

        return TeamMintPass.findAll(Object.assign(queryOptions, options))

    }

    async put(dmp:TeamMintPass, options?:any): Promise<TeamMintPass> {
        return dmp.save(options)
    }

    async delete(dmp:TeamMintPass, options?:any): Promise<void> {
        return dmp.destroy(options)
    }

    async getUnsigned(options?:any): Promise<TeamMintPass[]> {

        let queryOptions = {
            where: {
                [Op.and]: {
                    r: null,
                    s: null,
                    v: null
                }
            },
            order: [['dateCreated', 'DESC']]
        }

        return TeamMintPass.findAll(Object.assign(queryOptions, options))

    }


}



export {
    TeamMintPassRepositoryNodeImpl
}