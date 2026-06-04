import { inject, injectable } from "inversify";


import { TeamMarketOfferRepository } from "../../repository/team-market-offer-repository.js";
import { TeamMarketOffer } from "../../dto/team-market-offer.js";
import { Team, TEAM_COLORS } from "../../dto/team.js";
import { Season } from "../../dto/season.js";
import { ContractType, FinanceSeason, GLICKO_SETTINGS, DEFAULT_ROSTER_CONSTRAINTS, TeamMarketOfferStatus, Lineup, DEFAULT_MAX_PITCH_COUNT, DEFAULT_DROP_PLAYER_DIAMONDS } from "../enums.js";
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

        if (!pls.userId) {
            throw new Error("Player is not owned.")
        }

        if (pls.userId != user._id) {
            throw new Error("Not authorized.")
        }

        let teams: Team[] = await this.teamService.getByUser(user, options)
        let paymentTeam: Team = teams[0]

        if (!paymentTeam) {
            throw new Error("User does not have a team to pay for this drop.")
        }

        let rosterTeam: Team | undefined = undefined
        let tls: TeamLeagueSeason | undefined = undefined

        if (pls.teamId) {
            rosterTeam = await this.teamService.get(pls.teamId, options)

            if (user._id != rosterTeam.userId) {
                throw new Error("Not authorized.")
            }

            await this.teamQueueService.dequeueTeam(rosterTeam, options)
        }

        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, paymentTeam._id, options)

        if (BigInt(diamondBalance) < BigInt(DEFAULT_DROP_PLAYER_DIAMONDS)) {
            throw new Error(`Team does not have enough diamonds to drop this player.`)
        }

        let privateBuyOffers: TeamMarketOffer[] = await this.teamMarketOfferRepository.listPendingPrivateBuyOffersByPlayerId(player._id, options)

        for (let privateBuyOffer of privateBuyOffers) {
            await this.cancelTeamMarketOffer(privateBuyOffer, options)
        }

        let saleListing: TeamMarketOffer | undefined = await this.teamMarketOfferRepository.getPendingSaleListingByPlayerId(player._id, options)

        if (saleListing && saleListing.sellerUserId == user._id) {
            await this.cancelTeamMarketOffer(saleListing, options)
        }

        if (rosterTeam) {
            tls = await this.teamLeagueSeasonService.getByTeamSeason(rosterTeam, season, options)

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

        await this.movePlayerToFreeAgency(player, pls, season, date, options)

        let offChainEventTransactionId = uuidv4()

        await this.offchainEventService.createPlayerDropTransferEvent(paymentTeam._id, player._id, offChainEventTransactionId, options)
        await this.offchainEventService.createTeamBurnEvent(paymentTeam._id, DEFAULT_DROP_PLAYER_DIAMONDS, offChainEventTransactionId, options)

        if (rosterTeam) {
            await this.teamService.put(rosterTeam, options)
            await this.teamLeagueSeasonService.put(tls, options)
        }

    }

    async activatePlayer(user: User, team: Team, player: Player, date: Date, options?: any): Promise<TeamLeagueSeason> {
        return await this.updateTeamRosterAssignment(user, team, date, player._id, undefined, options)
    }

    async deactivatePlayer(user: User, team: Team, player: Player, date: Date, options?: any): Promise<TeamLeagueSeason> {
        return await this.updateTeamRosterAssignment(user, team, date, undefined, player._id, options)
    }

    async createPlayerSaleListing(user: User, player: Player, listPrice: string, options?: any): Promise<TeamMarketOffer> {

        if (BigInt(listPrice) <= BigInt(0)) {
            throw new Error("Diamond amount must be greater than zero.")
        }

        let season: Season = await this.seasonService.getMostRecent(options)
        let pls: PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

        if (!pls.userId) {
            throw new Error("Player is not owned.")
        }

        if (pls.userId != user._id) {
            throw new Error("Not authorized.")
        }

        let existingListing: TeamMarketOffer | undefined = await this.teamMarketOfferRepository.getPendingSaleListingByPlayerId(player._id, options)

        if (existingListing) {
            throw new Error("Player already has an active sale listing.")
        }

        let teams: Team[] = await this.teamService.getByUser(user, options)
        let sellerPaymentTeam: Team = teams[0]

        if (!sellerPaymentTeam) {
            throw new Error("User does not have a team.")
        }

        return this.createTeamMarketOffer(undefined, sellerPaymentTeam, player, listPrice, options)

    }

    async buyPlayerSaleListing(user: User, tmo: TeamMarketOffer, options?: any): Promise<TeamMarketOffer> {

        if (tmo.status != TeamMarketOfferStatus.PENDING) {
            throw new Error("Team market offer is not pending.")
        }

        if (tmo.buyerUserId || tmo.buyerPaymentTeamId || tmo.escrowTransactionId) {
            throw new Error("Team market offer is not a sale listing.")
        }

        if (user._id == tmo.sellerUserId) {
            throw new Error("Seller cannot buy their own listing.")
        }

        let buyerTeams: Team[] = await this.teamService.getByUser(user, options)
        let buyerPaymentTeam: Team = buyerTeams[0]

        if (!buyerPaymentTeam) {
            throw new Error("User does not have a team to buy this listing.")
        }

        throw new Error("Buying existing sale listings is not implemented yet.")

    }

    async createPrivatePlayerBuyOffer(buyerPaymentTeam: Team, sellerPaymentTeam: Team, player: Player, diamondAmount: string, options?: any): Promise<TeamMarketOffer> {

        let season: Season = await this.seasonService.getMostRecent(options)
        let pls: PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

        if (!pls.userId || pls.userId != sellerPaymentTeam.userId) {
            throw new Error("Player is not owned by the seller.")
        }

        return this.createTeamMarketOffer(buyerPaymentTeam, sellerPaymentTeam, player, diamondAmount, options)

    }

    async cancelPlayerSaleListings(user: User, player: Player, options?: any): Promise<TeamMarketOffer[]> {

        let season: Season = await this.seasonService.getMostRecent(options)
        let pls: PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

        if (!pls.userId) {
            throw new Error("Player is not owned.")
        }

        if (pls.userId != user._id) {
            throw new Error("Not authorized.")
        }

        let saleListing: TeamMarketOffer | undefined = await this.teamMarketOfferRepository.getPendingSaleListingByPlayerId(player._id, options)

        if (!saleListing) {
            return []
        }

        if (saleListing.sellerUserId != user._id) {
            return []
        }

        await this.cancelTeamMarketOffer(saleListing, options)

        return [saleListing]

    }

    async updateTeamRosterAssignment(user: User, team: Team, date: Date, addPlayerId?: string, removePlayerId?: string, options?: any): Promise<TeamLeagueSeason> {

        let season: Season = await this.seasonService.getMostRecent(options)
        let tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

        if (user._id != team.userId) {
            throw new Error("Not authorized.")
        }

        if (!addPlayerId && !removePlayerId) {
            throw new Error("No roster assignment change requested.")
        }

        if (addPlayerId && removePlayerId) {
            throw new Error("Activate and deactivate players separately.")
        }

        await this.teamQueueService.dequeueTeam(team, options)

        if (removePlayerId) {

            let removePlayer: Player = await this.playerService.get(removePlayerId, options)
            let removePLS: PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(removePlayer, season, options)

            if (removePLS.userId != user._id) {
                throw new Error("Player is not owned by this user.")
            }

            if (removePLS.teamId != team._id) {
                throw new Error("Player is not assigned to this team.")
            }

            this.removePlayerFromLineups(tls.lineups, removePlayer._id)

            await this.movePlayerToUser(removePlayer, removePLS, user, season, date, options)

            await this.updateRoster(tls.lineups, team, options)

            return await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

        }

        if (addPlayerId) {

            let currentTeamPLS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)

            if (currentTeamPLS.length >= DEFAULT_ROSTER_CONSTRAINTS.maxTeamRosterSize) {
                throw new Error("Team roster is full.")
            }

            let addPlayer: Player = await this.playerService.get(addPlayerId, options)
            let addPLS: PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(addPlayer, season, options)

            if (addPLS.userId != user._id) {
                throw new Error("Player is not owned by this user.")
            }

            if (addPLS.teamId) {
                throw new Error("Player is already assigned to a team.")
            }

            let lineup = tls.lineups[0]

            if (addPlayer.primaryPosition == Position.PITCHER) {

                let openRotationSpot = lineup.rotation.filter(p => p?._id != undefined).length < DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers
                let bullpenPitchers = lineup.availablePitchers?.filter(p => p?.playerId != undefined).length ?? 0

                if (!openRotationSpot && bullpenPitchers >= DEFAULT_ROSTER_CONSTRAINTS.minBullpenPitchers) {
                    throw new Error("Bullpen and rotation are full. There is no roster spot available for this pitcher.")
                }

            } else {

                let hitterBenchSize = DEFAULT_ROSTER_CONSTRAINTS.maxTeamRosterSize - DEFAULT_ROSTER_CONSTRAINTS.minPitchers - 8
                let hasOpenLineupSpot = lineup.order.some(p => p?._id == undefined && p.position == addPlayer.primaryPosition)
                let benchHitters = lineup.availableHitters?.filter(p => p?._id != undefined).length ?? 0

                if (!hasOpenLineupSpot && benchHitters >= hitterBenchSize) {
                    throw new Error("Bench is full and there is no lineup spot available for this player.")
                }

            }

            await this.assignPlayerToTeamByPLS(addPlayer, addPLS, team, tls, season, date, options)

            this.assertPlayerExistsInLineups(tls.lineups, addPlayer._id)

            await this.updateRoster(tls.lineups, team, options)

            return await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

        }

    }

    async createTeamMarketOffer(buyerPaymentTeam: Team | undefined, sellerPaymentTeam: Team, salePlayer: Player, diamondAmount: string, options?: any): Promise<TeamMarketOffer> {

        if (BigInt(diamondAmount) <= BigInt(0)) {
            throw new Error("Diamond amount must be greater than zero.")
        }

        if (buyerPaymentTeam && buyerPaymentTeam._id == sellerPaymentTeam._id) {
            throw new Error("Buyer and seller payment teams cannot be the same.")
        }

        let tmo: TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerPaymentTeam?.userId,
            sellerUserId: sellerPaymentTeam.userId,
            buyerPaymentTeamId: buyerPaymentTeam?._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: salePlayer._id,
            diamondAmount: diamondAmount,
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: undefined,
            settlementTransactionId: undefined
        })

        if (buyerPaymentTeam) {

            let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerPaymentTeam._id, options)

            if (BigInt(diamondBalance) < BigInt(diamondAmount)) {
                throw new Error("Buyer does not have enough diamonds.")
            }

            let escrowTransactionId = uuidv4()

            await this.offchainEventService.createTeamBurnEvent(buyerPaymentTeam._id, diamondAmount, escrowTransactionId, options)

            tmo.escrowTransactionId = escrowTransactionId

        }

        await this.put(tmo, options)

        return tmo

    }

    async cancelTeamMarketOffer(tmo: TeamMarketOffer, options?: any): Promise<TeamMarketOffer> {

        if (tmo.status != TeamMarketOfferStatus.PENDING) {
            throw new Error("Team market offer is not pending.")
        }

        let settlementTransactionId = uuidv4()

        if (tmo.buyerPaymentTeamId && tmo.escrowTransactionId && BigInt(tmo.diamondAmount) > BigInt(0)) {

            await this.offchainEventService.createTeamMintEvent(
                tmo.buyerPaymentTeamId,
                tmo.diamondAmount,
                {
                    type: "team-market-offer-cancelled",
                    teamMarketOfferId: tmo._id,
                    escrowTransactionId: tmo.escrowTransactionId
                },
                settlementTransactionId,
                options
            )

        }

        tmo.status = TeamMarketOfferStatus.CANCELLED
        tmo.settlementTransactionId = settlementTransactionId

        await this.put(tmo, options)

        return tmo

    }

    async acceptAndProcessTeamMarketOffer(user: User, tmo: TeamMarketOffer, date: Date, options?: any): Promise<TeamMarketOffer> {

        if (tmo.status != TeamMarketOfferStatus.PENDING) {
            throw new Error("Team market offer is not pending.")
        }

        if (!tmo.buyerUserId || !tmo.buyerPaymentTeamId || !tmo.escrowTransactionId) {
            throw new Error("Team market offer is not a private buy offer.")
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

        if (buyerRosterSize + 1 > DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize) {
            throw new Error("Buyer roster is full.")
        }

        let settlementTransactionId = uuidv4()
        let changedTlsByTeamId: Map<string, TeamLeagueSeason> = new Map()

        let player: Player = await this.playerService.get(tmo.salePlayerId, options)
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

        let privateBuyOffers: TeamMarketOffer[] = await this.teamMarketOfferRepository.listPendingPrivateBuyOffersByPlayerId(player._id, options)

        for (let privateBuyOffer of privateBuyOffers) {

            if (privateBuyOffer._id == tmo._id) {
                continue
            }

            await this.cancelTeamMarketOffer(privateBuyOffer, options)

        }

        let saleListing: TeamMarketOffer | undefined = await this.teamMarketOfferRepository.getPendingSaleListingByPlayerId(player._id, options)

        if (saleListing && saleListing._id != tmo._id && saleListing.sellerUserId == user._id) {
            await this.cancelTeamMarketOffer(saleListing, options)
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

            let assignedPLS: PlayerLeagueSeason

            let inactivePlss = await this.playerLeagueSeasonService.getMostRecentInactiveByUserSeason(user, season, options)

            let inactivePls = inactivePlss.find(pls => pls.primaryPosition == position)

            if (inactivePls) {

                let inactivePlayer = await this.playerService.get(inactivePls.playerId, options)

                await this.activatePlayer(user, team, inactivePlayer, date, options)

                assignedPLS = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(inactivePlayer, season, options)

            } else {

                let freeAgentPlss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getFreeAgentsByPosition(position, season, 1, 0, options)

                let pls: PlayerLeagueSeason
                let player: Player

                if (minimumOnly || freeAgentPlss?.length < 1) {

                    player = await this.playerService.scoutPlayer({
                        onDate: dayjs(date).format("YYYY-MM-DD"),
                        type: position
                    })

                    await this.playerService.put(player, options)

                    pls = await this.playerLeagueSeasonService.createPlayerLeagueSeason(player, season, 1, options)

                } else {

                    pls = await this.playerLeagueSeasonService.getById(freeAgentPlss[0]._id, options)
                    player = await this.playerService.get(freeAgentPlss[0].playerId, options)

                }

                assignedPLS = await this.signAvailablePlayer(user, player, pls, team, tls, season, date, offChainEventTransactionId, options)

            }

            roster.push(assignedPLS)

            let addedPlayer = await this.playerService.get(assignedPLS.playerId, options)

            added.players.push(addedPlayer)
            added.plss.push(assignedPLS)

        }

        if (shuffled?.length > 0) {

            let currentTeamPLSS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)

            this.teamService.setLineupValidityAllowTiredStarters(
                team,
                tls,
                currentTeamPLSS.map(pls => pls.get({ plain: true }))
            )

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
        let submittedPlayerIds = new Set(playerIds)

        if (submittedPlayerIds.size != currentTeamPlayerIds.size) {
            throw new Error("Roster must include every player assigned to the team.")
        }

        for (let playerId of playerIds) {

            let player: Player = await this.playerService.get(playerId, options)
            let pls: PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

            if (pls.userId != team.userId) {
                throw new Error("Invalid player in roster.")
            }

            if (pls.teamId != team._id) {
                throw new Error("Invalid player in roster.")
            }

            if (!currentTeamPlayerIds.has(playerId)) {
                throw new Error("Invalid player in roster.")
            }

        }

        for (let playerId of currentTeamPlayerIds) {
            if (!submittedPlayerIds.has(playerId)) {
                throw new Error("Roster must include every player assigned to the team.")
            }
        }

        await this.updatePitcherMaxPitchCountsForLineups(lineups, options)

        currentTLS.lineups = lineups
        currentTLS.changed("lineups", true)

        let updatedTeamPLSPlain = currentTeamPLS.map(pls => pls.get({ plain: true }))

        try {

            for (let lineup of currentTLS.lineups) {
                this.validateLineupHasOnePlayerAtEachPosition(lineup)
            }

            this.teamService.setLineupValidityAllowTiredStarters(team, currentTLS, updatedTeamPLSPlain)

        } catch (e) {

            let error = e as Error

            if (
                !error.message.includes("not enough") &&
                !error.message.includes("Not enough") &&
                !error.message.includes("does not have enough") &&
                !error.message.includes("must have") &&
                !error.message.includes("Lineup must have exactly one")
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


    private assertPlayerExistsInLineups(lineups: Lineup[], playerId: string) {

        let playerExistsInLineups = lineups.some(lineup =>
            lineup.order?.some(p => p?._id == playerId) ||
            lineup.rotation?.some(p => p?._id == playerId) ||
            lineup.availableHitters?.some(p => p?._id == playerId) ||
            lineup.availablePitchers?.some(p => p?.playerId == playerId)
        )

        if (!playerExistsInLineups) {
            throw new Error("Activated player was not added to the team roster.")
        }

    }

    private validateLineupHasOnePlayerAtEachPosition(lineup: Lineup) {

        let requiredPositions = [
            Position.CATCHER,
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE,
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD
        ]

        for (let position of requiredPositions) {

            let playersAtPosition = lineup.order.filter(p =>
                p?._id != undefined &&
                p.position == position
            )

            if (playersAtPosition.length != 1) {
                throw new Error(`Lineup must have exactly one ${position}.`)
            }

        }

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

    private async movePlayerToUser(player: Player, pls: PlayerLeagueSeason, user: User, season: Season, date: Date, options?: any): Promise<PlayerLeagueSeason> {

        let currentPLS: PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

        if (currentPLS.userId == user._id && !currentPLS.teamId) {
            return currentPLS
        }

        if (currentPLS.userId && currentPLS.userId != user._id) {
            throw new Error("Player is already owned.")
        }

        if (!currentPLS.userId && !this.isZeroAddressUser(user)) {
            let userRosterSize = await this.playerLeagueSeasonService.getMostRecentCountByUserSeason(user._id, season, options)

            if (userRosterSize >= DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize) {
                throw new Error("User roster is full.")
            }
        }

        pls = currentPLS

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

    private removePlayerFromLineups(lineups: Lineup[], playerId: string) {

        for (let lineup of lineups) {

            if (lineup.order) {
                for (let i = 0; i < lineup.order.length; i++) {
                    if (lineup.order[i]?._id == playerId) {
                        lineup.order[i] = {
                            position: lineup.order[i].position
                        } as any
                    }
                }
            }

            if (lineup.rotation) {
                for (let i = 0; i < lineup.rotation.length; i++) {
                    if (lineup.rotation[i]?._id == playerId) {
                        lineup.rotation[i] = {} as any
                    }
                }
            }

            if (lineup.availableHitters) {
                lineup.availableHitters = lineup.availableHitters.filter(p => p?._id != playerId)
            }

            if (lineup.availablePitchers) {
                lineup.availablePitchers = lineup.availablePitchers.filter(p => p?.playerId != playerId)
            }

        }

    }

    private isZeroAddressUser(user: User): boolean {
        return user.address?.toLowerCase() == "0x0000000000000000000000000000000000000000"
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