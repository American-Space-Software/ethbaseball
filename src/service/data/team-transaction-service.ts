import { inject, injectable } from "inversify";


import { TradeRequestRepository } from "../../repository/trade-request-repository.js";
import { TradeRequest, TradeRequestPackage } from "../../dto/trade-request.js";
import { Team } from "../../dto/team.js";
import { Season } from "../../dto/season.js";
import { ContractType, TradeRequestStatus } from "../enums.js";
import { PlayerLeagueSeasonService } from "./player-league-season-service.js";
import { PlayerLeagueSeason } from "../../dto/player-league-season.js";
import { Player } from "../../dto/player.js";
import { League } from "../../dto/league.js";
import { TeamLeagueSeason } from "../../dto/team-league-season.js";
import { TeamLeagueSeasonService } from "./team-league-season-service.js";
import { Position } from "../../baseball-sim-engine/service/enums.js";
import { LineupService } from "../lineup-service.js";
import { TeamService } from "./team-service.js";
import { OffchainEventService } from "./offchain-event-service.js";
import { SeasonService } from "./season-service.js";
import { TeamQueueService } from "./team-queue-service.js";
import { User } from "../../dto/user.js";
import { PlayerService } from "./player-service.js";
import { v4 as uuidv4 } from 'uuid';
import { StatService } from "../stat-service.js";


@injectable()
class TeamTransactionService {

    @inject("TradeRequestRepository")
    private tradeRequestRepository:TradeRequestRepository

    constructor(
        private playerLeagueSeasonService:PlayerLeagueSeasonService,
        private teamLeagueSeasonService:TeamLeagueSeasonService,
        private lineupService:LineupService,
        private teamService:TeamService,
        private offchainEventService:OffchainEventService,
        private seasonService:SeasonService,
        private teamQueueService:TeamQueueService,
        private playerService:PlayerService,
        private statService:StatService
    ) {}

    async get(_id:string, options?:any) : Promise<TradeRequest> {
        return this.tradeRequestRepository.get(_id, options)
    }

    async put(tr:TradeRequest, options?:any) : Promise<TradeRequest> {
        return this.tradeRequestRepository.put(tr, options)
    }

    async signFreeAgent(user:User, player:Player, team:Team, date:Date, offChainEventTransactionId:string, options?:any) {

        let season:Season = await this.seasonService.getMostRecent(options)
        
        let pls:PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)
        
        if (pls.teamId) {
            throw new Error("Player is rostered.")
        }
        
        let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)
        let tlsPlain = tls.get({ plain: true })

        //Must be team owner
        if (user._id != team.userId) {
            throw new Error("Not authorized.")
        }

        //Must not be queued.
        let isQueued = await this.teamQueueService.isTeamQueued(team, options)

        if (isQueued) {
            throw new Error("Team is queued for a game. Cannot sign player.")
        }

        //Make sure the roster has space for a player at this position
        let currentPLSS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)

        let requiredPositions:Position[] = this.teamService.listRequiredRosterSpots(currentPLSS)

        if (!requiredPositions.includes(pls.primaryPosition)) {
            throw new Error(`Your roster does not have space for a ${pls.primaryPosition}. Drop your current ${pls.primaryPosition} to make room.`)
        }

        //Make sure the team has enough budget to sign this player
        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id, options)

        let askingPrice = this.playerService.getAskingPrice(pls)

        if (BigInt(diamondBalance) < BigInt(askingPrice)) {
            throw new Error(`Team does not have enough diamonds to sign this player.`)
        }

        


        //Update team. Add to lineup/rotation.

        if (player.primaryPosition == Position.PITCHER) {
            let spot = this.lineupService.getFirstAvailableRotationSpot(tls.lineups[0])
            this.lineupService.rotationAdd(tls.lineups[0], player, spot)
        } else {
            let spot = this.lineupService.getFirstAvailableOrderSpot(tls.lineups[0])
            this.lineupService.lineupAdd(tls.lineups[0], player, spot)
        }


        //End current PLS
        pls.startDate = date

        await this.playerLeagueSeasonService.put(pls, options)

        //Create new PLS
        let nextPLS = new PlayerLeagueSeason()
        nextPLS.playerId = pls.playerId
        nextPLS.seasonId = season._id,
        nextPLS.leagueId = tlsPlain.league._id,
        nextPLS.teamId = team._id
        nextPLS.seasonIndex = pls.seasonIndex + 1
        nextPLS.primaryPosition = pls.primaryPosition
        nextPLS.overallRating = pls.overallRating
        nextPLS.hittingRatings = pls.hittingRatings
        nextPLS.pitchRatings = pls.pitchRatings

        nextPLS.potentialOverallRating = pls.potentialOverallRating
        nextPLS.potentialHittingRatings = pls.potentialHittingRatings
        nextPLS.potentialPitchRatings = pls.potentialPitchRatings

        nextPLS.startDate = date
        nextPLS.endDate = season.endDate
        nextPLS.age = player.age

        nextPLS.stats = {
            //@ts-ignore
            hitting: this.statService.mergeHitResultsToStatLine({}, {}),
            //@ts-ignore
            pitching: this.statService.mergePitchResultsToStatLine({}, {})
        }

        await this.playerLeagueSeasonService.put(nextPLS, options)


        //Set lineup validity
        let currentTeamPLSS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)
        this.teamService.setLineupValidityAllowTiredStarters(team, tls, currentTeamPLSS.map( pls => pls.get({ plain: true})))

        tls.changed("lineups", true)
        tls.changed("hasValidLineup", true)


        //sign the player
        await this.offchainEventService.createFreeAgentTransferEvent(team._id, player._id, offChainEventTransactionId, options)

        //transfer diamonds
        await this.offchainEventService.createTeamBurnEvent(team._id, askingPrice, offChainEventTransactionId, options)

        await this.teamLeagueSeasonService.put(tls, options)


    }   

    async dropPlayer(user:User, player:Player, date:Date, options?:any) {

        let season:Season = await this.seasonService.getMostRecent(options)
          
        let pls:PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)
        
        if (!pls.teamId) {
            throw new Error("Player is not rostered.")
        }
        
        let team:Team = await this.teamService.get(pls.teamId, options)
        
        //Must be team owner
        if (user._id != team.userId) {
            throw new Error ("Not authorized.")
        }

        //Must not be queued.
        let isQueued = await this.teamQueueService.isTeamQueued(team, options)

        if (isQueued) {
            throw new Error("Team is queued for a game. Cannot drop player.")
        }

        //Team must have at least the minimum player salary in their balance. Otherwise they are stuck.
        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id, options)

        let minimumPlayerSalary =this.playerService.getFreeAgentSalary(1, 50, 365)

        if (BigInt(diamondBalance) < BigInt(minimumPlayerSalary)) {
            throw new Error(`Team does not have enough diamonds to drop this player.`)
        }


        //Update team. Remove from lineup and rotation.
        let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

        // let tlsPlain:TeamLeagueSeason = tls.get({ plain: true })

        this.lineupService.lineupRemove(tls.lineups[0], player._id)
        this.lineupService.rotationRemove(tls.lineups[0], player._id)

        tls.lineups[0].valid = false
        tls.hasValidLineup = false

        tls.changed("lineups", true)
        tls.changed("hasValidLineup", true)

        //End current PLS
        pls.endDate = date

        await this.playerLeagueSeasonService.put(pls, options)

        //Create new PLS
        let nextPLS = new PlayerLeagueSeason()
        nextPLS.playerId = pls.playerId
        nextPLS.seasonId = season._id
        nextPLS.seasonIndex = pls.seasonIndex + 1
        nextPLS.primaryPosition = pls.primaryPosition
        nextPLS.overallRating = pls.overallRating
        nextPLS.hittingRatings = pls.hittingRatings
        nextPLS.pitchRatings = pls.pitchRatings
        nextPLS.potentialOverallRating = pls.potentialOverallRating
        nextPLS.potentialHittingRatings = pls.potentialHittingRatings
        nextPLS.potentialPitchRatings = pls.potentialPitchRatings
        nextPLS.startDate = date
        nextPLS.endDate = season.endDate
        nextPLS.age = player.age

        nextPLS.stats = {
            //@ts-ignore
            hitting: this.statService.mergeHitResultsToStatLine({}, {}),
            //@ts-ignore
            pitching: this.statService.mergePitchResultsToStatLine({}, {})
        }

        await this.playerLeagueSeasonService.put(nextPLS, options)

        //drop the player
        await this.offchainEventService.createPlayerDropTransferEvent(team._id, player._id, uuidv4(), options)


        await this.teamService.put(team, options)
        await this.teamLeagueSeasonService.put(tls, options)


    }

    async sendTradeRequest(fromTeam:Team, toTeam:Team, fromPackage:TradeRequestPackage, toPackage:TradeRequestPackage, options?:any): Promise<TradeRequest> {

        let tradeRequest:TradeRequest = Object.assign(new TradeRequest(), {
            fromTeamId: fromTeam._id,
            toTeamId: toTeam._id,
            fromPackage: fromPackage,
            toPackage: toPackage,
            status: TradeRequestStatus.PENDING
        })

        await this.put(tradeRequest, options)

        return tradeRequest

    }

    async acceptTradeRequest(tradeRequest:TradeRequest, options?:any): Promise<TradeRequest> {
        return  
    }

    async rejectTradeRequest(tradeRequest:TradeRequest, options?:any): Promise<TradeRequest> {
        return
    }

    async cancelTradeRequest(tradeRequest:TradeRequest, options?:any): Promise<TradeRequest> {
        return
    }

    async processAcceptedTradeRequest(tradeRequest:TradeRequest, season:Season, options?:any): Promise<TradeRequest> {
        return
    }  


}


export {
    TeamTransactionService
}