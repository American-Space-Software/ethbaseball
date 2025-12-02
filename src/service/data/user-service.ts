import { inject, injectable } from "inversify";
import { User } from "../../dto/user.js";
import { UserRepository } from "../../repository/user-repository.js";
import { OwnerService } from "./owner-service.js";
import { Owner } from "../../dto/owner.js";
import { TeamService } from "./team-service.js";
import { Season } from "../../dto/season.js";
import { Team } from "../../dto/team.js";
import { TeamLeagueSeasonService } from "./team-league-season-service.js";
import { GameService } from "./game-service.js";
import { Game } from "../../dto/game.js";
import { DiamondMintPassService } from "./diamond-mint-pass-service.js";
import { OffchainEventService } from "../data/offchain-event-service.js";
import { ContractType } from "../enums.js";



@injectable()
class UserService {

    @inject("UserRepository")
    private userRepository:UserRepository
    
    constructor(
        private ownerService:OwnerService,
        private teamService:TeamService,
        private gameService:GameService,
        private teamLeagueSeasonService:TeamLeagueSeasonService,
        private diamondMintPassService:DiamondMintPassService,
        private offchainEventService:OffchainEventService,
        @inject("getDiamondsAddress") private getDiamondsAddress:Function
    ) {}

    async get(_id:string, options?:any) : Promise<User> {
        return this.userRepository.get(_id, options)
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

    async getAuthInfo(user:User) {

        let teams:Team[]  = await this.teamService.getByUser(user)

        let authInfo:any = { 
          _id: user._id, 
          discordUsername: user.discordProfile?.username, 
          discordId: user.discordId,
          address: user.address, 
          teamIds: teams.map( t => {  return { _id: t._id} })
        }
    
        if (user.address) {

          let owner:Owner = await this.ownerService.get(user.address)
          authInfo.diamondBalance = owner?.diamondBalance || "0"

          if (owner) {
            authInfo.offChainDiamondBalance = await this.offchainEventService.getBalanceForOwner(ContractType.DIAMONDS, owner)
            authInfo.diamondMintPasses = await this.diamondMintPassService.getUnmintedByAddress(owner._id)
          }
        }
        

        return authInfo
    }

    async getViewModel(user:User, season:Season) {

        let vm:any = {
        }

        let teams:Team[] = await this.teamService.getByUser(user)
        let team = teams[0]

        if (team) {

            let tls = await this.teamLeagueSeasonService.getByTeamSeason(team, season)

            let tlsPlain = tls.get({ plain: true })
            vm.team = this.teamService.getTeamStandingsViewModel(tlsPlain, 1)
            vm.team.diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)

            //Get games for teams
            let games:Game[] = await this.gameService.getByTeam(team, { limit: 10 } )
            vm.games = games.map( g => this.gameService.getGameSummaryViewModel(g))

        }



        return vm
    
    }

    // async getOwnerViewModel(owner:Owner, season:Season) : Promise<any> {

    //     let tlss = await this.teamLeagueSeasonService.listByOwnerAndSeason(owner, season)

    //     let teamVms = []

    //     let index = 0

    //     for (let tls of tlss) {
    //         let tlsPlain = tls.get({ plain: true })
    //         teamVms.push(this.teamService.getTeamStandingsViewModel(tlsPlain, index + 1))

    //         index++
    //     }

    //     return {
    //         teams: teamVms
    //     }
    
    // }


}




export {
    UserService
}