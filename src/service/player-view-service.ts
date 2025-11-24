import { inject, injectable } from "inversify"
import { Player } from "../dto/player.js"

import { ProcessedTransactionService, TransactionsViewModel } from "./data/processed-transaction-service.js"
import { PlayerService } from "./data/player-service.js"

import { ContractType, Handedness, HitResultGame, HitterStatLine, HittingRatings, PitcherStatLine, PitchRatings, PitchResultGame, PlayerPercentileRatings, Position } from "./enums.js"
import { Team } from "../dto/team.js"
import { TeamService } from "./data/team-service.js"
import { PlayerLeagueSeasonService } from "./data/player-league-season-service.js"
import { PlayerLeagueSeason } from "../dto/player-league-season.js"
import { TeamLeagueSeason } from "../dto/team-league-season.js"
import { TeamLeagueSeasonService } from "./data/team-league-season-service.js"
import { SeasonService } from "./data/season-service.js"
import { Season } from "../dto/season.js"
import { ethers } from "ethers"
import { GameService } from "./data/game-service.js"
import dayjs from "dayjs"
import { OffchainEventService } from "./data/offchain-event-service.js"
import { GameHitResultRepository } from "../repository/game-hit-result-repository.js"
import { GamePitchResultRepository } from "../repository/game-pitch-result-repository.js"



@injectable()
class PlayerViewService {

    @inject("GameHitResultRepository")
    private gameHitResultRepository: GameHitResultRepository

    @inject("GamePitchResultRepository")
    private gamePitchResultRepository: GamePitchResultRepository


    constructor(
        private playerService:PlayerService,
        private seasonService:SeasonService,
        private teamService:TeamService,
        private gameService:GameService,
        private offchainEventService:OffchainEventService,
        private teamLeagueSeasonService:TeamLeagueSeasonService,
        private playerLeagueSeasonService:PlayerLeagueSeasonService,
    ) { }

    async getPlayerViewModel(_id: string, season:Season): Promise<PlayerViewModel> {

        let player: Player = await this.playerService.get(_id)
        
        let plsList:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getByPlayer(player)

        
        // let pls
        let currentPls

        if (plsList?.length > 0) {
            let thisSeasonPls = plsList.filter( pls => pls.seasonId == season._id)
            currentPls = thisSeasonPls[thisSeasonPls.length - 1]
        }

        let hitterGameLog = await this.gameHitResultRepository.getByPlayer(player._id, { limit: 10 } )
        let pitcherGameLog = await this.gamePitchResultRepository.getStartsByPlayer(player._id, { limit: 10 } )

        let result:PlayerViewModel = {
            _id: player._id,
            displayRating: player.displayRating,
            isRetired: player.isRetired,
            askingPrice: currentPls?.askingPrice ? ethers.parseUnits(currentPls?.askingPrice.toString(), 'ether').toString() : undefined,
            team: currentPls?.team,
            hits: player.hits,
            age: player.age,
            throws: player.throws,
            zodiacSign: player.zodiacSign,
            primaryPosition: player.primaryPosition,
            fullName: `${player.firstName} ${player.lastName}`,
            displayName: `${player.firstName.substring(0, 1).toUpperCase()}. ${player.lastName}`,
            
            ownerId: player.ownerId,
            hittingRatings: player.hittingRatings,
            pitchRatings: player.pitchRatings,
            percentileRatings: player.percentileRatings,
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

        if (currentPls?.teamId) {

            let team:Team = await this.teamService.get(currentPls.teamId)
            let season:Season = await this.seasonService.get(currentPls.seasonId)
            let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season )

            let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)
            
            tls = tls.get({ plain: true })

            result.team = {
                name: tls.team?.name,
                cityName: tls.city?.name,
                _id: tls.team?._id,
                userId: tls.team.userId,
                diamondBalance: diamondBalance
            }

            // let gamesPerSeason = tls.financeSeason.totalGamesPlayed + tls.financeSeason.totalGamesRemaining
            // let gamesRemaining = tls.financeSeason.homeGamesRemaining + tls.financeSeason.awayGamesRemaining

            // result.dropCost = this.playerService.getCostToDrop(player, gamesPerSeason, gamesRemaining)

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
    hittingRatings:HittingRatings
    pitchRatings:PitchRatings
    percentileRatings:PlayerPercentileRatings
    askingPrice:string
    displayRating:number

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
    }

    dropCost?:string

    hitterGameLog
    pitcherGameLog

}


export {
    PlayerViewService
}