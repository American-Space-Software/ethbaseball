import { inject, injectable } from "inversify"
import { Player } from "../dto/player.js"

import { PlayerService } from "./data/player-service.js"

import { ContractType, } from "./enums.js"
import { Team } from "../dto/team.js"
import { TeamService } from "./data/team-service.js"
import { PlayerLeagueSeasonService } from "./data/player-league-season-service.js"
import { PlayerLeagueSeason } from "../dto/player-league-season.js"
import { TeamLeagueSeason } from "../dto/team-league-season.js"
import { TeamLeagueSeasonService } from "./data/team-league-season-service.js"
import { SeasonService } from "./data/season-service.js"
import { Season } from "../dto/season.js"
import { GameService } from "./data/game-service.js"
import { OffchainEventService } from "./data/offchain-event-service.js"
import { GameHitResultRepository } from "../repository/game-hit-result-repository.js"
import { GamePitchResultRepository } from "../repository/game-pitch-result-repository.js"
import { TeamQueueService } from "./data/team-queue-service.js"
import { LeagueService } from "./data/league-service.js"
import { Handedness, HitterStatLine, HittingRatings, PitcherStatLine, PitchRatings, Position }  from '../baseball-sim-engine/index.js';
import { UserService } from "./data/user-service.js"
import { User } from "../dto/user.js"
import { TeamMarketOfferService } from "./data/team-market-offer-service.js"
import { TeamMarketOffer } from "../dto/team-market-offer.js"



@injectable()
class PlayerViewService {

    @inject("GameHitResultRepository")
    private gameHitResultRepository: GameHitResultRepository

    @inject("GamePitchResultRepository")
    private gamePitchResultRepository: GamePitchResultRepository


    constructor(
        private teamQueueService:TeamQueueService,
        private playerService:PlayerService,
        private seasonService:SeasonService,
        private leagueSerivce:LeagueService,
        private teamService:TeamService,
        private gameService:GameService,
        private userService:UserService,
        private offchainEventService:OffchainEventService,
        private teamLeagueSeasonService:TeamLeagueSeasonService,
        private playerLeagueSeasonService:PlayerLeagueSeasonService,
        private teamMarketOfferService:TeamMarketOfferService
        
    ) { }

    async getPlayerViewModel(_id: string, season:Season): Promise<PlayerViewModel> {

        let player: Player = await this.playerService.get(_id)
        
        let plsList:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getByPlayer(player)

        
        let salesOffer:TeamMarketOffer

        // let pls
        let currentPls

        if (plsList?.length > 0) {
            let thisSeasonPls = plsList.filter( pls => pls.seasonId == season._id)
            currentPls = thisSeasonPls[thisSeasonPls.length - 1]
        }

        let hitterGameLog = await this.gameHitResultRepository.getByPlayer(player, { limit: 10 } )
        let pitcherGameLog = await this.gamePitchResultRepository.getStartsByPlayer(player._id, { limit: 10 } )

        let askingPrice 
        let minimumPlayerSalary = this.playerService.getFreeAgentSalary(1, 50, 365)

        if (!currentPls.userId) {
            askingPrice = this.playerService.getAskingPrice(currentPls )
        }
        
        let resultTeam:any

        if (currentPls.userId) {

            let user:User = await this.userService.get(currentPls.userId)
            let teams = await this.teamService.getByUser(user)
            let primaryTeam = teams[0]
            let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, primaryTeam._id)
            salesOffer = await this.teamMarketOfferService.getPendingSaleListingByPlayerId(player._id)

            if (currentPls?.teamId) {

                let team:Team = await this.teamService.get(currentPls.teamId)
                
                let season:Season = await this.seasonService.get(currentPls.seasonId)
                let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season )

                tls = tls.get({ plain: true })

                resultTeam = {
                    name: tls.team?.name,
                    cityName: tls.city?.name,
                    _id: tls.team?._id,
                    userId: tls.team.userId,
                    diamondBalance: diamondBalance,
                    isQueued: await this.teamQueueService.isTeamQueued(team)
                }

            } else {

                resultTeam = {
                    name: '',
                    cityName: '',
                    _id: '',
                    userId: currentPls.userId,
                    diamondBalance: diamondBalance,
                    isQueued: false
                }
            }

        }


        let result:PlayerViewModel = {
            _id: player._id,
            isRetired: player.isRetired,
            askingPrice: askingPrice,
            totalExperience: player.totalExperience,
            minimumPlayerSalary: minimumPlayerSalary,
            hits: player.hits,
            age: player.age,
            throws: player.throws,
            zodiacSign: player.zodiacSign,
            primaryPosition: player.primaryPosition,
            fullName: `${player.firstName} ${player.lastName}`,
            displayName: `${player.firstName.substring(0, 1).toUpperCase()}. ${player.lastName}`,
            team: resultTeam,
            ownerId: player.ownerId,

            salesOffer: salesOffer ? { 
                _id: salesOffer._id,
                diamondAmount: salesOffer.diamondAmount,
                buyerUserId: salesOffer.buyerUserId
            } : undefined,

            overallRating: player.overallRating,
            pitchRatings: player.pitchRatings,
            hittingRatings: player.hittingRatings,

            potentialOverallRating: player.potentialOverallRating,
            potentialPitchRatings: player.potentialPitchRatings,
            potentialHittingRatings: player.potentialHittingRatings,


            careerHitterStats: player.careerStats.hitting,
            careerPitcherStats: player.careerStats.pitching,
            careerSeasonsHitterStats: plsList.filter( p => p.teamId != undefined).map( p => {

                let plain = p.get({ plain: true})

                return Object.assign({ 
                    team: { _id: plain.team._id, name: plain.team.name, abbrev: plain.team.abbrev }, 
                    season: { _id: plain.season._id, startDate: plain.season.startDate},
                    age: plain.age,
                }, p.stats.hitting)

            }),
            careerSeasonsPitcherStats: plsList.filter( p => p.teamId != undefined).map( p => {

                let plain = p.get({ plain: true})

                return Object.assign({ 
                    team: { _id: plain.team._id, name: plain.team.name, abbrev: plain.team.abbrev }, 
                    season: { _id: plain.season._id, startDate: plain.season.startDate},
                    age: plain.age,
                }, p.stats.pitching)

            }),

            hitterGameLog: hitterGameLog,
            pitcherGameLog: pitcherGameLog
        }



        return result

    }
    

}


interface PlayerViewModel {
    _id:string
    age:number
    hits:Handedness
    throws:Handedness
    zodiacSign:string
    primaryPosition:Position
    isRetired:boolean
    fullName: string
    displayName: string
    ownerId:string

    totalExperience:string

    overallRating: number
    pitchRatings: PitchRatings
    hittingRatings: HittingRatings

    potentialOverallRating: number
    potentialPitchRatings: PitchRatings
    potentialHittingRatings: HittingRatings

    askingPrice:string
    minimumPlayerSalary:string
    salesOffer: {
        _id: string
        diamondAmount: string
        buyerUserId: string
    }

    careerHitterStats: HitterStatLine
    careerPitcherStats: PitcherStatLine

    careerSeasonsHitterStats:HitterStatLine[]
    careerSeasonsPitcherStats:PitcherStatLine[]

    team?: {
        _id?:string
        name?:string
        cityName?:string
        userId?:string

        diamondBalance:string
        isQueued:boolean
    }

    dropCost?:string

    hitterGameLog
    pitcherGameLog

}


export {
    PlayerViewService
}