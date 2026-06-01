import { inject, injectable } from "inversify";


import { TeamMarketOfferRepository } from "../../repository/team-market-offer-repository.js";
import { TeamMarketOffer, TeamMarketOfferPackage } from "../../dto/team-market-offer.js";
import { Team, TEAM_COLORS } from "../../dto/team.js";
import { Season } from "../../dto/season.js";
import { ContractType, FinanceSeason, GLICKO_SETTINGS, DEFAULT_ROSTER_CONSTRAINTS, TeamMarketOfferStatus, Lineup, DEFAULT_MAX_PITCH_COUNT } from "../enums.js";
import { PlayerLeagueSeasonService } from "./player-league-season-service.js";
import { PlayerLeagueSeason } from "../../dto/player-league-season.js";
import { Player } from "../../dto/player.js";
import { TeamLeagueSeason } from "../../dto/team-league-season.js";
import { TeamLeagueSeasonService } from "./team-league-season-service.js";
import { PitchingRoleType, Position } from "../../baseball-sim-engine/service/enums.js";
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
import { PitchingRole } from "../../baseball-sim-engine/service/interfaces.js";
import { UserService } from "./user-service.js";
import { LadderService } from "../ladder-service.js";
import { LeagueService } from "./league-service.js";


@injectable()
class TeamTransactionService {

    @inject("sequelize")
    private sequelize:Function

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
        private userService:UserService,
        private ladderService:LadderService,
        private leagueService:LeagueService,
        private financeService:FinanceService,
    ) {}

    async get(_id:string, options?:any) : Promise<TeamMarketOffer> {
        return this.teamMarketOfferRepository.get(_id, options)
    }

    async put(tmo:TeamMarketOffer, options?:any) : Promise<TeamMarketOffer> {
        return this.teamMarketOfferRepository.put(tmo, options)
    }

    async signFreeAgent(user: User, player: Player, team: Team, date: Date, offChainEventTransactionId: string, options?: any) {

        let season: Season = await this.seasonService.getMostRecent(options)

        let pls: PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

        if (pls.userId) {
            throw new Error("Player is not a free agent.")
        }

        if (user._id != team.userId) {
            throw new Error("Not authorized.")
        }

        let userRosterSize = await this.playerLeagueSeasonService.getMostRecentCountByUserSeason(user._id, season, options)

        if (userRosterSize >= DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize) {
            throw new Error("User roster is full.")
        }

        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id, options)

        let askingPrice = this.playerService.getAskingPrice(pls)

        if (BigInt(diamondBalance) < BigInt(askingPrice)) {
            throw new Error(`Team does not have enough diamonds to sign this player.`)
        }

        let signedPLS: PlayerLeagueSeason = await this.movePlayerToUser(player, pls, user, season, date, options)

        await this.teamQueueService.dequeueTeam(team, options)

        let currentPLSS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)

        if (currentPLSS.length < DEFAULT_ROSTER_CONSTRAINTS.maxTeamRosterSize) {

            let tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

            await this.assignPlayerToTeamByPLS(player, signedPLS, team, tls, season, date, options)

            let currentTeamPLSS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)

            try {
                this.teamService.setLineupValidityAllowTiredStarters(team, tls, currentTeamPLSS.map(pls => pls.get({ plain: true })))
            } catch (e) {
                tls.hasValidLineup = false

                for (let lineup of tls.lineups) {
                    lineup.valid = false
                }
            }

            tls.changed("lineups", true)
            tls.changed("hasValidLineup", true)

            await this.teamLeagueSeasonService.put(tls, options)

        }

        await this.offchainEventService.createFreeAgentTransferEvent(team._id, player._id, offChainEventTransactionId, options)

        await this.offchainEventService.createTeamBurnEvent(team._id, askingPrice, offChainEventTransactionId, options)

    }

    async dropPlayer(user: User, player: Player, date: Date, options?: any) {

        let season: Season = await this.seasonService.getMostRecent(options)

        let pls: PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

        if (!pls.teamId) {
            throw new Error("Player is not rostered.")
        }

        let team: Team = await this.teamService.get(pls.teamId, options)

        if (user._id != team.userId) {
            throw new Error("Not authorized.")
        }

        await this.teamQueueService.dequeueTeam(team, options)

        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id, options)

        let minimumPlayerSalary = this.playerService.getFreeAgentSalary(1, 50, 365)

        if (BigInt(diamondBalance) < BigInt(minimumPlayerSalary)) {
            throw new Error(`Team does not have enough diamonds to drop this player.`)
        }

        let pendingOffers: TeamMarketOffer[] = await this.teamMarketOfferRepository.listPendingByPlayerId(player._id, options)

        for (let pendingOffer of pendingOffers) {
            await this.cancelTeamMarketOffer(pendingOffer, options)
        }

        let tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

        this.lineupService.lineupRemove(tls.lineups[0], player._id)
        this.lineupService.rotationRemove(tls.lineups[0], player._id)

        if (tls.lineups[0].availablePitchers) {
            tls.lineups[0].availablePitchers = tls.lineups[0].availablePitchers.filter(p => p.playerId != player._id)
        }

        if (tls.lineups[0].availableHitters) {
            tls.lineups[0].availableHitters = tls.lineups[0].availableHitters.filter(p => p._id != player._id)
        }

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

    async acceptAndProcessTeamMarketOffer(user: User, tmo: TeamMarketOffer, date: Date, options?: any): Promise<TeamMarketOffer> {

        if (tmo.status != TeamMarketOfferStatus.PENDING) {
            throw new Error("Team market offer is not pending.")
        }

        if (user._id != tmo.sellerUserId) {
            throw new Error("Not authorized.")
        }

        let season: Season = await this.seasonService.getMostRecent(options)

        let buyerPaymentTeam: Team = await this.teamService.get(tmo.buyerPaymentTeamId, options)
        let sellerPaymentTeam: Team = await this.teamService.get(tmo.sellerPaymentTeamId, options)

        if (buyerPaymentTeam.userId != tmo.buyerUserId) {
            throw new Error("Buyer payment team is not owned by the buyer.")
        }

        if (sellerPaymentTeam.userId != tmo.sellerUserId) {
            throw new Error("Seller payment team is not owned by the seller.")
        }

        let buyerRosterSize = await this.playerLeagueSeasonService.getMostRecentCountByUserSeason(tmo.buyerUserId, season, options)

        if (buyerRosterSize + tmo.package.playerIds.length > DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize) {
            throw new Error("Buyer roster is full.")
        }

        let settlementTransactionId = uuidv4()
        let changedTlsByTeamId: Map<string, TeamLeagueSeason> = new Map()

        for (let playerId of tmo.package.playerIds) {

            let player: Player = await this.playerService.get(playerId, options)
            let pls: PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

            if (pls.userId != tmo.sellerUserId) {
                throw new Error("Player is not owned by the seller.")
            }

            if (pls.teamId) {

                let activeTeam: Team = await this.teamService.get(pls.teamId, options)

                if (activeTeam.userId != tmo.sellerUserId) {
                    throw new Error("Player is assigned to a team not owned by the seller.")
                }

                await this.teamQueueService.dequeueTeam(activeTeam, options)

                let tls: TeamLeagueSeason = changedTlsByTeamId.get(activeTeam._id)

                if (!tls) {
                    tls = await this.teamLeagueSeasonService.getByTeamSeason(activeTeam, season, options)
                    changedTlsByTeamId.set(activeTeam._id, tls)
                }

                this.lineupService.lineupRemove(tls.lineups[0], player._id)
                this.lineupService.rotationRemove(tls.lineups[0], player._id)

                if (tls.lineups[0].availablePitchers) {
                    tls.lineups[0].availablePitchers = tls.lineups[0].availablePitchers.filter(p => p.playerId != player._id)
                }

                if (tls.lineups[0].availableHitters) {
                    tls.lineups[0].availableHitters = tls.lineups[0].availableHitters.filter(p => p._id != player._id)
                }

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

            await this.offchainEventService.createPlayerTransferEvent(sellerPaymentTeam._id, buyerPaymentTeam._id, player._id, settlementTransactionId, options)

            let pendingOffers: TeamMarketOffer[] = await this.teamMarketOfferRepository.listPendingByPlayerId(player._id, options)

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

    async createForUser(user: User, league: League, season: Season, options?: any): Promise<{team: Team, tls: TeamLeagueSeason}> {

        let createdTeam = await this.teamService.createForUser(user, league, season, options)

        await this.fillAndValidateRoster(user, createdTeam.team, createdTeam.tls, [], season, season.startDate, true, options)

        return createdTeam

    }

    async fillAndValidateRoster(user: User, team: Team, tls: TeamLeagueSeason, roster: PlayerLeagueSeason[], season: Season, date: Date, minimumOnly: boolean, options?: any) {

        let added = {
            players: [],
            plss: []
        }

        let required: Position[] = this.listRequiredRosterSpots(roster)

        let shuffled = required
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value)

        let offChainEventTransactionId = uuidv4()

        for (let position of shuffled) {

            let plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getFreeAgentsByPosition(position, season, 1, 0, options)

            let pls: PlayerLeagueSeason
            let player: Player

            if (minimumOnly || plss?.length < 1) {

                player = await this.playerService.scoutPlayer({ onDate: dayjs(date).format("YYYY-MM-DD"), type: position })

                await this.playerService.put(player, options)

                pls = await this.playerLeagueSeasonService.createPlayerLeagueSeason(player, season, 1, options)

            } else {

                pls = await this.playerLeagueSeasonService.getById(plss[0]._id, options)
                player = await this.playerService.get(plss[0].playerId, options)

            }

            let assignedPLS: PlayerLeagueSeason = await this.signAvailablePlayer(user, player, pls, team, tls, season, date, offChainEventTransactionId, options)

            roster.push(assignedPLS)

            added.players.push(player)
            added.plss.push(assignedPLS)

        }

        if (shuffled?.length > 0) {

            let currentTeamPLSS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)

            this.teamService.setLineupValidityAllowTiredStarters(team, tls, currentTeamPLSS.map(pls => pls.get({ plain: true })))

            tls.changed("lineups", true)
            tls.changed("hasValidLineup", true)

            await this.teamLeagueSeasonService.put(tls, options)

        }

        return added

    }


    async updateRoster(lineups: Lineup[], team: Team, options?: any) {

        let season: Season = await this.seasonService.getMostRecent(options)
        let currentTLS: TeamLeagueSeason = await this.teamLeagueSeasonService.getMostRecent(team, options)

        let playerIds = this.getPlayerIdsFromLineups(lineups)

        let currentTeamPLS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)
        let currentTeamPlayerIds = new Set(currentTeamPLS.map(pls => pls.playerId))

        let playersToAssign: { player: Player, pls: PlayerLeagueSeason }[] = []

        for (let playerId of playerIds) {

            let player: Player = await this.playerService.get(playerId, options)
            let pls: PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

            if (pls.userId != team.userId) {
                throw new Error("Invalid player in roster.")
            }

            if (pls.teamId && pls.teamId != team._id) {
                throw new Error("Invalid player in roster.")
            }

            if (!pls.teamId && !currentTeamPlayerIds.has(playerId)) {
                playersToAssign.push({ player, pls })
            }

        }

        let projectedTeamPlayerIds = new Set(currentTeamPlayerIds)

        for (let assignment of playersToAssign) {
            projectedTeamPlayerIds.add(assignment.player._id)
        }

        if (projectedTeamPlayerIds.size > DEFAULT_ROSTER_CONSTRAINTS.maxTeamRosterSize) {
            throw new Error("Team roster is full.")
        }

        let date = new Date(new Date().toUTCString())

        for (let assignment of playersToAssign) {
            await this.moveOwnedPlayerToTeamRoster(assignment.player, assignment.pls, team, currentTLS, season, date, options)
        }

        await this.updatePitcherMaxPitchCountsForLineups(lineups, options)

        currentTLS.lineups = lineups
        currentTLS.changed("lineups", true)

        let updatedTeamPLS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeam(team, options)
        let updatedTeamPLSPlain = updatedTeamPLS.map(pls => pls.get({ plain: true }))

        try {
            this.teamService.setLineupValidityAllowTiredStarters(team, currentTLS, updatedTeamPLSPlain)
        } catch (e) {

            let error = e as Error

            if (
                !error.message.includes("not enough") &&
                !error.message.includes("Not enough") &&
                !error.message.includes("does not have enough") &&
                !error.message.includes("must have")
            ) {
                throw e
            }

            currentTLS.hasValidLineup = false

            for (let lineup of currentTLS.lineups) {
                lineup.valid = false
            }

        }

        currentTLS.changed("hasValidLineup", true)

        await this.teamLeagueSeasonService.put(currentTLS, options)

    }

    private getPlayerIdsFromLineups(lineups: Lineup[]): string[] {

        let playerIds: string[] = []

        for (let lineup of lineups) {

            if (lineup.order) {
                playerIds.push(...lineup.order.filter(p => p?._id != undefined).map(p => p._id))
            }

            if (lineup.rotation) {
                playerIds.push(...lineup.rotation.filter(p => p?._id != undefined).map(p => p._id))
            }

            if (lineup.availablePitchers) {
                playerIds.push(...lineup.availablePitchers.filter(p => p?.playerId != undefined).map(p => p.playerId))
            }

            if (lineup.availableHitters) {
                playerIds.push(...lineup.availableHitters.filter(p => p?._id != undefined).map(p => p._id))
            }

        }

        return Array.from(new Set(playerIds))

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

    private async moveOwnedPlayerToTeamRoster(player: Player, pls: PlayerLeagueSeason, team: Team, tls: TeamLeagueSeason, season: Season, date: Date, options?: any): Promise<PlayerLeagueSeason> {

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
        nextPLS.stats = pls.stats

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

    private listRequiredRosterSpots(roster: PlayerLeagueSeason[]): Position[] {

        let required: Position[] = []
        let positions = roster.map(pls => pls.primaryPosition)

        let startingLineup = [
            Position.CATCHER,
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE,
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD
        ]

        let infieldBench = [
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE
        ]

        let outfieldBench = [
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD
        ]

        for (let position of startingLineup) {
            if (!positions.includes(position)) {
                required.push(position)
                positions.push(position)
            }
        }

        while (positions.filter(p => p == Position.PITCHER).length < DEFAULT_ROSTER_CONSTRAINTS.minPitchers) {
            required.push(Position.PITCHER)
            positions.push(Position.PITCHER)
        }

        while (positions.filter(p => infieldBench.includes(p)).length < 7) {
            let position = infieldBench[Math.floor(Math.random() * infieldBench.length)]

            required.push(position)
            positions.push(position)
        }

        while (positions.filter(p => outfieldBench.includes(p)).length < 5) {
            let position = outfieldBench[Math.floor(Math.random() * outfieldBench.length)]

            required.push(position)
            positions.push(position)
        }

        return required

    }

    private async signAvailablePlayer(user:User, player:Player, pls:PlayerLeagueSeason, team:Team, tls:TeamLeagueSeason, season:Season, date:Date, offChainEventTransactionId:string, options?:any): Promise<PlayerLeagueSeason> {

        let signedPLS:PlayerLeagueSeason = await this.movePlayerToUser(player, pls, user, season, date, options)

        let assignedPLS:PlayerLeagueSeason = await this.assignPlayerToTeamByPLS(player, signedPLS, team, tls, season, date, options)

        await this.offchainEventService.createFreeAgentTransferEvent(team._id, player._id, offChainEventTransactionId, options)

        await this.playerService.put(player, options)

        return assignedPLS

    }

    private async assignPlayerToTeamByPLS(player: Player, pls: PlayerLeagueSeason, team: Team, tls: TeamLeagueSeason, season: Season, date: Date, options?: any): Promise<PlayerLeagueSeason> {

        if (!tls.lineups[0].availablePitchers) {
            tls.lineups[0].availablePitchers = []
        }

        if (!tls.lineups[0].availableHitters) {
            tls.lineups[0].availableHitters = []
        }

        if (player.primaryPosition == Position.PITCHER) {

            let rotationPitchers = tls.lineups[0].rotation.filter(p => p?._id != undefined).length

            if (rotationPitchers < DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers) {
                let spot = this.lineupService.getFirstAvailableRotationSpot(tls.lineups[0])
                this.lineupService.rotationAdd(tls.lineups[0], player, spot)
            } else {
                let pitchingRole = this.getNextBullpenRole(tls.lineups[0], player)

                tls.lineups[0].availablePitchers.push(pitchingRole)

                let maxPitches = this.playerService.getMaxPitchCountForBullpenRole(pitchingRole.role)

                if (maxPitches < player.maxPitchCount) {
                    player.maxPitchCount = maxPitches
                    await this.playerService.put(player, options)
                }
            }

        } else {

            let alreadyHasPosition = tls.lineups[0].order.some(p =>
                p?._id != undefined &&
                p.position == player.primaryPosition
            )

            if (!alreadyHasPosition) {
                let spot = this.lineupService.getFirstAvailableOrderSpot(tls.lineups[0])
                this.lineupService.lineupAdd(tls.lineups[0], player, spot)
            } else {
                tls.lineups[0].availableHitters.push({
                    _id: player._id
                } as any)
            }

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

    private getNextBullpenRole(lineup: Lineup, player: Player): PitchingRole {

        if (!lineup.availablePitchers) {
            lineup.availablePitchers = []
        }

        let closers = lineup.availablePitchers.filter(p => p.role == PitchingRoleType.CLOSER).length
        let setup = lineup.availablePitchers.filter(p => p.role == PitchingRoleType.SETUP).length
        let middle = lineup.availablePitchers.filter(p => p.role == PitchingRoleType.MIDDLE).length
        let long = lineup.availablePitchers.filter(p => p.role == PitchingRoleType.LONG).length
        let mopUp = lineup.availablePitchers.filter(p => p.role == PitchingRoleType.MOP_UP).length

        if (closers < DEFAULT_ROSTER_CONSTRAINTS.minClosers) {
            return {
                playerId: player._id,
                role: PitchingRoleType.CLOSER,
                priority: closers + 1
            }
        }

        if (setup < DEFAULT_ROSTER_CONSTRAINTS.minSetupRelievers) {
            return {
                playerId: player._id,
                role: PitchingRoleType.SETUP,
                priority: setup + 1
            }
        }

        if (middle < DEFAULT_ROSTER_CONSTRAINTS.minMiddleRelievers) {
            return {
                playerId: player._id,
                role: PitchingRoleType.MIDDLE,
                priority: middle + 1
            }
        }

        if (long < DEFAULT_ROSTER_CONSTRAINTS.minLongRelievers) {
            return {
                playerId: player._id,
                role: PitchingRoleType.LONG,
                priority: long + 1
            }
        }

        return {
            playerId: player._id,
            role: PitchingRoleType.MOP_UP,
            priority: mopUp + 1
        }

    }

    private async updatePitcherMaxPitchCountsForLineups(lineups:Lineup[], options?:any): Promise<void> {

        for (let lineup of lineups) {

            if (lineup.availablePitchers) {
                for (let pitchingRole of lineup.availablePitchers) {

                    if (!pitchingRole?.playerId) {
                        continue
                    }

                    let maxPitchCount = this.playerService.getMaxPitchCountForBullpenRole(pitchingRole.role)

                    let player:Player = await this.playerService.get(pitchingRole.playerId, options)

                    if (maxPitchCount < player.maxPitchCount) {
                        player.maxPitchCount = maxPitchCount
                        await this.playerService.put(player, options)
                    }

                }
            }

        }

    }

    public async fillAllRosters() {

        let s = await this.sequelize()

        let date = new Date(new Date().toUTCString())

        await s.transaction(async (t1) => {

            let options = { transaction: t1 }

            let league: League = await this.leagueService.get(`c3feecd3-e8d9-4417-b30d-07db974c755e`, options)

            let lastSeason: Season = await this.seasonService.get(`fb1f7fd2-10cd-4ef3-9725-e09c225dc642`, options)
            let currentSeason: Season = await this.seasonService.get(`6a3a1c27-1753-43c6-9eed-1768a17ee01a`, options)

            let teams: Team[] = await this.teamService.list(25000, 0, options)

            console.log(`[FILL ROSTERS] Starting ${teams.length} teams`)

            let index = 0

            for (let team of teams) {

                index++

                console.log(`[FILL ROSTERS] ${index}/${teams.length} team=${team._id}`)

                if (!team.userId) {
                    console.log(`[FILL ROSTERS] ${team._id} skipped (no userId)`)
                    continue
                }

                let user: User = await this.userService.get(team.userId, options)

                let tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, currentSeason, options)

                if (!tls) {

                    console.log(`[FILL ROSTERS] ${team._id} missing TLS, rolling over`)

                    let previousPLSS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(
                        team,
                        lastSeason,
                        options
                    )

                    console.log(`[FILL ROSTERS] ${team._id} found ${previousPLSS.length} previous PLS`)

                    let rollover = await this.ladderService.rolloverTeamToNextSeason(
                        team,
                        lastSeason,
                        currentSeason,
                        league,
                        previousPLSS,
                        options
                    )

                    tls = rollover.tls

                    console.log(`[FILL ROSTERS] ${team._id} rollover complete. New PLS=${rollover.plss.length}`)
                }

                let plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(
                    team,
                    currentSeason,
                    options
                )

                console.log(`[FILL ROSTERS] ${team._id} current PLS=${plss.length}`)

                await this.fillAndValidateRoster(
                    user,
                    team,
                    tls,
                    plss,
                    currentSeason,
                    date,
                    true,
                    options
                )

                console.log(`[FILL ROSTERS] ${team._id} roster validated`)
            }

            console.log(`[FILL ROSTERS] Complete`)
        })

    }


}


export {
    TeamTransactionService
}