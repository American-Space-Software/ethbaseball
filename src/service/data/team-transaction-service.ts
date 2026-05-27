import { inject, injectable } from "inversify";


import { TeamMarketOfferRepository } from "../../repository/team-market-offer-repository.js";
import { TeamMarketOffer, TeamMarketOfferPackage } from "../../dto/team-market-offer.js";
import { Team, TEAM_COLORS } from "../../dto/team.js";
import { Season } from "../../dto/season.js";
import { ContractType, FinanceSeason, GLICKO_SETTINGS, MAX_TEAM_ROSTER_SIZE, MAX_TOTAL_ROSTER_SIZE, TeamMarketOfferStatus } from "../enums.js";
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
import { FinanceService } from "../finance-service.js";
import { League } from "../../dto/league.js";
import dayjs from "dayjs";


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
        private statService:StatService,
        private financeService:FinanceService,
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
        
        if (pls.userId) {
            throw new Error("Player is not a free agent.")
        }

        if (user._id != team.userId) {
            throw new Error("Not authorized.")
        }

        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id, options)

        let askingPrice = this.playerService.getAskingPrice(pls)

        if (BigInt(diamondBalance) < BigInt(askingPrice)) {
            throw new Error(`Team does not have enough diamonds to sign this player.`)
        }


        let userRosterSize = await this.playerLeagueSeasonService.getMostRecentCountByUserSeason(user._id, season, options)

        if (userRosterSize >= MAX_TOTAL_ROSTER_SIZE) {
            throw new Error("User roster is full.")
        }

        await this.movePlayerToUser(player, pls, user, season, date, options)

        await this.offchainEventService.createFreeAgentTransferEvent(team._id, player._id, offChainEventTransactionId, options)

        await this.offchainEventService.createTeamBurnEvent(team._id, askingPrice, offChainEventTransactionId, options)

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

    async createTeamMarketOffer(buyerPaymentTeam:Team, sellerPaymentTeam:Team, marketPackage:TeamMarketOfferPackage, diamondAmount:string, options?:any): Promise<TeamMarketOffer> {

        if (buyerPaymentTeam._id == sellerPaymentTeam._id) {
            throw new Error("Buyer and seller teams cannot be the same.")
        }

        if (BigInt(diamondAmount) <= BigInt(0)) {
            throw new Error("Diamond amount must be greater than zero.")
        }

        let season:Season = await this.seasonService.getMostRecent(options)

        for (let playerId of marketPackage.playerIds) {

            let player:Player = await this.playerService.get(playerId, options)
            let pls:PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

            if (pls.userId != sellerPaymentTeam.userId) {
                throw new Error("Player is not owned by the seller.")
            }

        }

        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerPaymentTeam._id, options)

        if (BigInt(diamondBalance) < BigInt(diamondAmount)) {
            throw new Error("Buyer team does not have enough diamonds to create this offer.")
        }

        let escrowTransactionId = uuidv4()

        await this.offchainEventService.createTeamBurnEvent(
            buyerPaymentTeam._id,
            diamondAmount,
            escrowTransactionId,
            options
        )

        let tmo:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            buyerUserId: buyerPaymentTeam.userId,
            sellerUserId: sellerPaymentTeam.userId,
            buyerPaymentTeamId: buyerPaymentTeam._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
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
                tmo.buyerPaymentTeamId,
                tmo.diamondAmount,
                {
                    type: "team-market-offer-cancelled",
                    teamMarketOfferId: tmo._id,
                    escrowTransactionId: tmo.escrowTransactionId
                },
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

        if (user._id != tmo.sellerUserId) {
            throw new Error("Not authorized.")
        }

        let season:Season = await this.seasonService.getMostRecent(options)

        let buyerPaymentTeam:Team = await this.teamService.get(tmo.buyerPaymentTeamId, options)
        let sellerPaymentTeam:Team = await this.teamService.get(tmo.sellerPaymentTeamId, options)

        if (buyerPaymentTeam.userId != tmo.buyerUserId) {
            throw new Error("Buyer payment team is not owned by the buyer.")
        }

        if (sellerPaymentTeam.userId != tmo.sellerUserId) {
            throw new Error("Seller payment team is not owned by the seller.")
        }

        let buyerRosterSize = await this.playerLeagueSeasonService.getMostRecentCountByUserSeason(tmo.buyerUserId, season, options)

        if (buyerRosterSize + tmo.package.playerIds.length > MAX_TOTAL_ROSTER_SIZE) {
            throw new Error("Buyer roster is full.")
        }


        let settlementTransactionId = uuidv4()
        let changedTlsByTeamId:Map<string, TeamLeagueSeason> = new Map()

        for (let playerId of tmo.package.playerIds) {

            let player:Player = await this.playerService.get(playerId, options)
            let pls:PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

            if (pls.userId != tmo.sellerUserId) {
                throw new Error("Player is not owned by the seller.")
            }

            if (pls.teamId) {

                let activeTeam:Team = await this.teamService.get(pls.teamId, options)

                if (activeTeam.userId != tmo.sellerUserId) {
                    throw new Error("Player is assigned to a team not owned by the seller.")
                }

                let isQueued = await this.teamQueueService.isTeamQueued(activeTeam, options)

                if (isQueued) {
                    throw new Error("Team is queued for a game. Cannot trade assigned player.")
                }

                let tls:TeamLeagueSeason = changedTlsByTeamId.get(activeTeam._id)

                if (!tls) {
                    tls = await this.teamLeagueSeasonService.getByTeamSeason(activeTeam, season, options)
                    changedTlsByTeamId.set(activeTeam._id, tls)
                }

                this.lineupService.lineupRemove(tls.lineups[0], player._id)
                this.lineupService.rotationRemove(tls.lineups[0], player._id)

                tls.lineups[0].valid = false
                tls.hasValidLineup = false

                tls.changed("lineups", true)
                tls.changed("hasValidLineup", true)

            }

            pls.endDate = date

            await this.playerLeagueSeasonService.put(pls, options)

            let nextPLS = new PlayerLeagueSeason()

            nextPLS.playerId = pls.playerId
            nextPLS.seasonId = season._id
            nextPLS.leagueId = pls.leagueId
            nextPLS.userId = tmo.buyerUserId
            nextPLS.teamId = undefined
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

            await this.offchainEventService.createPlayerTransferEvent(
                sellerPaymentTeam._id,
                buyerPaymentTeam._id,
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
            sellerPaymentTeam._id,
            tmo.diamondAmount,
            {
                type: "team-market-offer-accepted",
                teamMarketOfferId: tmo._id,
                escrowTransactionId: tmo.escrowTransactionId
            },
            settlementTransactionId,
            options
        )

        for (let tls of changedTlsByTeamId.values()) {
            await this.teamLeagueSeasonService.put(tls, options)
        }

        tmo.status = TeamMarketOfferStatus.PROCESSED
        tmo.settlementTransactionId = settlementTransactionId

        await this.put(tmo, options)

        return tmo

    }

    private async movePlayerToUser(player:Player, pls:PlayerLeagueSeason, user:User, season:Season, date:Date, options?:any): Promise<PlayerLeagueSeason> {

        pls.endDate = date

        await this.playerLeagueSeasonService.put(pls, options)

        let nextPLS = new PlayerLeagueSeason()

        nextPLS.playerId = pls.playerId
        nextPLS.seasonId = season._id
        nextPLS.leagueId = pls.leagueId
        nextPLS.userId = user._id
        nextPLS.teamId = undefined
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

    async assignPlayerToTeam(user:User, player:Player, team:Team, date:Date, options?:any) {

        let season:Season = await this.seasonService.getMostRecent(options)

        if (user._id != team.userId) {
            throw new Error("Not authorized.")
        }

        let pls:PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

        if (pls.userId != user._id) {
            throw new Error("Player is not owned by this user.")
        }

        if (pls.teamId) {
            throw new Error("Player is already assigned to a team.")
        }

        let isQueued = await this.teamQueueService.isTeamQueued(team, options)

        if (isQueued) {
            throw new Error("Team is queued for a game. Cannot assign player.")
        }

        let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

        let currentPLSS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)

        let requiredPositions:Position[] = this.teamService.listRequiredRosterSpots(currentPLSS)

        if (!requiredPositions.includes(pls.primaryPosition)) {
            throw new Error(`Your roster does not have space for a ${pls.primaryPosition}. Drop your current ${pls.primaryPosition} to make room.`)
        }

        if (currentPLSS.length >= MAX_TEAM_ROSTER_SIZE) {
            throw new Error("Team roster is full.")
        }


        this.assignPlayerToTeamByPLS(player, pls, team, tls, season, date, options)

        let currentTeamPLSS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)
        this.teamService.setLineupValidityAllowTiredStarters(team, tls, currentTeamPLSS.map(pls => pls.get({ plain: true })))

        tls.changed("lineups", true)
        tls.changed("hasValidLineup", true)

        await this.teamLeagueSeasonService.put(tls, options)

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
        nextPLS.teamId = null
        nextPLS.userId = null

        nextPLS.stats = {
            //@ts-ignore
            hitting: this.statService.mergeHitResultsToStatLine({}, {}),
            //@ts-ignore
            pitching: this.statService.mergePitchResultsToStatLine({}, {})
        }

        await this.playerLeagueSeasonService.put(nextPLS, options)

        return nextPLS

    }

    async createForUser(user:User, league:League, season:Season, options?:any) : Promise<{team:Team, tls:TeamLeagueSeason}> {

        let createdTeam = await this.teamService.createForUser(user, league, season, options)

        await this.fillAndValidateRoster(user, createdTeam.team, createdTeam.tls, [], season, undefined, true, options)

        return createdTeam

    }

    async fillAndValidateRoster(user:User, team:Team, tls: TeamLeagueSeason, roster: PlayerLeagueSeason[], season: Season, date: Date, minimumOnly: boolean, options?: any) {

        let added = {
            players:[],
            plss:[]
        }

        let required: Position[] = this.teamService.listRequiredRosterSpots(roster)

        //Shuffle so we get every position to fill instead of just the first ones.
        let shuffled = required
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value)


        let fillCount=0


        let offChainEventTransactionId = uuidv4()
        for (let position of shuffled) {

            //Find a player from the pool that fits via salary.
            let plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getFreeAgentsByPosition(position, season, 1, 0, options)


            let pls: PlayerLeagueSeason
            let player: Player

            if (minimumOnly || plss?.length < 1) {

                //Generate a player.
                player = await this.playerService.scoutPlayer({ onDate: dayjs(date).format("YYYY-MM-DD"), type: position})

                // this.playerService.createRookieContract(player)
                await this.playerService.put(player, options)

                pls = await this.playerLeagueSeasonService.createPlayerLeagueSeason(player, season, 1, options)

            } else {

                pls = await this.playerLeagueSeasonService.getById(plss[0]._id, options)
                player = await this.playerService.get(plss[0].playerId, options)

            }

            await this.signAvailablePlayer(user, player, pls, team, tls, season, date, offChainEventTransactionId, options)

            added.players.push(player)
            added.plss.push(pls)


            fillCount++

        }

        if (shuffled?.length > 0) {
            
            // await updateFinances(team, season, options)

            tls.lineups[0].valid = true
            tls.hasValidLineup = true

            tls.changed("lineups", true)
            tls.changed("hasValidLineup", true)

            await this.teamLeagueSeasonService.put(tls, options)
            
        }


        return added

    }


    private async signAvailablePlayer(user:User, player:Player, pls:PlayerLeagueSeason, team:Team, tls:TeamLeagueSeason, season:Season, date:Date, offChainEventTransactionId:string, options?:any): Promise<PlayerLeagueSeason> {

        let signedPLS:PlayerLeagueSeason = await this.movePlayerToUser(player, pls, user, season, date, options)

        let assignedPLS:PlayerLeagueSeason = await this.assignPlayerToTeamByPLS(player, signedPLS, team, tls, season, date, options)

        await this.offchainEventService.createFreeAgentTransferEvent(team._id, player._id, offChainEventTransactionId, options)

        await this.playerService.put(player, options)

        return assignedPLS

    }


    private async assignPlayerToTeamByPLS(player:Player, pls:PlayerLeagueSeason, team:Team, tls:TeamLeagueSeason, season:Season, date:Date, options?:any): Promise<PlayerLeagueSeason> {

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
        nextPLS.userId = pls.userId
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


}


export {
    TeamTransactionService
}