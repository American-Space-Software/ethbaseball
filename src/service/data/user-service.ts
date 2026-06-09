import { inject, injectable } from "inversify";
import { User } from "../../dto/user.js";
import { UserRepository } from "../../repository/user-repository.js";
import { TeamService } from "./team-service.js";
import { Season } from "../../dto/season.js";
import { Team } from "../../dto/team.js";
import { TeamLeagueSeasonService } from "./team-league-season-service.js";
import { DiamondMintPassService } from "./diamond-mint-pass-service.js";
import { OffchainEventService } from "../data/offchain-event-service.js";
import { ContractType, SeasonInfo } from "../enums.js";
import dayjs from "dayjs";
import { SeasonService } from "./season-service.js";

import { TeamLeagueSeason } from "../../dto/team-league-season.js";
import { v4 as uuidv4 } from 'uuid';
import { ethers } from "ethers";
import { PlayerLeagueSeasonService } from "./player-league-season-service.js";
import { Position } from "../../baseball-sim-engine/index.js";
import { TeamMarketOfferService } from "./team-market-offer-service.js";


@injectable()
class UserService {

    @inject("UserRepository")
    private userRepository:UserRepository
    
    
    constructor(
        private seasonService:SeasonService,
        private teamService:TeamService,
        private teamLeagueSeasonService:TeamLeagueSeasonService,
        private diamondMintPassService:DiamondMintPassService,
        private offchainEventService:OffchainEventService,
        private playerLeagueSeasonService:PlayerLeagueSeasonService,
        private teamMarketOfferService:TeamMarketOfferService
    ) {}

    async get(_id:string, options?:any) : Promise<User> {
        return this.userRepository.get(_id, options)
    }

    
    async getByIds(ids: string[], options?: any): Promise<User[]> {
        return this.userRepository.getByIds(ids, options)
    }

    async put(user:User, options?:any) : Promise<void> {
        return this.userRepository.put(user, options)
    }

    async delete(user:User, options?:any) : Promise<void> {
        return this.userRepository.delete(user, options)
    }

    async getByAddress(address:string, options?:any) : Promise<User> {
        return this.userRepository.getByAddress(address, options)
    }

    async getByDiscordId(discordId:string, options?:any) : Promise<User> {
        return this.userRepository.getByDiscordId(discordId, options)
    }

    async getAuthInfo(user:User, season:Season) {

        let teams:Team[]  = await this.teamService.getByUser(user)
        let primaryTeam = teams[0]

        let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(primaryTeam, season)


        let authInfo:any = { 
          _id: user._id, 
          discordUsername: user.discordProfile?.global_name, 
          discordId: user.discordId,
          address: user.address, 
          teams: teams.map(t => ({ _id: t._id, name: t.name })),
          leagueId: tls?.leagueId,
        }
    
        if (user.address) {
            authInfo.diamondMintPasses = await this.diamondMintPassService.getUnmintedByUser(user)
        }
        
        if (primaryTeam) {
            authInfo.offChainDiamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, primaryTeam._id)
        }


        return authInfo
    }

    async getViewModel(currentDate:Date, user:User, season:Season) {

        let vm:any = {}

        let teams:Team[] = await this.teamService.getByUser(user)
        let team = teams[0]

        vm.teamInfo = await this.teamService.getTeamViewModel(team, season, user)

        vm.teamInfo.team.diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)
        vm.teamInfo.team.diamondMintPasses = await this.diamondMintPassService.getUnmintedByUser(user)
        
        let inactivePlss = await this.playerLeagueSeasonService.getMostRecentInactiveByUserSeason(user, season)
        let inactivePlainPlss = inactivePlss.map(pls => pls.get({ plain: true }))
        
        let inactivePlainPitcherPlss = inactivePlainPlss.filter(pls => pls.player.primaryPosition == Position.PITCHER)
        let inactivePlainHitterPlss = inactivePlainPlss.filter(pls => pls.player.primaryPosition != Position.PITCHER)

        vm.inactivePitchers = inactivePlainPitcherPlss.map(pls => this.teamService.translatePLSToPlayerRowViewModel(pls.player, pls, false))
        vm.inactiveHitters = inactivePlainHitterPlss.map(pls => this.teamService.translatePLSToPlayerRowViewModel(pls.player, pls, false))

        let seasonInfo:SeasonInfo = this.seasonService.getSeasonInfo(season, currentDate)

        let gamesPlayed = vm.teamInfo.team.overallRecord.wins + vm.teamInfo.team.overallRecord.losses 

        if (vm.teamInfo?.inProgressGame?._id != undefined) {
            gamesPlayed++
        }


        vm.season = {
            _id: season._id,
            startDate: season.startDate,
            endDate: season.endDate,
            dayNumber: seasonInfo.dayNumber,
            daysRemaining: seasonInfo.daysRemaining,
            totalDays: seasonInfo.totalDays,
            universeDate: dayjs(currentDate).format("YYYY-MM-DD"),

            team: {
                gamesPlayed: gamesPlayed
            }
        }
        



        return vm
    
    }

    async getOrCreateBotUser(options?:any): Promise<User> {

        let existingUser:User = await this.getByAddress(ethers.ZeroAddress, options)

        if (existingUser) {
            return existingUser
        }

        let user:User = new User()

        user._id = uuidv4()
        user.address = ethers.ZeroAddress
        user.discordId = undefined
        user.discordAccessToken = undefined
        user.discordRefreshToken = undefined
        user.discordProfile = undefined

        await this.put(user, options)

        return user

    }

}




export {
    UserService
}