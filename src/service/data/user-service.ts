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
import { ContractType, SeasonInfo } from "../enums.js";
import dayjs from "dayjs";
import { SeasonService } from "./season-service.js";
import { LadderService } from "../ladder-service.js";
import { TeamQueueService } from "./team-queue-service.js";



@injectable()
class UserService {

    @inject("UserRepository")
    private userRepository:UserRepository
    
    constructor(
        private ladderService:LadderService,
        private seasonService:SeasonService,
        private ownerService:OwnerService,
        private teamService:TeamService,
        private gameService:GameService,
        private teamLeagueSeasonService:TeamLeagueSeasonService,
        private diamondMintPassService:DiamondMintPassService,
        private offchainEventService:OffchainEventService,
        private teamQueueService:TeamQueueService,
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

    async getViewModel(currentDate:Date, user:User, season:Season) {

        let vm:any = {}

        let teams:Team[] = await this.teamService.getByUser(user)
        let team = teams[0]

        let tls = await this.teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })
        vm.team = this.teamService.getTeamStandingsViewModel(tlsPlain, 1)
        vm.team.diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)

        //Get games for teams
        let games:Game[] = await this.gameService.getRecentByTeam(team, { limit: 10 } )

        vm.completedGames = games?.filter( g => g.isFinished)?.map( g => this.gameService.getGameSummaryViewModel(g))
        vm.inProgressGame = games?.find( g => !g.isFinished)

        let events = await this.offchainEventService.getByTeamId(ContractType.DIAMONDS, team._id, { limit: 5, offset: 0})
        vm.offChainEvents = await this.offchainEventService.getOffChainEventViewModels(events, season)
        
        vm.team.yesterdaysRewards = vm.offChainEvents.events.find( e => e.source?.type == "reward" && e.source?.rewardType == "daily" && dayjs(e.source?.fromDate).format("YYYY-MM-DD") == dayjs(currentDate).subtract(1, 'day').format("YYYY-MM-DD"))?.amount || "0"

        
        if (season) {

            let seasonInfo:SeasonInfo = this.seasonService.getSeasonInfo(season, currentDate)

            let gamesPlayed = tls.overallRecord.wins + tls.overallRecord.losses 

            if (vm.inProgressGame?._id != undefined) {
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
                nextQueueDate: this.ladderService.getQueueForDate(currentDate),
                team: {
                    gamesPlayed: gamesPlayed,
                    teamCurrentDate: dayjs(games?.length ? games[0].gameDate : currentDate).format("YYYY-MM-DD"),
                    isQueued: await this.teamQueueService.isTeamQueued(team)
                },
                queuedTeams: await this.teamQueueService.count()
            }
            

        }


        return vm
    
    }



}




export {
    UserService
}