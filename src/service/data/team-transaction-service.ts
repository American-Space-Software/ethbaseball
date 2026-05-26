import { inject, injectable } from "inversify";


import { TeamMarketOfferRepository } from "../../repository/team-market-offer-repository.js";
import { TeamMarketOffer, TeamMarketOfferPackage } from "../../dto/team-market-offer.js";
import { Team } from "../../dto/team.js";
import { Season } from "../../dto/season.js";
import { ContractType, TeamMarketOfferStatus } from "../enums.js";
import { PlayerLeagueSeasonService } from "./player-league-season-service.js";
import { PlayerLeagueSeason } from "../../dto/player-league-season.js";
import { Player } from "../../dto/player.js";
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

    @inject("TeamMarketOfferRepository")
    private teamMarketOfferRepository:TeamMarketOfferRepository

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

    async get(_id:string, options?:any) : Promise<TeamMarketOffer> {
        return this.teamMarketOfferRepository.get(_id, options)
    }

    async put(tmo:TeamMarketOffer, options?:any) : Promise<TeamMarketOffer> {
        return this.teamMarketOfferRepository.put(tmo, options)
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

        

        await this.movePlayerToTeam(player, pls, team, tls, season, date, options)


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

        if (user._id != team.userId) {
            throw new Error("Not authorized.")
        }

        let isQueued = await this.teamQueueService.isTeamQueued(team, options)

        if (isQueued) {
            throw new Error("Team is queued for a game. Cannot drop player.")
        }

        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id, options)

        let minimumPlayerSalary = this.playerService.getFreeAgentSalary(1, 50, 365)

        if (BigInt(diamondBalance) < BigInt(minimumPlayerSalary)) {
            throw new Error(`Team does not have enough diamonds to drop this player.`)
        }

        let pendingOffers:TeamMarketOffer[] = await this.teamMarketOfferRepository.listPendingByPlayerId(player._id, options)

        for (let pendingOffer of pendingOffers) {
            await this.cancelTeamMarketOffer(pendingOffer, options)
        }

        let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

        this.lineupService.lineupRemove(tls.lineups[0], player._id)
        this.lineupService.rotationRemove(tls.lineups[0], player._id)

        tls.lineups[0].valid = false
        tls.hasValidLineup = false

        tls.changed("lineups", true)
        tls.changed("hasValidLineup", true)

        await this.movePlayerToFreeAgency(player, pls, season, date, options)

        await this.offchainEventService.createPlayerDropTransferEvent(team._id, player._id, uuidv4(), options)

        await this.teamService.put(team, options)
        await this.teamLeagueSeasonService.put(tls, options)

    }

    async createTeamMarketOffer(buyerTeam:Team, sellerTeam:Team, marketPackage:TeamMarketOfferPackage, diamondAmount:string, options?:any): Promise<TeamMarketOffer> {

        if (buyerTeam._id == sellerTeam._id) {
            throw new Error("Buyer and seller teams cannot be the same.")
        }

        if (BigInt(diamondAmount) <= BigInt(0)) {
            throw new Error("Diamond amount must be greater than zero.")
        }

        let season:Season = await this.seasonService.getMostRecent(options)

        for (let playerId of marketPackage.playerIds) {

            let player:Player = await this.playerService.get(playerId, options)
            let pls:PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

            if (pls.teamId != sellerTeam._id) {
                throw new Error("Player is not currently rostered by the seller team.")
            }

        }

        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id, options)

        if (BigInt(diamondBalance) < BigInt(diamondAmount)) {
            throw new Error("Buyer team does not have enough diamonds to create this offer.")
        }

        let escrowTransactionId = uuidv4()

        await this.offchainEventService.createTeamBurnEvent(
            buyerTeam._id,
            diamondAmount,
            escrowTransactionId,
            options
        )

        let tmo:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            buyerTeamId: buyerTeam._id,
            sellerTeamId: sellerTeam._id,
            package: marketPackage,
            diamondAmount: diamondAmount,
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: escrowTransactionId
        })

        await this.put(tmo, options)

        return tmo

    }

    async cancelTeamMarketOffer(tmo:TeamMarketOffer, options?:any): Promise<TeamMarketOffer> {

        if (tmo.status != TeamMarketOfferStatus.PENDING) {
            throw new Error("Team market offer is not pending.")
        }

        let refundTransactionId = uuidv4()

        if (BigInt(tmo.diamondAmount) > BigInt(0)) {

            await this.offchainEventService.createTeamMintEvent(
                tmo.buyerTeamId,
                tmo.diamondAmount,
                {
                    type: "team-market-offer-cancelled",
                    teamMarketOfferId: tmo._id,
                    escrowTransactionId: tmo.escrowTransactionId
                } ,
                refundTransactionId,
                options
            )

        }

        tmo.status = TeamMarketOfferStatus.CANCELLED
        tmo.settlementTransactionId = refundTransactionId

        await this.put(tmo, options)

        return tmo

    }

    async acceptAndProcessTeamMarketOffer(user:User, tmo:TeamMarketOffer, date:Date, options?:any): Promise<TeamMarketOffer> {

        if (tmo.status != TeamMarketOfferStatus.PENDING) {
            throw new Error("Team market offer is not pending.")
        }

        let season:Season = await this.seasonService.getMostRecent(options)

        let buyerTeam:Team = await this.teamService.get(tmo.buyerTeamId, options)
        let sellerTeam:Team = await this.teamService.get(tmo.sellerTeamId, options)

        if (user._id != sellerTeam.userId) {
            throw new Error("Not authorized.")
        }

        let buyerTls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(buyerTeam, season, options)
        let sellerTls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(sellerTeam, season, options)

        let buyerPLSS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(buyerTeam, season, options)
        let requiredPositions:Position[] = this.teamService.listRequiredRosterSpots(buyerPLSS)

        let settlementTransactionId = uuidv4()

        for (let playerId of tmo.package.playerIds) {

            let player:Player = await this.playerService.get(playerId, options)
            let pls:PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

            if (pls.teamId != sellerTeam._id) {
                throw new Error("Player is not currently rostered by the seller team.")
            }

            if (!requiredPositions.includes(pls.primaryPosition)) {
                throw new Error(`Buyer roster does not have space for a ${pls.primaryPosition}.`)
            }

            this.lineupService.lineupRemove(sellerTls.lineups[0], player._id)
            this.lineupService.rotationRemove(sellerTls.lineups[0], player._id)

            await this.movePlayerToTeam(player, pls, buyerTeam, buyerTls, season, date, options)

            await this.offchainEventService.createPlayerTransferEvent(
                sellerTeam._id,
                buyerTeam._id,
                player._id,
                settlementTransactionId,
                options
            )

            let pendingOffers:TeamMarketOffer[] = await this.teamMarketOfferRepository.listPendingByPlayerId(player._id, options)

            for (let pendingOffer of pendingOffers) {
                if (pendingOffer._id != tmo._id) {
                    await this.cancelTeamMarketOffer(pendingOffer, options)
                }
            }

        }

        await this.offchainEventService.createTeamMintEvent(
            sellerTeam._id,
            tmo.diamondAmount,
            {
                type: "team-market-offer-accepted",
                teamMarketOfferId: tmo._id,
                escrowTransactionId: tmo.escrowTransactionId
            },
            settlementTransactionId,
            options
        )

        buyerTls.lineups[0].valid = false
        buyerTls.hasValidLineup = false
        sellerTls.lineups[0].valid = false
        sellerTls.hasValidLineup = false

        buyerTls.changed("lineups", true)
        buyerTls.changed("hasValidLineup", true)
        sellerTls.changed("lineups", true)
        sellerTls.changed("hasValidLineup", true)

        let currentBuyerPLSS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(buyerTeam, season, options)
        this.teamService.setLineupValidityAllowTiredStarters(buyerTeam, buyerTls, currentBuyerPLSS.map(pls => pls.get({ plain: true })))

        let currentSellerPLSS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(sellerTeam, season, options)
        this.teamService.setLineupValidityAllowTiredStarters(sellerTeam, sellerTls, currentSellerPLSS.map(pls => pls.get({ plain: true })))

        tmo.status = TeamMarketOfferStatus.PROCESSED
        tmo.settlementTransactionId = settlementTransactionId

        await this.teamLeagueSeasonService.put(buyerTls, options)
        await this.teamLeagueSeasonService.put(sellerTls, options)
        await this.put(tmo, options)

        return tmo

    }

    private async movePlayerToTeam(player:Player, pls:PlayerLeagueSeason, team:Team, tls:TeamLeagueSeason, season:Season, date:Date, options?:any): Promise<PlayerLeagueSeason> {

        if (player.primaryPosition == Position.PITCHER) {
            let spot = this.lineupService.getFirstAvailableRotationSpot(tls.lineups[0])
            this.lineupService.rotationAdd(tls.lineups[0], player, spot)
        } else {
            let spot = this.lineupService.getFirstAvailableOrderSpot(tls.lineups[0])
            this.lineupService.lineupAdd(tls.lineups[0], player, spot)
        }

        pls.endDate = date

        await this.playerLeagueSeasonService.put(pls, options)

        let nextPLS = new PlayerLeagueSeason()

        nextPLS.playerId = pls.playerId
        nextPLS.seasonId = season._id
        nextPLS.leagueId = tls.leagueId
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

        return nextPLS

    }    

    private async movePlayerToFreeAgency(player:Player, pls:PlayerLeagueSeason, season:Season, date:Date, options?:any): Promise<PlayerLeagueSeason> {

        pls.endDate = date

        await this.playerLeagueSeasonService.put(pls, options)

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

        return nextPLS

    }

}


export {
    TeamTransactionService
}