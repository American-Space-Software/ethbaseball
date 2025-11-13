import { inject, injectable } from "inversify";

import { TeamMintPass } from "../dto/team-mint-pass.js";
import { TeamMintPassRepository } from "../repository/team-mint-pass-repository.js";
import dayjs from "dayjs";
import random from 'crypto-random-bigint';



@injectable()
class TeamMintPassService {

    @inject("TeamMintPassRepository")
    private teamMintPassRepository:TeamMintPassRepository
    
    constructor(
    ) {}

    async delete(dmp:TeamMintPass, options?:any): Promise<void> {
        return this.teamMintPassRepository.delete(dmp, options)
    }

    async getByAddressAndTeamId(address:string, teamId:string, options?:any): Promise<TeamMintPass[]> {
        return this.teamMintPassRepository.getByAddressAndTeamId(address, teamId, options)
    }

    async generateTeamMintPass(to:string, tokenId:number, ethCost:string, totalDiamonds:string, options?:any): Promise<TeamMintPass> {

        let expires = dayjs(new Date(new Date().toUTCString())).add(1, 'year').toDate().getTime() / 1000

        let teamMintPass = new TeamMintPass()

        Object.assign(teamMintPass, {
            _id: random(256).toString(),
            to:to,
            tokenId: tokenId,
            ethCost: ethCost,
            totalDiamonds:totalDiamonds,
            expires: expires
        })

        await this.teamMintPassRepository.put(teamMintPass, options)

        return teamMintPass
    }


    async get(id:number, options?:any): Promise<TeamMintPass> {
        return this.teamMintPassRepository.get(id, options)
    }

    async put(dmp:TeamMintPass, options?:any) : Promise<TeamMintPass> {
        return this.teamMintPassRepository.put(dmp, options)
    }

    async getByTeamId(teamId:string, options?:any): Promise<TeamMintPass[]> {
        return this.teamMintPassRepository.getByTeamId(teamId, options)
    }

    async getByAddress(address:string, options?:any): Promise<TeamMintPass[]> {
        return this.teamMintPassRepository.getByAddress(address, options)
    }


}

export {
    TeamMintPassService
}