import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { SchemaService } from "../src/service/data/schema-service.js"
import { TeamTransactionService } from "../src/service/data/team-transaction-service.js"
import { PlayerService } from "../src/service/data/player-service.js"
import { PlayerLeagueSeasonService } from "../src/service/data/player-league-season-service.js"
import { TeamLeagueSeasonService } from "../src/service/data/team-league-season-service.js"
import { OffchainEventService } from "../src/service/data/offchain-event-service.js"

import { TeamRepository } from "../src/repository/team-repository.js"
import { LeagueRepository } from "../src/repository/league-repository.js"
import { SeasonRepository } from "../src/repository/season-repository.js"
import { TeamQueueRepository } from "../src/repository/team-queue-repository.js"

import { v4 as uuidv4 } from "uuid"

import { Team } from "../src/dto/team.js"
import { League } from "../src/dto/league.js"
import { Season } from "../src/dto/season.js"
import { Player } from "../src/dto/player.js"
import { PlayerLeagueSeason } from "../src/dto/player-league-season.js"
import { TeamLeagueSeason } from "../src/dto/team-league-season.js"
import { TeamQueue } from "../src/dto/team-queue.js"
import { User } from "../src/dto/user.js"

import { ContractType, DEFAULT_DROP_PLAYER_DIAMONDS, DEFAULT_MAX_PITCH_COUNT, DEFAULT_ROSTER_CONSTRAINTS, PersonalityType, TeamMarketOfferStatus } from "../src/service/enums.js"
import { Handedness, PitchType, Position } from "baseball-sim-engine"
import { PitchingRoleType } from "baseball-sim-engine"
import { TeamMarketOffer } from "../src/dto/team-market-offer.js"

describe("TeamTransactionService", async () => {
    let seasonIndex = 0
    let service:TeamTransactionService
    let playerService:PlayerService
    let playerLeagueSeasonService:PlayerLeagueSeasonService
    let teamLeagueSeasonService:TeamLeagueSeasonService
    let offchainEventService:OffchainEventService

    let teamRepository:TeamRepository
    let leagueRepository:LeagueRepository
    let seasonRepository:SeasonRepository
    let teamQueueRepository:TeamQueueRepository
    let schemaService:SchemaService

    before("", async () => {

        let container = getContainer()

        service = container.get(TeamTransactionService)
        playerService = container.get(PlayerService)
        playerLeagueSeasonService = container.get(PlayerLeagueSeasonService)
        teamLeagueSeasonService = container.get(TeamLeagueSeasonService)
        offchainEventService = container.get(OffchainEventService)

        teamRepository = container.get("TeamRepository")
        leagueRepository = container.get("LeagueRepository")
        seasonRepository = container.get("SeasonRepository")
        teamQueueRepository = container.get("TeamQueueRepository")
        schemaService = container.get(SchemaService)

        await schemaService.load()
        await teamQueueRepository.clear()

    })

    it("should not sign a player that is already owned", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Signing Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)
        await createTestTeamLeagueSeason(team, league, season)

        await assert.rejects(
            async () => service.signFreeAgent(user, player, team, new Date(), uuidv4()),
            /Player is not a free agent./
        )

    })

    it("should not sign a player for the wrong user", async () => {

        let owner:User = await createTestUser()
        let wrongUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Signing Team", owner)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, undefined, league, season)
        await createTestTeamLeagueSeason(team, league, season)
        await giveTeamDiamonds(team, "1000000")

        await assert.rejects(
            async () => service.signFreeAgent(wrongUser, player, team, new Date(), uuidv4()),
            /Not authorized./
        )

    })

    it("should not sign a player when the team does not have enough diamonds", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Poor Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, undefined, league, season)
        await createTestTeamLeagueSeason(team, league, season)

        await assert.rejects(
            async () => service.signFreeAgent(user, player, team, new Date(), uuidv4()),
            /Team does not have enough diamonds to sign this player./
        )

    })

    it("should not sign a player when the user roster is full", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Full User Roster Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize; i++) {
            let ownedPlayer:Player = await createTestPlayer(Position.CATCHER)
            await createTestPlayerLeagueSeason(ownedPlayer, user, undefined, league, season)
        }

        await createTestPlayerLeagueSeason(player, undefined, undefined, league, season)
        await createTestTeamLeagueSeason(team, league, season)
        await giveTeamDiamonds(team, "1000000000000000000000000")

        await assert.rejects(
            async () => service.signFreeAgent(user, player, team, new Date(), uuidv4()),
            /User roster is full./
        )

    })

    

    it("should sign a player to the user and assign to the team when the active roster has space", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Signing Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, undefined, league, season)
        await createTestTeamLeagueSeason(team, league, season)
        await giveTeamDiamonds(team, "1000000000000000000000000")

        await service.signFreeAgent(user, player, team, new Date(), uuidv4())

        let fetchedPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let tls:TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)
        let balance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)

        assert.equal(fetchedPls.userId, user._id)
        assert.equal(fetchedPls.teamId, team._id)
        assert.equal(tls.lineups[0].order.some(p => p._id == player._id), true)
        assert.equal(BigInt(balance) < BigInt("1000000000000000000000000"), true)

    })

    it("should sign a player to the user and assign them to the bench when there is no active lineup need for that position", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Signing Team", user)
        let activeCatcher:Player = await createTestPlayer(Position.CATCHER)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(activeCatcher, user, team, league, season)
        await createTestPlayerLeagueSeason(player, undefined, undefined, league, season)

        let tls:TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        tls.lineups[0].order[0] = {
            _id: activeCatcher._id,
            position: Position.CATCHER
        } as any

        tls.changed("lineups", true)
        await teamLeagueSeasonService.put(tls)

        await giveTeamDiamonds(team, "1000000000000000000000000")

        await service.signFreeAgent(user, player, team, new Date(), uuidv4())

        let fetchedPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let fetchedTLS:TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)
        let balance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)

        assert.equal(fetchedPls.userId, user._id)
        assert.equal(fetchedPls.teamId, team._id)
        assert.equal(fetchedTLS.lineups[0].order.some(p => p._id == player._id), false)
        assert.equal(fetchedTLS.lineups[0].availableHitters.some(p => p._id == player._id), true)
        assert.equal(BigInt(balance) < BigInt("1000000000000000000000000"), true)

    })


    it("should reject update roster when a user-owned unassigned player is in the bench payload", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Reject Unassigned Bench Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        let assignedPlayer: Player = await createTestPlayer(Position.FIRST_BASE)
        let omittedAssignedPlayer: Player = await createTestPlayer(Position.SECOND_BASE)
        let unassignedPlayer: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(assignedPlayer, user, team, league, season)
        await createTestPlayerLeagueSeason(omittedAssignedPlayer, user, team, league, season)
        await createTestPlayerLeagueSeason(unassignedPlayer, user, undefined, league, season)

        tls.lineups[0].order[0] = {
            _id: assignedPlayer._id,
            position: Position.FIRST_BASE
        } as any

        tls.lineups[0].availableHitters = [
            {
                _id: unassignedPlayer._id
            } as any
        ]

        await assert.rejects(
            async () => service.updateRoster(tls.lineups, team),
            /Invalid player in roster./
        )

    })
   

    it("should drop a bench hitter and remove them from available hitters", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Drop Bench Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, team, league, season)

        let tls:TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        tls.lineups[0].availableHitters = [
            {
                _id: player._id,
                position: Position.CATCHER
            } as any
        ]

        tls.changed("lineups", true)
        await teamLeagueSeasonService.put(tls)

        await giveTeamDiamonds(team, "1000000000000000000000000")

        await service.dropPlayer(user, player, new Date())

        let fetchedTLS:TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

        assert.equal(currentPls.userId, undefined)
        assert.equal(currentPls.teamId, undefined)
        assert.equal(fetchedTLS.lineups[0].availableHitters.some(p => p._id == player._id), false)

    })


    it("should accept and process a team market offer for a bench hitter and remove them from seller available hitters", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, sellerUser, sellerTeam, league, season)

        await createTestTeamLeagueSeason(buyerTeam, league, season)

        let sellerTLS:TeamLeagueSeason = await createTestTeamLeagueSeason(sellerTeam, league, season)

        sellerTLS.lineups[0].availableHitters = [
            {
                _id: player._id,
                position: Position.CATCHER
            } as any
        ]

        sellerTLS.changed("lineups", true)
        await teamLeagueSeasonService.put(sellerTLS)

        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "100"
        )

        await service.acceptAndProcessTeamMarketOffer(sellerUser, offer, new Date())

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let fetchedSellerTLS:TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(sellerTeam, season)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let allPls:PlayerLeagueSeason[] = await playerLeagueSeasonService.getByPlayersSeason([player], season)
        let endedPls:PlayerLeagueSeason | undefined = allPls.find((pls) => pls._id == originalPls._id)

        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.PROCESSED)

        assert.notEqual(endedPls, undefined)
        assert.notEqual(endedPls.endDate, undefined)

        assert.notEqual(currentPls._id, originalPls._id)
        assert.equal(currentPls.userId, buyerUser._id)
        assert.equal(currentPls.teamId, undefined)

        assert.equal(fetchedSellerTLS.lineups[0].availableHitters.some(p => p._id == player._id), false)

    })


        
    it("should not drop a player that is not owned", async () => {

        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let player:Player = await createTestPlayer(Position.CATCHER)
        let user:User = await createTestUser()

        await createTestPlayerLeagueSeason(player, undefined, undefined, league, season)

        await assert.rejects(
            async () => service.dropPlayer(user, player, new Date()),
            /Player is not owned./
        )

    })


    it("should not drop a player for the wrong user", async () => {

        let owner:User = await createTestUser()
        let wrongUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Drop Team", owner)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, owner, team, league, season)
        await createTestTeamLeagueSeason(team, league, season)
        await giveTeamDiamonds(team, "1000000000000000000000000")

        await assert.rejects(
            async () => service.dropPlayer(wrongUser, player, new Date()),
            /Not authorized./
        )

    })

    it("should drop a user-owned unassigned player and charge the user's primary team", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let paymentTeam:Team = await createTestTeam("Primary Payment Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        await giveTeamDiamonds(paymentTeam, DEFAULT_DROP_PLAYER_DIAMONDS)

        await service.dropPlayer(user, player, new Date())

        let endingBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, paymentTeam._id)
        let allPls:PlayerLeagueSeason[] = await playerLeagueSeasonService.getByPlayersSeason([player], season)
        let endedPls:PlayerLeagueSeason | undefined = allPls.find((pls) => pls._id == originalPls._id)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

        assert.equal(endingBalance, "0")

        assert.notEqual(endedPls, undefined)
        assert.equal(endedPls.userId, user._id)
        assert.equal(endedPls.teamId, undefined)
        assert.notEqual(endedPls.endDate, undefined)

        assert.notEqual(currentPls._id, originalPls._id)
        assert.equal(currentPls.userId, undefined)
        assert.equal(currentPls.teamId, undefined)

    })

    it("should dequeue and drop a player when the team is queued", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Queued Drop Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, team, league, season)
        await createTestTeamLeagueSeason(team, league, season)
        await createTeamQueue(team, league)
        await giveTeamDiamonds(team, "1000000000000000000000000")

        await service.dropPlayer(user, player, new Date())

        let queued = await teamQueueRepository.isTeamQueued(team)

        assert.equal(queued, false)

        let pls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

        assert.equal(pls.teamId, undefined)

    })

    it("should not drop a player when the team does not have enough diamonds", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Poor Drop Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, team, league, season)
        await createTestTeamLeagueSeason(team, league, season)

        await assert.rejects(
            async () => service.dropPlayer(user, player, new Date()),
            /Team does not have enough diamonds to drop this player./
        )

    })

    it("should drop a player and release ownership", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Drop Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, user, team, league, season)

        await createTestTeamLeagueSeason(team, league, season)
        await giveTeamDiamonds(team, "1000000000000000000000000")

        let startingBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)

        await service.dropPlayer(user, player, new Date())

        let endingBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)
        let allPls:PlayerLeagueSeason[] = await playerLeagueSeasonService.getByPlayersSeason([player], season)
        let endedPls:PlayerLeagueSeason | undefined = allPls.find((pls) => pls._id == originalPls._id)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

        assert.notEqual(endedPls, undefined)
        assert.equal(endedPls.teamId, team._id)
        assert.equal(endedPls.userId, user._id)
        assert.notEqual(endedPls.endDate, undefined)

        assert.notEqual(currentPls._id, originalPls._id)
        assert.equal(currentPls.userId, undefined)
        assert.equal(currentPls.teamId, undefined)

        assert.equal(BigInt(endingBalance), BigInt(startingBalance) - BigInt(DEFAULT_DROP_PLAYER_DIAMONDS))

    })

    it("should drop a player when the team has enough diamonds for the drop cost", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Exact Drop Cost Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, team, league, season)
        await createTestTeamLeagueSeason(team, league, season)
        await giveTeamDiamonds(team, DEFAULT_DROP_PLAYER_DIAMONDS)

        await service.dropPlayer(user, player, new Date())

        let endingBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

        assert.equal(endingBalance, "0")
        assert.equal(currentPls.userId, undefined)
        assert.equal(currentPls.teamId, undefined)

    })

    it("should drop a player and cancel pending team market offers for that player", async () => {

        let user:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", user)
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, user, sellerTeam, league, season)

        await createTestTeamLeagueSeason(sellerTeam, league, season)
        await giveTeamDiamonds(sellerTeam, "1000000000000000000000000")
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "100"
        )

        let escrowedBuyerBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(escrowedBuyerBalance, "900")

        await service.dropPlayer(user, player, new Date())

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let refundedBuyerBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.notEqual(fetchedOffer.settlementTransactionId, undefined)
        assert.equal(refundedBuyerBalance, "1000")

        assert.notEqual(currentPls._id, originalPls._id)
        assert.equal(currentPls.userId, undefined)
        assert.equal(currentPls.teamId, undefined)

    })


    it("should create a team for a user", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()

        let result:{ team:Team, tls:TeamLeagueSeason } = await service.createForUser(user, league, season)

        let team:Team = result.team
        let tls:TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.notEqual(team._id, undefined)
        assert.equal(team.userId, user._id)
        assert.equal(team.name, user.discordProfile.global_name)
        assert.notEqual(team.colors, undefined)
        assert.equal(team.developmentStrategy.budgetPercent, 50)

        assert.notEqual(tls._id, undefined)
        assert.equal(tls.teamId, team._id)
        assert.equal(tls.leagueId, league._id)
        assert.equal(tls.seasonId, season._id)
        assert.notEqual(tls.logoId, undefined)

    })

    it("should create and assign the initial roster to the user and team", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()

        let result:{ team:Team, tls:TeamLeagueSeason } = await service.createForUser(user, league, season)

        let plss:PlayerLeagueSeason[] = await playerLeagueSeasonService.getMostRecentByTeamSeason(result.team, season)

        assert.equal(plss.length, DEFAULT_ROSTER_CONSTRAINTS.maxTeamRosterSize)
        assert.equal(plss.every(pls => pls.userId == user._id), true)
        assert.equal(plss.every(pls => pls.teamId == result.team._id), true)
        assert.equal(plss.every(pls => pls.leagueId == league._id), true)

        assert.equal(plss.filter(pls => pls.primaryPosition == Position.PITCHER).length, DEFAULT_ROSTER_CONSTRAINTS.minPitchers)
        assert.equal(plss.filter(pls => pls.primaryPosition != Position.PITCHER).length, 13)

        assert.equal(plss.filter(pls => [
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE
        ].includes(pls.primaryPosition)).length, 7)

        assert.equal(plss.filter(pls => [
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD
        ].includes(pls.primaryPosition)).length, 5)

    })

    it("should create a valid initial lineup", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()

        let result:{ team:Team, tls:TeamLeagueSeason } = await service.createForUser(user, league, season)

        let tls:TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(result.team, season)

        assert.equal(tls.hasValidLineup, true)
        assert.equal(tls.lineups[0].valid, true)
        assert.equal(tls.lineups[0].order.filter(p => p._id != undefined).length, 8)
        assert.equal(tls.lineups[0].order.filter(p => p._id == undefined && p.position == Position.PITCHER).length, 1)
        assert.equal(tls.lineups[0].rotation.filter(p => p._id != undefined).length, DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers)
        assert.equal(tls.lineups[0].availableHitters.length, 5)
        assert.equal(tls.lineups[0].availablePitchers.length, DEFAULT_ROSTER_CONSTRAINTS.minBullpenPitchers)
        assert.equal(tls.lineups[0].availablePitchers.filter(p => p.role == PitchingRoleType.CLOSER).length, DEFAULT_ROSTER_CONSTRAINTS.minClosers)
        assert.equal(tls.lineups[0].availablePitchers.filter(p => p.role == PitchingRoleType.SETUP).length, DEFAULT_ROSTER_CONSTRAINTS.minSetupRelievers)
        assert.equal(tls.lineups[0].availablePitchers.filter(p => p.role == PitchingRoleType.MIDDLE).length, DEFAULT_ROSTER_CONSTRAINTS.minMiddleRelievers)
        assert.equal(tls.lineups[0].availablePitchers.filter(p => p.role == PitchingRoleType.LONG).length, DEFAULT_ROSTER_CONSTRAINTS.minLongRelievers)
        assert.equal(tls.lineups[0].availablePitchers.filter(p => p.role == PitchingRoleType.MOP_UP).length, DEFAULT_ROSTER_CONSTRAINTS.minMopUpRelievers)

    })

    it("should fill and validate a team with a full lineup and rotation but no bullpen", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Missing Bullpen Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        let roster: PlayerLeagueSeason[] = []

        let positions = [
            Position.CATCHER,
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE,
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD,
        ]

        for (let i = 0; i < positions.length; i++) {
            let player: Player = await createTestPlayer(positions[i])
            let pls: PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, user, team, league, season)

            pls.player = player
            roster.push(pls)

            tls.lineups[0].order[i] = {
                _id: player._id,
                position: positions[i]
            } as any
        }

        tls.lineups[0].order[8] = {
            position: Position.PITCHER
        } as any

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers; i++) {
            let player: Player = await createTestPlayer(Position.PITCHER)
            let pls: PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, user, team, league, season)

            pls.player = player
            roster.push(pls)

            tls.lineups[0].rotation[i] = {
                _id: player._id
            } as any
        }

        tls.lineups[0].availablePitchers = []

        tls.lineups[0].valid = false
        tls.hasValidLineup = false

        tls.changed("lineups", true)
        tls.changed("hasValidLineup", true)

        await teamLeagueSeasonService.put(tls)

        await service.fillAndValidateRoster(user, team, tls, roster, season, season.startDate, true)

        let finalTLS: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)
        let finalPLSS: PlayerLeagueSeason[] = await playerLeagueSeasonService.getMostRecentByTeamSeason(team, season)

        assert.equal(finalPLSS.length, DEFAULT_ROSTER_CONSTRAINTS.maxTeamRosterSize)
        assert.equal(finalPLSS.filter(pls => pls.primaryPosition == Position.PITCHER).length, DEFAULT_ROSTER_CONSTRAINTS.minPitchers)
        assert.equal(finalPLSS.filter(pls => pls.primaryPosition != Position.PITCHER).length, 13)

        assert.equal(finalPLSS.filter(pls => [
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE
        ].includes(pls.primaryPosition)).length, 7)

        assert.equal(finalPLSS.filter(pls => [
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD
        ].includes(pls.primaryPosition)).length, 5)

        assert.equal(finalTLS.hasValidLineup, true)
        assert.equal(finalTLS.lineups[0].valid, true)

        assert.equal(finalTLS.lineups[0].order.filter(p => p._id != undefined).length, 8)
        assert.equal(finalTLS.lineups[0].order.filter(p => p._id == undefined && p.position == Position.PITCHER).length, 1)
        assert.equal(finalTLS.lineups[0].rotation.filter(p => p._id != undefined).length, DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers)

        assert.equal(finalTLS.lineups[0].availablePitchers.length, DEFAULT_ROSTER_CONSTRAINTS.minBullpenPitchers)
        assert.equal(finalTLS.lineups[0].availablePitchers.filter(p => p.role == PitchingRoleType.CLOSER).length, DEFAULT_ROSTER_CONSTRAINTS.minClosers)
        assert.equal(finalTLS.lineups[0].availablePitchers.filter(p => p.role == PitchingRoleType.SETUP).length, DEFAULT_ROSTER_CONSTRAINTS.minSetupRelievers)
        assert.equal(finalTLS.lineups[0].availablePitchers.filter(p => p.role == PitchingRoleType.MIDDLE).length, DEFAULT_ROSTER_CONSTRAINTS.minMiddleRelievers)
        assert.equal(finalTLS.lineups[0].availablePitchers.filter(p => p.role == PitchingRoleType.LONG).length, DEFAULT_ROSTER_CONSTRAINTS.minLongRelievers)
        assert.equal(finalTLS.lineups[0].availablePitchers.filter(p => p.role == PitchingRoleType.MOP_UP).length, DEFAULT_ROSTER_CONSTRAINTS.minMopUpRelievers)
        assert.equal(finalTLS.lineups[0].availablePitchers.every(p => p.priority != undefined && p.priority > 0), true)

    })


    it("should reject update roster when the player is owned by another user", async () => {

        let owner: User = await createTestUser()
        let otherUser: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Update Roster Team", owner)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        let assignedPlayer: Player = await createTestPlayer(Position.FIRST_BASE)
        let omittedAssignedPlayer: Player = await createTestPlayer(Position.SECOND_BASE)
        let invalidPlayer: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(assignedPlayer, owner, team, league, season)
        await createTestPlayerLeagueSeason(omittedAssignedPlayer, owner, team, league, season)
        await createTestPlayerLeagueSeason(invalidPlayer, otherUser, undefined, league, season)

        tls.lineups[0].order[0] = {
            _id: assignedPlayer._id,
            position: Position.FIRST_BASE
        } as any

        tls.lineups[0].order[1] = {
            _id: invalidPlayer._id,
            position: Position.CATCHER
        } as any

        await assert.rejects(
            async () => service.updateRoster(tls.lineups, team),
            /Invalid player in roster./
        )

    })

    it("should reject update roster when the player is assigned to another team", async () => {

        let owner: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Update Roster Team", owner)
        let otherTeam: Team = await createTestTeam("Other Update Roster Team", owner)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        let assignedPlayer: Player = await createTestPlayer(Position.FIRST_BASE)
        let omittedAssignedPlayer: Player = await createTestPlayer(Position.SECOND_BASE)
        let invalidPlayer: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(assignedPlayer, owner, team, league, season)
        await createTestPlayerLeagueSeason(omittedAssignedPlayer, owner, team, league, season)
        await createTestPlayerLeagueSeason(invalidPlayer, owner, otherTeam, league, season)

        tls.lineups[0].order[0] = {
            _id: assignedPlayer._id,
            position: Position.FIRST_BASE
        } as any

        tls.lineups[0].order[1] = {
            _id: invalidPlayer._id,
            position: Position.CATCHER
        } as any

        await assert.rejects(
            async () => service.updateRoster(tls.lineups, team),
            /Invalid player in roster./
        )

    })

    it("should reject update roster when an assigned team player is omitted from the roster payload", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Omitted Player Roster Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, team, league, season)

        tls.lineups[0].order[0] = {
            position: Position.CATCHER
        } as any

        await assert.rejects(
            async () => service.updateRoster(tls.lineups, team),
            /Roster must include every player assigned to the team./
        )

    })

    it("should lower max pitch count when update roster moves pitchers to bullpen roles", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Bullpen Max Pitch Count Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        let closer: Player = await createTestPlayer(Position.PITCHER)
        let longReliever: Player = await createTestPlayer(Position.PITCHER)
        let mopUpReliever: Player = await createTestPlayer(Position.PITCHER)

        await createTestPlayerLeagueSeason(closer, user, team, league, season)
        await createTestPlayerLeagueSeason(longReliever, user, team, league, season)
        await createTestPlayerLeagueSeason(mopUpReliever, user, team, league, season)

        tls.lineups[0].availablePitchers = [
            {
                playerId: closer._id,
                role: PitchingRoleType.CLOSER,
                priority: 1
            },
            {
                playerId: longReliever._id,
                role: PitchingRoleType.LONG,
                priority: 2
            },
            {
                playerId: mopUpReliever._id,
                role: PitchingRoleType.MOP_UP,
                priority: 3
            }
        ]

        await service.updateRoster(tls.lineups, team)

        let fetchedCloser: Player = await playerService.get(closer._id)
        let fetchedLongReliever: Player = await playerService.get(longReliever._id)
        let fetchedMopUpReliever: Player = await playerService.get(mopUpReliever._id)

        assert.equal(fetchedCloser.maxPitchCount, 30)
        assert.equal(fetchedLongReliever.maxPitchCount, 50)
        assert.equal(fetchedMopUpReliever.maxPitchCount, 60)

    })

    it("should not raise max pitch count when update roster moves a pitcher to the rotation", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Rotation Max Pitch Count Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        let pitcher: Player = await createTestPlayer(Position.PITCHER)

        pitcher.maxPitchCount = 30
        await playerService.put(pitcher)

        await createTestPlayerLeagueSeason(pitcher, user, team, league, season)

        tls.lineups[0].rotation[0] = {
            _id: pitcher._id
        } as any

        tls.lineups[0].availablePitchers = []

        await service.updateRoster(tls.lineups, team)

        let fetchedPitcher: Player = await playerService.get(pitcher._id)

        assert.equal(fetchedPitcher.maxPitchCount, 30)

    })    

    it("should not raise max pitch count when update roster changes a bullpen pitcher to a higher pitch-count bullpen role", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Bullpen No Raise Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        let pitcher: Player = await createTestPlayer(Position.PITCHER)

        pitcher.maxPitchCount = 30
        await playerService.put(pitcher)

        await createTestPlayerLeagueSeason(pitcher, user, team, league, season)

        tls.lineups[0].availablePitchers = [
            {
                playerId: pitcher._id,
                role: PitchingRoleType.MOP_UP,
                priority: 1
            }
        ]

        await service.updateRoster(tls.lineups, team)

        let fetchedPitcher: Player = await playerService.get(pitcher._id)

        assert.equal(fetchedPitcher.maxPitchCount, 30)

    })

    it("should update roster and save invalid lineup when active roster does not have enough players", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Invalid Saved Roster Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, team, league, season)

        tls.lineups[0].order[0] = {
            _id: player._id,
            position: Position.CATCHER
        } as any

        tls.lineups[0].rotation = []
        tls.lineups[0].availablePitchers = []
        tls.lineups[0].availableHitters = []

        await service.updateRoster(tls.lineups, team)

        let fetchedTLS: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.equal(fetchedTLS.hasValidLineup, false)
        assert.equal(fetchedTLS.lineups[0].valid, false)
        assert.equal(fetchedTLS.lineups[0].order[0]._id, player._id)

    })

    it("should update roster without treating existing full-team roster players as new assignments", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Resave Full Roster Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        let starterPositions = [
            Position.CATCHER,
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE,
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD
        ]

        for (let i = 0; i < starterPositions.length; i++) {
            let player: Player = await createTestPlayer(starterPositions[i])
            await createTestPlayerLeagueSeason(player, user, team, league, season)

            tls.lineups[0].order[i] = {
                _id: player._id,
                position: starterPositions[i]
            } as any
        }

        tls.lineups[0].order[8] = {
            position: Position.PITCHER
        } as any

        let benchPositions = [
            Position.CATCHER,
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.LEFT_FIELD,
            Position.CENTER_FIELD
        ]

        tls.lineups[0].availableHitters = []

        for (let position of benchPositions) {
            let player: Player = await createTestPlayer(position)
            await createTestPlayerLeagueSeason(player, user, team, league, season)

            tls.lineups[0].availableHitters.push({
                _id: player._id
            } as any)
        }

        tls.lineups[0].rotation = []

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers; i++) {
            let player: Player = await createTestPlayer(Position.PITCHER)
            await createTestPlayerLeagueSeason(player, user, team, league, season)

            tls.lineups[0].rotation.push({
                _id: player._id
            } as any)
        }

        tls.lineups[0].availablePitchers = []

        let bullpenRoles = [
            ...Array(DEFAULT_ROSTER_CONSTRAINTS.minClosers).fill(PitchingRoleType.CLOSER),
            ...Array(DEFAULT_ROSTER_CONSTRAINTS.minSetupRelievers).fill(PitchingRoleType.SETUP),
            ...Array(DEFAULT_ROSTER_CONSTRAINTS.minMiddleRelievers).fill(PitchingRoleType.MIDDLE),
            ...Array(DEFAULT_ROSTER_CONSTRAINTS.minLongRelievers).fill(PitchingRoleType.LONG),
            ...Array(DEFAULT_ROSTER_CONSTRAINTS.minMopUpRelievers).fill(PitchingRoleType.MOP_UP)
        ]

        for (let i = 0; i < bullpenRoles.length; i++) {
            let player: Player = await createTestPlayer(Position.PITCHER)
            await createTestPlayerLeagueSeason(player, user, team, league, season)

            tls.lineups[0].availablePitchers.push({
                playerId: player._id,
                role: bullpenRoles[i],
                priority: i + 1
            })
        }

        tls.changed("lineups", true)
        await teamLeagueSeasonService.put(tls)

        await service.updateRoster(tls.lineups, team)

        let fetchedPLSS: PlayerLeagueSeason[] = await playerLeagueSeasonService.getMostRecentByTeamSeason(team, season)
        let fetchedTLS: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.equal(fetchedPLSS.length, DEFAULT_ROSTER_CONSTRAINTS.maxTeamRosterSize)
        assert.equal(fetchedTLS.lineups[0].order.filter(p => p._id != undefined).length, 8)
        assert.equal(fetchedTLS.lineups[0].availableHitters.length, 5)
        assert.equal(fetchedTLS.lineups[0].rotation.filter(p => p._id != undefined).length, DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers)
        assert.equal(fetchedTLS.lineups[0].availablePitchers.length, DEFAULT_ROSTER_CONSTRAINTS.minBullpenPitchers)

    })

    it("should activate a user-owned player to the team roster and active lineup", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Activate Active Roster Team", user)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestTeamLeagueSeason(team, league, season)
        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        await service.activatePlayer(user, team, player, new Date())

        let fetchedPLS: PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let fetchedTLS: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.equal(fetchedPLS.userId, user._id)
        assert.equal(fetchedPLS.teamId, team._id)
        assert.equal(fetchedTLS.lineups[0].order.some(p => p._id == player._id), true)

    })

    it("should activate a user-owned hitter to the bench when active lineup has no empty hitter spots", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Activate Bench Roster Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        let positions = [
            Position.CATCHER,
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE,
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD
        ]

        for (let i = 0; i < positions.length; i++) {
            let activePlayer: Player = await createTestPlayer(positions[i])
            await createTestPlayerLeagueSeason(activePlayer, user, team, league, season)

            tls.lineups[0].order[i] = {
                _id: activePlayer._id,
                position: positions[i]
            } as any
        }

        tls.lineups[0].order[8] = {
            position: Position.PITCHER
        } as any

        let benchCatcher: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(benchCatcher, user, undefined, league, season)

        tls.changed("lineups", true)
        await teamLeagueSeasonService.put(tls)

        await service.activatePlayer(user, team, benchCatcher, new Date())

        let fetchedPLS: PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(benchCatcher, season)
        let fetchedTLS: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.equal(fetchedPLS.teamId, team._id)
        assert.equal(fetchedTLS.lineups[0].order.some(p => p._id == benchCatcher._id), false)
        assert.equal(fetchedTLS.lineups[0].availableHitters.some(p => p._id == benchCatcher._id), true)

    })

    it("should reject activating a hitter when the bench is full and there is no lineup spot for their position", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Full Bench Activate Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        let starterPositions = [
            Position.CATCHER,
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE,
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD
        ]

        for (let i = 0; i < starterPositions.length; i++) {
            let starter: Player = await createTestPlayer(starterPositions[i])
            await createTestPlayerLeagueSeason(starter, user, team, league, season)

            tls.lineups[0].order[i] = {
                _id: starter._id,
                position: starterPositions[i]
            } as any
        }

        tls.lineups[0].order[8] = {
            position: Position.PITCHER
        } as any

        tls.lineups[0].availableHitters = []

        for (let i = 0; i < 5; i++) {
            let benchPlayer: Player = await createTestPlayer(Position.FIRST_BASE)
            await createTestPlayerLeagueSeason(benchPlayer, user, team, league, season)

            tls.lineups[0].availableHitters.push({
                _id: benchPlayer._id
            } as any)
        }

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        tls.changed("lineups", true)
        await teamLeagueSeasonService.put(tls)

        await assert.rejects(
            async () => service.activatePlayer(user, team, player, new Date()),
            /Bench is full and there is no lineup spot available for this player./
        )

        let fetchedPLS: PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

        assert.equal(fetchedPLS.userId, user._id)
        assert.equal(fetchedPLS.teamId, undefined)

    })    

    it("should deactivate a team roster player and keep them user owned", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Deactivate Player Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, team, league, season)

        tls.lineups[0].order[0] = {
            _id: player._id,
            position: Position.CATCHER
        } as any

        tls.changed("lineups", true)
        await teamLeagueSeasonService.put(tls)

        await service.deactivatePlayer(user, team, player, new Date())

        let fetchedPLS: PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let fetchedTLS: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.equal(fetchedPLS.userId, user._id)
        assert.equal(fetchedPLS.teamId, undefined)
        assert.equal(fetchedTLS.lineups[0].order.some(p => p._id == player._id), false)

    })

    it("should reject activating a player for the wrong team user", async () => {

        let owner: User = await createTestUser()
        let wrongUser: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Wrong User Activate Team", owner)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestTeamLeagueSeason(team, league, season)
        await createTestPlayerLeagueSeason(player, owner, undefined, league, season)

        await assert.rejects(
            async () => service.activatePlayer(wrongUser, team, player, new Date()),
            /Not authorized./
        )

    })

    it("should reject deactivating a player for the wrong team user", async () => {

        let owner: User = await createTestUser()
        let wrongUser: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Wrong User Deactivate Team", owner)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestTeamLeagueSeason(team, league, season)
        await createTestPlayerLeagueSeason(player, owner, team, league, season)

        await assert.rejects(
            async () => service.deactivatePlayer(wrongUser, team, player, new Date()),
            /Not authorized./
        )

    })

    it("should reject activating a player owned by another user", async () => {

        let owner: User = await createTestUser()
        let otherUser: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Other User Activate Team", owner)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestTeamLeagueSeason(team, league, season)
        await createTestPlayerLeagueSeason(player, otherUser, undefined, league, season)

        await assert.rejects(
            async () => service.activatePlayer(owner, team, player, new Date()),
            /Player is not owned by this user./
        )

    })

    it("should reject deactivating a player owned by another user", async () => {

        let owner: User = await createTestUser()
        let otherUser: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Other User Deactivate Team", owner)
        let otherTeam: Team = await createTestTeam("Other Team", otherUser)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestTeamLeagueSeason(team, league, season)
        await createTestPlayerLeagueSeason(player, otherUser, otherTeam, league, season)

        await assert.rejects(
            async () => service.deactivatePlayer(owner, team, player, new Date()),
            /Player is not owned by this user./
        )

    })

    it("should reject activating a player already assigned to a team", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Activate Existing Team", user)
        let otherTeam: Team = await createTestTeam("Already Assigned Team", user)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestTeamLeagueSeason(team, league, season)
        await createTestPlayerLeagueSeason(player, user, otherTeam, league, season)

        await assert.rejects(
            async () => service.activatePlayer(user, team, player, new Date()),
            /Player is already assigned to a team./
        )

    })

    it("should reject deactivating a player not assigned to this team", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Deactivate Wrong Team", user)
        let otherTeam: Team = await createTestTeam("Other Assigned Team", user)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestTeamLeagueSeason(team, league, season)
        await createTestPlayerLeagueSeason(player, user, otherTeam, league, season)

        await assert.rejects(
            async () => service.deactivatePlayer(user, team, player, new Date()),
            /Player is not assigned to this team./
        )

    })

    it("should reject activating a player when the team roster is full", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Full Activate Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTeamRosterSize; i++) {
            let rosterPlayer: Player = await createTestPlayer(i < DEFAULT_ROSTER_CONSTRAINTS.minPitchers ? Position.PITCHER : Position.CATCHER)
            await createTestPlayerLeagueSeason(rosterPlayer, user, team, league, season)
        }

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        await assert.rejects(
            async () => service.activatePlayer(user, team, player, new Date()),
            /Team roster is full./
        )

    })

    it("should reject activating a pitcher when the rotation and bullpen are full", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Full Pitching Staff Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        let player: Player = await createTestPlayer(Position.PITCHER)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers; i++) {

            let starter: Player = await createTestPlayer(Position.PITCHER)

            await createTestPlayerLeagueSeason(starter, user, team, league, season)

            tls.lineups[0].rotation.push({
                _id: starter._id
            } as any)

        }

        let bullpenRoles = [
            ...Array(DEFAULT_ROSTER_CONSTRAINTS.minClosers).fill(PitchingRoleType.CLOSER),
            ...Array(DEFAULT_ROSTER_CONSTRAINTS.minSetupRelievers).fill(PitchingRoleType.SETUP),
            ...Array(DEFAULT_ROSTER_CONSTRAINTS.minMiddleRelievers).fill(PitchingRoleType.MIDDLE),
            ...Array(DEFAULT_ROSTER_CONSTRAINTS.minLongRelievers).fill(PitchingRoleType.LONG),
            ...Array(DEFAULT_ROSTER_CONSTRAINTS.minMopUpRelievers).fill(PitchingRoleType.MOP_UP)
        ]

        for (let i = 0; i < bullpenRoles.length; i++) {

            let reliever: Player = await createTestPlayer(Position.PITCHER)

            await createTestPlayerLeagueSeason(reliever, user, team, league, season)

            tls.lineups[0].availablePitchers.push({
                playerId: reliever._id,
                role: bullpenRoles[i],
                priority: i + 1
            })

        }

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        tls.changed("lineups", true)
        await teamLeagueSeasonService.put(tls)

        await assert.rejects(
            async () => service.activatePlayer(user, team, player, new Date()),
            /Bullpen and rotation are full. There is no roster spot available for this pitcher./
        )

        let fetchedPLS: PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

        assert.equal(fetchedPLS.userId, user._id)
        assert.equal(fetchedPLS.teamId, undefined)

    })

    it("should not sign a free agent when the user roster is full even if the active lineup has an open spot", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Full User Roster Open Lineup Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize; i++) {
            let ownedPlayer: Player = await createTestPlayer(Position.FIRST_BASE)
            await createTestPlayerLeagueSeason(ownedPlayer, user, undefined, league, season)
        }

        tls.lineups[0].order[0] = {
            position: Position.CATCHER
        } as any

        tls.changed("lineups", true)
        await teamLeagueSeasonService.put(tls)

        await createTestPlayerLeagueSeason(player, undefined, undefined, league, season)
        await giveTeamDiamonds(team, "1000000000000000000000000")

        await assert.rejects(
            async () => service.signFreeAgent(user, player, team, new Date(), uuidv4()),
            /User roster is full./
        )

        let fetchedPLS: PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let fetchedTLS: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.equal(fetchedPLS.userId, undefined)
        assert.equal(fetchedPLS.teamId, undefined)
        assert.equal(fetchedTLS.lineups[0].order.some(p => p?._id == player._id), false)

    })
    

    it("should not create a private player buy offer to the same payment team", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Same Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        await assert.rejects(
            async () => service.createPrivatePlayerBuyOffer(team, team, player, "100"),
            /Buyer and seller payment teams cannot be the same./
        )

    })

    it("should not create a private player buy offer with zero diamonds", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        await assert.rejects(
            async () => service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "0"),
            /Diamond amount must be greater than zero./
        )

    })

    it("should not create a private player buy offer with negative diamonds", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        await assert.rejects(
            async () => service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "-1"),
            /Diamond amount must be greater than zero./
        )

    })

    it("should not create a private player buy offer for a player not owned by the seller", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        await assert.rejects(
            async () => service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "100"),
            /Player is not owned by the seller./
        )

    })

    it("should not create a private player buy offer when the buyer does not have enough diamonds", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        await assert.rejects(
            async () => service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "100"),
            /Buyer does not have enough diamonds./        )

    })

    it("should create a private player buy offer and escrow buyer diamonds", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let startingBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "100"
        )

        let fetched:TeamMarketOffer = await service.get(offer._id)
        let endingBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(fetched.buyerUserId, buyerUser._id)
        assert.equal(fetched.sellerUserId, sellerUser._id)
        assert.equal(fetched.buyerPaymentTeamId, buyerTeam._id)
        assert.equal(fetched.sellerPaymentTeamId, sellerTeam._id)
        assert.equal(fetched.salePlayerId, player._id)
        assert.equal(fetched.diamondAmount, "100")
        assert.equal(fetched.status, TeamMarketOfferStatus.PENDING)
        assert.notEqual(fetched.escrowTransactionId, undefined)
        assert.equal(BigInt(endingBalance), BigInt(startingBalance) - BigInt("100"))

    })

    it("should not accept and process a private player buy offer when the buyer roster is full", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize; i++) {
            let ownedPlayer:Player = await createTestPlayer(Position.CATCHER)
            await createTestPlayerLeagueSeason(ownedPlayer, buyerUser, undefined, league, season)
        }

        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "100"
        )

        await assert.rejects(
            async () => service.acceptAndProcessTeamMarketOffer(sellerUser, offer, new Date()),
            /Buyer roster is full./
        )

    })

    it("should not cancel a completed or cancelled market offer", async () => {

        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team")

        let player:Player = await createTestPlayer(Position.CATCHER)


        let offer:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            _id: uuidv4(),
            buyerUserId: buyerTeam.userId,
            sellerUserId: sellerTeam.userId,
            buyerPaymentTeamId: buyerTeam._id,
            sellerPaymentTeamId: sellerTeam._id,
            salePlayerId: player._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.CANCELLED,
            escrowTransactionId: uuidv4()
        })

        await service.put(offer)

        await assert.rejects(
            async () => service.cancelTeamMarketOffer(offer),
            /Team market offer is not pending./
        )

    })

    it("should cancel a private player buy offer and refund escrowed diamonds", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "100"
        )

        let escrowedBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(escrowedBalance, "900")

        await service.cancelTeamMarketOffer(offer)

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let refundedBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.notEqual(fetchedOffer.settlementTransactionId, undefined)
        assert.equal(refundedBalance, "1000")

    })

    it("should not process a completed or cancelled private buy offer", async () => {

        let sellerUser:User = await createTestUser()
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)

        let player:Player = await createTestPlayer(Position.CATCHER)

        let offer:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            _id: uuidv4(),
            buyerUserId: buyerTeam.userId,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerTeam._id,
            sellerPaymentTeamId: sellerTeam._id,
            salePlayerId: player._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.CANCELLED,
            escrowTransactionId: uuidv4()
        })

        await service.put(offer)

        await assert.rejects(
            async () => service.acceptAndProcessTeamMarketOffer(sellerUser, offer, new Date()),
            /Team market offer is not pending./
        )

    })

    it("should not let a non-seller accept a private buy offer", async () => {

        let sellerUser:User = await createTestUser()
        let wrongUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "100"
        )

        await assert.rejects(
            async () => service.acceptAndProcessTeamMarketOffer(wrongUser, offer, new Date()),
            /Not authorized./
        )

    })

    it("should not process a sale listing through the private buy offer acceptance path", async () => {

        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        let listing:TeamMarketOffer = await service.createPlayerSaleListing(
            sellerUser,
            player,
            "100"
        )

        await assert.rejects(
            async () => service.acceptAndProcessTeamMarketOffer(sellerUser, listing, new Date()),
            /Team market offer is not a private buy offer./
        )

    })

    it("should accept and process a private player buy offer for an unassigned owned player", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "100"
        )

        let buyerEscrowedBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)
        let sellerStartingBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, sellerTeam._id)

        assert.equal(buyerEscrowedBalance, "900")
        assert.equal(sellerStartingBalance, "0")

        await service.acceptAndProcessTeamMarketOffer(sellerUser, offer, new Date())

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let buyerFinalBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)
        let sellerFinalBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, sellerTeam._id)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let allPls:PlayerLeagueSeason[] = await playerLeagueSeasonService.getByPlayersSeason([player], season)
        let endedPls:PlayerLeagueSeason | undefined = allPls.find((pls) => pls._id == originalPls._id)

        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.PROCESSED)
        assert.notEqual(fetchedOffer.settlementTransactionId, undefined)

        assert.equal(buyerFinalBalance, "900")
        assert.equal(sellerFinalBalance, "100")

        assert.notEqual(endedPls, undefined)
        assert.notEqual(endedPls.endDate, undefined)

        assert.notEqual(currentPls._id, originalPls._id)
        assert.equal(currentPls.userId, buyerUser._id)
        assert.equal(currentPls.teamId, undefined)

    })

    it("should accept and process a private player buy offer for an assigned owned player and remove from the seller team", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, sellerUser, sellerTeam, league, season)

        let sellerTLS:TeamLeagueSeason = await createTestTeamLeagueSeason(sellerTeam, league, season)

        sellerTLS.lineups[0].availableHitters = [
            {
                _id: player._id,
                position: Position.CATCHER
            } as any
        ]

        sellerTLS.changed("lineups", true)
        await teamLeagueSeasonService.put(sellerTLS)

        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "100"
        )

        await service.acceptAndProcessTeamMarketOffer(sellerUser, offer, new Date())

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let sellerFinalBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, sellerTeam._id)
        let fetchedSellerTLS:TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(sellerTeam, season)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let allPls:PlayerLeagueSeason[] = await playerLeagueSeasonService.getByPlayersSeason([player], season)
        let endedPls:PlayerLeagueSeason | undefined = allPls.find((pls) => pls._id == originalPls._id)

        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.PROCESSED)
        assert.equal(sellerFinalBalance, "100")
        assert.equal(fetchedSellerTLS.lineups[0].availableHitters.some(p => p._id == player._id), false)

        assert.notEqual(endedPls, undefined)
        assert.notEqual(endedPls.endDate, undefined)

        assert.notEqual(currentPls._id, originalPls._id)
        assert.equal(currentPls.userId, buyerUser._id)
        assert.equal(currentPls.teamId, undefined)

    })

    it("should not create a player sale listing with zero diamonds", async () => {

        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        await assert.rejects(
            async () => service.createPlayerSaleListing(sellerUser, player, "0"),
            /Diamond amount must be greater than zero./
        )

    })

    it("should not create a player sale listing with negative diamonds", async () => {

        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        await assert.rejects(
            async () => service.createPlayerSaleListing(sellerUser, player, "-1"),
            /Diamond amount must be greater than zero./
        )

    })

    it("should create a player sale listing without buyer escrow", async () => {

        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        let startingBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, sellerTeam._id)

        let listing:TeamMarketOffer = await service.createPlayerSaleListing(
            sellerUser,
            player,
            "100"
        )

        let fetchedListing:TeamMarketOffer = await service.get(listing._id)
        let endingBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, sellerTeam._id)

        assert.equal(fetchedListing.buyerUserId, undefined)
        assert.equal(fetchedListing.buyerPaymentTeamId, undefined)
        assert.equal(fetchedListing.escrowTransactionId, undefined)
        assert.equal(fetchedListing.sellerUserId, sellerUser._id)
        assert.equal(fetchedListing.sellerPaymentTeamId, sellerTeam._id)
        assert.equal(fetchedListing.salePlayerId, player._id)
        assert.equal(fetchedListing.diamondAmount, "100")
        assert.equal(fetchedListing.status, TeamMarketOfferStatus.PENDING)
        assert.equal(endingBalance, startingBalance)

    })

    it("should not create a player sale listing when the player is not owned by the seller", async () => {

        let sellerUser:User = await createTestUser()
        let otherUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, otherUser, undefined, league, season)

        await assert.rejects(
            async () => service.createPlayerSaleListing(sellerUser, player, "100"),
            /Not authorized./
        )

    })

    it("should cancel a player sale listing without refunding escrow", async () => {

        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        let listing:TeamMarketOffer = await service.createPlayerSaleListing(
            sellerUser,
            player,
            "100"
        )

        await service.cancelTeamMarketOffer(listing)

        let fetchedListing:TeamMarketOffer = await service.get(listing._id)
        let sellerBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, sellerTeam._id)

        assert.equal(fetchedListing.status, TeamMarketOfferStatus.CANCELLED)
        assert.notEqual(fetchedListing.settlementTransactionId, undefined)
        assert.equal(fetchedListing.escrowTransactionId, undefined)
        assert.equal(sellerBalance, "0")

    })

    it("should reject buying an existing listing when the offer is not a sale listing", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "100"
        )

        await assert.rejects(
            async () => service.buyPlayerSaleListing(buyerUser, offer),
            /Team market offer is not a sale listing./
        )

    })

    it("should reject buying an existing listing that is not pending", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        let listing:TeamMarketOffer = await service.createPlayerSaleListing(
            sellerUser,
            player,
            "100"
        )

        listing.status = TeamMarketOfferStatus.CANCELLED
        await service.put(listing)

        await assert.rejects(
            async () => service.buyPlayerSaleListing(buyerUser, listing),
            /Team market offer is not pending./
        )

    })

    it("should reject buying an existing listing by the seller", async () => {

        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestTeam("Seller Team", sellerUser)
        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        let listing:TeamMarketOffer = await service.createPlayerSaleListing(
            sellerUser,
            player,
            "100"
        )

        await assert.rejects(
            async () => service.buyPlayerSaleListing(sellerUser, listing),
            /Seller cannot buy their own listing./
        )

    })



    it("should cancel the pending player sale listing for an owned player", async () => {

        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestTeam("Seller Team", sellerUser)

        await createTestPlayerLeagueSeason(
            player,
            sellerUser,
            undefined,
            league,
            season
        )

        let listing:TeamMarketOffer = await service.createPlayerSaleListing(
            sellerUser,
            player,
            "100"
        )

        let cancelledListings:TeamMarketOffer[] =
            await service.cancelPlayerSaleListings(sellerUser, player)

        let fetchedListing:TeamMarketOffer =
            await service.get(listing._id)

        assert.equal(cancelledListings.length, 1)
        assert.equal(cancelledListings[0]._id, listing._id)
        assert.equal(fetchedListing.status, TeamMarketOfferStatus.CANCELLED)
        assert.notEqual(fetchedListing.settlementTransactionId, undefined)

    })

    it("should not cancel private player buy offers when cancelling player sale listings", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let listing:TeamMarketOffer = await service.createPlayerSaleListing(sellerUser, player, "100")
        let privateOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "200")

        let cancelledListings:TeamMarketOffer[] = await service.cancelPlayerSaleListings(sellerUser, player)

        let fetchedListing:TeamMarketOffer = await service.get(listing._id)
        let fetchedPrivateOffer:TeamMarketOffer = await service.get(privateOffer._id)

        assert.equal(cancelledListings.length, 1)
        assert.equal(fetchedListing.status, TeamMarketOfferStatus.CANCELLED)
        assert.equal(fetchedPrivateOffer.status, TeamMarketOfferStatus.PENDING)

    })

    it("should reject cancelling player sale listings when the player is not owned", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, undefined, league, season)

        await assert.rejects(
            async () => service.cancelPlayerSaleListings(user, player),
            /Player is not owned./
        )

    })

    it("should reject cancelling player sale listings for another user's player", async () => {

        let owner:User = await createTestUser()
        let wrongUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, owner, undefined, league, season)

        await assert.rejects(
            async () => service.cancelPlayerSaleListings(wrongUser, player),
            /Not authorized./
        )

    })

    it("should only cancel sale listings created by the seller and not private buy offers for the player", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let listing:TeamMarketOffer = await service.createPlayerSaleListing(
            sellerUser,
            player,
            "100"
        )

        let privateOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "200"
        )

        let cancelledListings:TeamMarketOffer[] = await service.cancelPlayerSaleListings(
            sellerUser,
            player
        )

        let fetchedListing:TeamMarketOffer = await service.get(listing._id)
        let fetchedPrivateOffer:TeamMarketOffer = await service.get(privateOffer._id)

        assert.equal(cancelledListings.length, 1)
        assert.equal(cancelledListings[0]._id, listing._id)
        assert.equal(fetchedListing.status, TeamMarketOfferStatus.CANCELLED)
        assert.equal(fetchedPrivateOffer.status, TeamMarketOfferStatus.PENDING)

    })

    it("should not create multiple pending private player buy offers from the same buyer for the same player", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let firstOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "100"
        )

        await assert.rejects(
            async () => service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "200"),
            /Buyer already has a pending offer for this player./
        )

        let fetchedFirstOffer:TeamMarketOffer = await service.get(firstOffer._id)
        let buyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(fetchedFirstOffer.status, TeamMarketOfferStatus.PENDING)
        assert.equal(fetchedFirstOffer.diamondAmount, "100")
        assert.equal(buyerBalance, "900")

    })

    it("should create a new private player buy offer after the buyer cancels their pending offer", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let firstOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "100"
        )

        await service.cancelPlayerBuyOffer(buyerUser, firstOffer)

        let secondOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            player,
            "200"
        )

        let fetchedFirstOffer:TeamMarketOffer = await service.get(firstOffer._id)
        let fetchedSecondOffer:TeamMarketOffer = await service.get(secondOffer._id)
        let buyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(fetchedFirstOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.equal(fetchedSecondOffer.status, TeamMarketOfferStatus.PENDING)
        assert.equal(fetchedSecondOffer.diamondAmount, "200")
        assert.equal(buyerBalance, "800")

    })



    it("should create a player buy offer and automatically resolve buyer and seller teams", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPlayerBuyOffer(buyerUser, player, "100")

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let buyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(fetchedOffer.buyerUserId, buyerUser._id)
        assert.equal(fetchedOffer.sellerUserId, sellerUser._id)
        assert.equal(fetchedOffer.buyerPaymentTeamId, buyerTeam._id)
        assert.equal(fetchedOffer.sellerPaymentTeamId, sellerTeam._id)
        assert.equal(fetchedOffer.salePlayerId, player._id)
        assert.equal(fetchedOffer.diamondAmount, "100")
        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.PENDING)
        assert.notEqual(fetchedOffer.escrowTransactionId, undefined)
        assert.equal(buyerBalance, "900")

    })

    it("should not create a player buy offer for the buyer's own player", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Buyer Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)
        await giveTeamDiamonds(team, "1000")

        await assert.rejects(
            async () => service.createPlayerBuyOffer(user, player, "100"),
            /Cannot create a buy offer for your own player./
        )

    })

    it("should not create a player buy offer for an unowned player", async () => {

        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        await assert.rejects(
            async () => service.createPlayerBuyOffer(buyerUser, player, "100"),
            /Player is not owned./
        )

    })

    it("should not create a player buy offer when the buyer has no team", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        await assert.rejects(
            async () => service.createPlayerBuyOffer(buyerUser, player, "100"),
            /User does not have a team./
        )

    })

    it("should not create a player buy offer when the seller has no team", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        await assert.rejects(
            async () => service.createPlayerBuyOffer(buyerUser, player, "100"),
            /Seller does not have a team./
        )

    })

    it("should cancel a player buy offer for the buyer and refund escrowed diamonds", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "100")

        let escrowedBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(escrowedBalance, "900")

        await service.cancelPlayerBuyOffer(buyerUser, offer)

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let refundedBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.notEqual(fetchedOffer.settlementTransactionId, undefined)
        assert.equal(refundedBalance, "1000")

    })

    it("should not let another user cancel a player buy offer", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let wrongUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "100")

        await assert.rejects(
            async () => service.cancelPlayerBuyOffer(wrongUser, offer),
            /Not authorized./
        )

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let buyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.PENDING)
        assert.equal(buyerBalance, "900")

    })

    it("should not cancel a sale listing through the player buy offer cancellation path", async () => {

        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        let listing:TeamMarketOffer = await service.createPlayerSaleListing(sellerUser, player, "100")

        await assert.rejects(
            async () => service.cancelPlayerBuyOffer(sellerUser, listing),
            /Team market offer is not a private buy offer./
        )

        let fetchedListing:TeamMarketOffer = await service.get(listing._id)

        assert.equal(fetchedListing.status, TeamMarketOfferStatus.PENDING)

    })

    it("should not cancel a player buy offer that is not pending", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "100")

        offer.status = TeamMarketOfferStatus.CANCELLED
        await service.put(offer)

        await assert.rejects(
            async () => service.cancelPlayerBuyOffer(buyerUser, offer),
            /Team market offer is not pending./
        )

    })    



    it("should accept the highest pending player buy offer for an owned player", async () => {

        let sellerUser:User = await createTestUser()
        let lowBuyerUser:User = await createTestUser()
        let highBuyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let lowBuyerTeam:Team = await createTestTeam("Low Buyer Team", lowBuyerUser)
        let highBuyerTeam:Team = await createTestTeam("High Buyer Team", highBuyerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(lowBuyerTeam, "1000")
        await giveTeamDiamonds(highBuyerTeam, "1000")

        let lowOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(lowBuyerTeam, sellerTeam, player, "100")
        let highOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(highBuyerTeam, sellerTeam, player, "250")

        await service.acceptHighestPlayerBuyOffer(sellerUser, player, lowOffer, new Date())

        let fetchedLowOffer:TeamMarketOffer = await service.get(lowOffer._id)
        let fetchedHighOffer:TeamMarketOffer = await service.get(highOffer._id)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let sellerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, sellerTeam._id)
        let lowBuyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, lowBuyerTeam._id)
        let highBuyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, highBuyerTeam._id)

        assert.equal(fetchedHighOffer.status, TeamMarketOfferStatus.PROCESSED)
        assert.equal(fetchedLowOffer.status, TeamMarketOfferStatus.CANCELLED)

        assert.equal(currentPls.userId, highBuyerUser._id)
        assert.equal(currentPls.teamId, undefined)

        assert.equal(sellerBalance, "250")
        assert.equal(lowBuyerBalance, "1000")
        assert.equal(highBuyerBalance, "750")

    })

    it("should accept the selected player buy offer when it is the highest pending offer", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "100")

        await service.acceptHighestPlayerBuyOffer(sellerUser, player, offer, new Date())

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let sellerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, sellerTeam._id)
        let buyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.PROCESSED)
        assert.equal(currentPls.userId, buyerUser._id)
        assert.equal(currentPls.teamId, undefined)
        assert.equal(sellerBalance, "100")
        assert.equal(buyerBalance, "900")

    })

    it("should not accept the highest player buy offer when the player is not owned", async () => {

        let user:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            _id: uuidv4(),
            buyerUserId: buyerUser._id,
            sellerUserId: user._id,
            buyerPaymentTeamId: buyerTeam._id,
            sellerPaymentTeamId: sellerTeam._id,
            salePlayerId: player._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: uuidv4()
        })

        await service.put(offer)

        await assert.rejects(
            async () => service.acceptHighestPlayerBuyOffer(user, player, offer, new Date()),
            /Player is not owned./
        )

    })

    it("should not accept the highest player buy offer for another user's player", async () => {

        let owner:User = await createTestUser()
        let wrongUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", owner)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, owner, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "100")

        await assert.rejects(
            async () => service.acceptHighestPlayerBuyOffer(wrongUser, player, offer, new Date()),
            /Not authorized./
        )

    })

    it("should not accept the highest player buy offer when the selected offer is not pending", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "100")

        offer.status = TeamMarketOfferStatus.CANCELLED
        await service.put(offer)

        await assert.rejects(
            async () => service.acceptHighestPlayerBuyOffer(sellerUser, player, offer, new Date()),
            /Team market offer is not pending./
        )

    })

    it("should not accept the highest player buy offer when the selected offer is not a private buy offer", async () => {

        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        let listing:TeamMarketOffer = await service.createPlayerSaleListing(sellerUser, player, "100")

        await assert.rejects(
            async () => service.acceptHighestPlayerBuyOffer(sellerUser, player, listing, new Date()),
            /Team market offer is not a private buy offer./
        )

    })

    it("should not accept the highest player buy offer when the selected offer is for another player", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)
        let otherPlayer:Player = await createTestPlayer(Position.FIRST_BASE)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await createTestPlayerLeagueSeason(otherPlayer, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, otherPlayer, "100")

        await assert.rejects(
            async () => service.acceptHighestPlayerBuyOffer(sellerUser, player, offer, new Date()),
            /Team market offer is not for this player./
        )

    })

    it("should not accept the highest player buy offer when the selected offer belongs to another seller", async () => {

        let sellerUser:User = await createTestUser()
        let otherSellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let otherSellerTeam:Team = await createTestTeam("Other Seller Team", otherSellerUser)
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)
        let otherPlayer:Player = await createTestPlayer(Position.FIRST_BASE)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await createTestPlayerLeagueSeason(otherPlayer, otherSellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, otherSellerTeam, otherPlayer, "100")

        offer.salePlayerId = player._id
        await service.put(offer)

        await assert.rejects(
            async () => service.acceptHighestPlayerBuyOffer(sellerUser, player, offer, new Date()),
            /Not authorized./
        )

    }) 


    it("should not cancel pending player buy offers when the user roster is not full", async () => {

        let buyerUser:User = await createTestUser()
        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "100")

        let cancelledOffers:TeamMarketOffer[] = await service.cancelPendingPlayerBuyOffersIfUserRosterFull(buyerUser, season)

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let buyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(cancelledOffers.length, 0)
        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.PENDING)
        assert.equal(buyerBalance, "900")

    })

    it("should cancel pending player buy offers when the user roster is full", async () => {

        let buyerUser:User = await createTestUser()
        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, player, "100")

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize; i++) {
            let ownedPlayer:Player = await createTestPlayer(Position.CATCHER)
            await createTestPlayerLeagueSeason(ownedPlayer, buyerUser, undefined, league, season)
        }

        let cancelledOffers:TeamMarketOffer[] = await service.cancelPendingPlayerBuyOffersIfUserRosterFull(buyerUser, season)

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let buyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(cancelledOffers.length, 1)
        assert.equal(cancelledOffers[0]._id, offer._id)
        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.notEqual(fetchedOffer.settlementTransactionId, undefined)
        assert.equal(buyerBalance, "1000")

    })

    it("should cancel all pending player buy offers when the user roster is full", async () => {

        let buyerUser:User = await createTestUser()
        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let firstPlayer:Player = await createTestPlayer(Position.CATCHER)
        let secondPlayer:Player = await createTestPlayer(Position.FIRST_BASE)

        await createTestPlayerLeagueSeason(firstPlayer, sellerUser, undefined, league, season)
        await createTestPlayerLeagueSeason(secondPlayer, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let firstOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, firstPlayer, "100")
        let secondOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, secondPlayer, "200")

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize; i++) {
            let ownedPlayer:Player = await createTestPlayer(Position.CATCHER)
            await createTestPlayerLeagueSeason(ownedPlayer, buyerUser, undefined, league, season)
        }

        let cancelledOffers:TeamMarketOffer[] = await service.cancelPendingPlayerBuyOffersIfUserRosterFull(buyerUser, season)

        let fetchedFirstOffer:TeamMarketOffer = await service.get(firstOffer._id)
        let fetchedSecondOffer:TeamMarketOffer = await service.get(secondOffer._id)
        let buyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(cancelledOffers.length, 2)
        assert.equal(cancelledOffers.some(offer => offer._id == firstOffer._id), true)
        assert.equal(cancelledOffers.some(offer => offer._id == secondOffer._id), true)

        assert.equal(fetchedFirstOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.equal(fetchedSecondOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.notEqual(fetchedFirstOffer.settlementTransactionId, undefined)
        assert.notEqual(fetchedSecondOffer.settlementTransactionId, undefined)
        assert.equal(buyerBalance, "1000")

    })

    it("should not cancel processed or already cancelled player buy offers when the user roster is full", async () => {

        let buyerUser:User = await createTestUser()
        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let pendingPlayer:Player = await createTestPlayer(Position.CATCHER)
        let cancelledPlayer:Player = await createTestPlayer(Position.FIRST_BASE)

        await createTestPlayerLeagueSeason(pendingPlayer, sellerUser, undefined, league, season)
        await createTestPlayerLeagueSeason(cancelledPlayer, sellerUser, undefined, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let pendingOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, pendingPlayer, "100")
        let cancelledOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(buyerTeam, sellerTeam, cancelledPlayer, "200")

        await service.cancelPlayerBuyOffer(buyerUser, cancelledOffer)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize; i++) {
            let ownedPlayer:Player = await createTestPlayer(Position.CATCHER)
            await createTestPlayerLeagueSeason(ownedPlayer, buyerUser, undefined, league, season)
        }

        let cancelledOffers:TeamMarketOffer[] = await service.cancelPendingPlayerBuyOffersIfUserRosterFull(buyerUser, season)

        let fetchedPendingOffer:TeamMarketOffer = await service.get(pendingOffer._id)
        let fetchedCancelledOffer:TeamMarketOffer = await service.get(cancelledOffer._id)
        let buyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(cancelledOffers.length, 1)
        assert.equal(cancelledOffers[0]._id, pendingOffer._id)

        assert.equal(fetchedPendingOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.equal(fetchedCancelledOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.equal(buyerBalance, "1000")

    })    


    it("should cancel pending player buy offers when signing a free agent fills the user roster", async () => {

        let buyerUser:User = await createTestUser()
        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let bidPlayer:Player = await createTestPlayer(Position.CATCHER)
        let freeAgent:Player = await createTestPlayer(Position.FIRST_BASE)

        await createTestPlayerLeagueSeason(bidPlayer, sellerUser, undefined, league, season)
        await createTestPlayerLeagueSeason(freeAgent, undefined, undefined, league, season)
        await createTestTeamLeagueSeason(buyerTeam, league, season)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize - 1; i++) {
            let ownedPlayer:Player = await createTestPlayer(Position.CATCHER)
            await createTestPlayerLeagueSeason(ownedPlayer, buyerUser, undefined, league, season)
        }

        await giveTeamDiamonds(buyerTeam, "1000000000000000000000000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            bidPlayer,
            "100"
        )

        let escrowedBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        await service.signFreeAgent(buyerUser, freeAgent, buyerTeam, new Date(), uuidv4())

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let currentFreeAgentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(freeAgent, season)
        let refundedBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(currentFreeAgentPls.userId, buyerUser._id)
        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.notEqual(fetchedOffer.settlementTransactionId, undefined)

        assert.equal(
            BigInt(refundedBalance),
            BigInt(escrowedBalance) -
            BigInt(playerService.getAskingPrice(currentFreeAgentPls)) +
            BigInt("100")
        )

    })

    it("should not cancel pending player buy offers when signing a free agent does not fill the user roster", async () => {

        let buyerUser:User = await createTestUser()
        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let bidPlayer:Player = await createTestPlayer(Position.CATCHER)
        let freeAgent:Player = await createTestPlayer(Position.FIRST_BASE)

        await createTestPlayerLeagueSeason(bidPlayer, sellerUser, undefined, league, season)
        await createTestPlayerLeagueSeason(freeAgent, undefined, undefined, league, season)
        await createTestTeamLeagueSeason(buyerTeam, league, season)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize - 2; i++) {
            let ownedPlayer:Player = await createTestPlayer(Position.CATCHER)
            await createTestPlayerLeagueSeason(ownedPlayer, buyerUser, undefined, league, season)
        }

        await giveTeamDiamonds(buyerTeam, "1000000000000000000000000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            bidPlayer,
            "100"
        )

        await service.signFreeAgent(buyerUser, freeAgent, buyerTeam, new Date(), uuidv4())

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let currentFreeAgentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(freeAgent, season)

        assert.equal(currentFreeAgentPls.userId, buyerUser._id)
        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.PENDING)

    })

    it("should cancel buyer pending player buy offers when accepting a private buy offer fills the buyer roster", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let otherSellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let otherSellerTeam:Team = await createTestTeam("Other Seller Team", otherSellerUser)
        let acceptedPlayer:Player = await createTestPlayer(Position.CATCHER)
        let otherBidPlayer:Player = await createTestPlayer(Position.FIRST_BASE)

        await createTestPlayerLeagueSeason(acceptedPlayer, sellerUser, undefined, league, season)
        await createTestPlayerLeagueSeason(otherBidPlayer, otherSellerUser, undefined, league, season)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize - 1; i++) {
            let ownedPlayer:Player = await createTestPlayer(Position.CATCHER)
            await createTestPlayerLeagueSeason(ownedPlayer, buyerUser, undefined, league, season)
        }

        await giveTeamDiamonds(buyerTeam, "1000")

        let acceptedOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            acceptedPlayer,
            "100"
        )

        let otherOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            otherSellerTeam,
            otherBidPlayer,
            "200"
        )

        await service.acceptAndProcessTeamMarketOffer(sellerUser, acceptedOffer, new Date())

        let fetchedAcceptedOffer:TeamMarketOffer = await service.get(acceptedOffer._id)
        let fetchedOtherOffer:TeamMarketOffer = await service.get(otherOffer._id)
        let currentAcceptedPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(acceptedPlayer, season)
        let buyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(fetchedAcceptedOffer.status, TeamMarketOfferStatus.PROCESSED)
        assert.notEqual(fetchedAcceptedOffer.settlementTransactionId, undefined)

        assert.equal(fetchedOtherOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.notEqual(fetchedOtherOffer.settlementTransactionId, undefined)

        assert.equal(currentAcceptedPls.userId, buyerUser._id)
        assert.equal(currentAcceptedPls.teamId, undefined)

        assert.equal(buyerBalance, "900")

    })

    it("should not cancel buyer pending player buy offers when accepting a private buy offer does not fill the buyer roster", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let otherSellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let otherSellerTeam:Team = await createTestTeam("Other Seller Team", otherSellerUser)
        let acceptedPlayer:Player = await createTestPlayer(Position.CATCHER)
        let otherBidPlayer:Player = await createTestPlayer(Position.FIRST_BASE)

        await createTestPlayerLeagueSeason(acceptedPlayer, sellerUser, undefined, league, season)
        await createTestPlayerLeagueSeason(otherBidPlayer, otherSellerUser, undefined, league, season)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize - 2; i++) {
            let ownedPlayer:Player = await createTestPlayer(Position.CATCHER)
            await createTestPlayerLeagueSeason(ownedPlayer, buyerUser, undefined, league, season)
        }

        await giveTeamDiamonds(buyerTeam, "1000")

        let acceptedOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            acceptedPlayer,
            "100"
        )

        let otherOffer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            otherSellerTeam,
            otherBidPlayer,
            "200"
        )

        await service.acceptAndProcessTeamMarketOffer(sellerUser, acceptedOffer, new Date())

        let fetchedAcceptedOffer:TeamMarketOffer = await service.get(acceptedOffer._id)
        let fetchedOtherOffer:TeamMarketOffer = await service.get(otherOffer._id)
        let currentAcceptedPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(acceptedPlayer, season)

        assert.equal(fetchedAcceptedOffer.status, TeamMarketOfferStatus.PROCESSED)
        assert.equal(fetchedOtherOffer.status, TeamMarketOfferStatus.PENDING)
        assert.equal(currentAcceptedPls.userId, buyerUser._id)

    })
    
    it("should cancel pending player buy offers when sign available player fills the user roster", async () => {

        let buyerUser:User = await createTestUser()
        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let tls:TeamLeagueSeason = await createTestTeamLeagueSeason(buyerTeam, league, season)
        let bidPlayer:Player = await createTestPlayer(Position.CATCHER)
        let availablePlayer:Player = await createTestPlayer(Position.FIRST_BASE)

        await createTestPlayerLeagueSeason(bidPlayer, sellerUser, undefined, league, season)
        let availablePLS:PlayerLeagueSeason = await createTestPlayerLeagueSeason(availablePlayer, undefined, undefined, league, season)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize - 1; i++) {
            let ownedPlayer:Player = await createTestPlayer(Position.CATCHER)
            await createTestPlayerLeagueSeason(ownedPlayer, buyerUser, undefined, league, season)
        }

        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            bidPlayer,
            "100"
        )

        await service.signAvailablePlayer(
            buyerUser,
            availablePlayer,
            availablePLS,
            buyerTeam,
            tls,
            season,
            new Date(),
            uuidv4()
        )

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let currentAvailablePLS:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(availablePlayer, season)
        let finalUserRosterSize = await playerLeagueSeasonService.getMostRecentCountByUserSeason(buyerUser._id, season)
        let buyerBalance:string = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(finalUserRosterSize, DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize)
        assert.equal(currentAvailablePLS.userId, buyerUser._id)
        assert.equal(currentAvailablePLS.teamId, buyerTeam._id)
        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.CANCELLED)
        assert.notEqual(fetchedOffer.settlementTransactionId, undefined)
        assert.equal(buyerBalance, "1000")

    })

    it("should not cancel pending player buy offers when sign available player does not fill the user roster", async () => {

        let buyerUser:User = await createTestUser()
        let sellerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let tls:TeamLeagueSeason = await createTestTeamLeagueSeason(buyerTeam, league, season)
        let bidPlayer:Player = await createTestPlayer(Position.CATCHER)
        let availablePlayer:Player = await createTestPlayer(Position.FIRST_BASE)

        await createTestPlayerLeagueSeason(bidPlayer, sellerUser, undefined, league, season)
        let availablePLS:PlayerLeagueSeason = await createTestPlayerLeagueSeason(availablePlayer, undefined, undefined, league, season)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize - 2; i++) {
            let ownedPlayer:Player = await createTestPlayer(Position.CATCHER)
            await createTestPlayerLeagueSeason(ownedPlayer, buyerUser, undefined, league, season)
        }

        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createPrivatePlayerBuyOffer(
            buyerTeam,
            sellerTeam,
            bidPlayer,
            "100"
        )

        await service.signAvailablePlayer(
            buyerUser,
            availablePlayer,
            availablePLS,
            buyerTeam,
            tls,
            season,
            new Date(),
            uuidv4()
        )

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let currentAvailablePLS:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(availablePlayer, season)
        let finalUserRosterSize = await playerLeagueSeasonService.getMostRecentCountByUserSeason(buyerUser._id, season)

        assert.equal(finalUserRosterSize, DEFAULT_ROSTER_CONSTRAINTS.maxTotalRosterSize - 1)
        assert.equal(currentAvailablePLS.userId, buyerUser._id)
        assert.equal(currentAvailablePLS.teamId, buyerTeam._id)
        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.PENDING)

    })

    async function createTestUser(): Promise<User> {

        let user:User = Object.assign(new User(), {
            _id: uuidv4(),
            discordProfile: {
                global_name: "Test User"
            }
        })

        await user.save()

        return user

    }

    async function createTestLeague(): Promise<League> {

        let league:League = Object.assign(new League(), {
            _id: uuidv4(),
            name: "Test League"
        })

        await leagueRepository.put(league)

        return league

    }

    async function createTestSeason(): Promise<Season> {

        let season:Season = new Season()

        season._id = uuidv4()
        season.startDate = new Date(2030, 0, ++seasonIndex)
        season.endDate = new Date(2030, 0, seasonIndex + 100)
        season.isComplete = false
        season.isInitialized = true

        await seasonRepository.put(season)

        return season

    }

    async function createTestTeam(name:string, user?:User): Promise<Team> {

        let teamUser:User = user ?? await createTestUser()

        let team:Team = Object.assign(new Team(), {
            _id: uuidv4(),
            name: name,
            userId: teamUser._id,
            longTermRating: {
                rating: 1500,
                ratingDeviation: 350,
                volatility: 0.06
            },
            seasonRating: {
                rating: 1500,
                ratingDeviation: 350,
                volatility: 0.06
            },
            developmentStrategy: { budgetPercent: 50 },
            colors: {}
        })

        await teamRepository.put(team)

        return team

    }

    async function createTestPlayer(primaryPosition:Position): Promise<Player> {

        let player:Player = new Player()

        player._id = uuidv4()
        player.firstName = "Bob"
        player.lastName = "Smith"
        player.zodiacSign = "ZOD"
        player.age = 18
        player.stamina = 1
        player.maxPitchCount = DEFAULT_MAX_PITCH_COUNT
        player.primaryPosition = primaryPosition
        player.overallRating = 60
        player.isRetired = false
        player.personalityType = PersonalityType.ENFJ

        player.pitchingProfile = {
            controlDelta: .02,
            movementDelta: .16,
            pitches: [PitchType.FF],
            powerDelta: -.02,
            vsSameHandDelta: -.02,
            contactProfile: {
                groundball: 20,
                flyBall: 60,
                lineDrive: 20
            }
        }

        player.hittingProfile = {
            contactDelta: -0.02,
            gapPowerDelta: -0.16,
            homerunPowerDelta: -.02,
            plateDisciplineDelta: -.02,
            defenseDelta: 0.05,
            speedDelta: -.16,
            vsSameHandDelta: 0.32999999999999974,
            stealsDelta: .0,
            armDelta: .0,
            contactProfile: {
                groundball: 20,
                flyBall: 60,
                lineDrive: 20
            }
        }

        player.throws = Handedness.R
        player.hits = Handedness.L

        player.hittingRatings = playerService.calculateHittingRatings(player, player.overallRating)
        player.pitchRatings = playerService.calculatePitchRatings(player, player.overallRating)

        player.potentialOverallRating = 75
        player.potentialHittingRatings = playerService.calculateHittingRatings(player, player.potentialOverallRating)
        player.potentialPitchRatings = playerService.calculatePitchRatings(player, player.potentialOverallRating)

        await playerService.put(player)

        return player

    }

    async function createTestPlayerLeagueSeason(player:Player, user:User | undefined, team:Team | undefined, league:League, season:Season): Promise<PlayerLeagueSeason> {

        let pls:PlayerLeagueSeason = new PlayerLeagueSeason()

        pls._id = uuidv4()
        pls.playerId = player._id
        pls.userId = user?._id
        pls.teamId = team?._id
        pls.leagueId = team ? league._id : undefined
        pls.seasonId = season._id
        pls.seasonIndex = 1
        pls.primaryPosition = player.primaryPosition
        pls.startDate = new Date()

        pls.overallRating = player.overallRating
        pls.pitchRatings = player.pitchRatings
        pls.hittingRatings = player.hittingRatings
        pls.potentialOverallRating = player.potentialOverallRating
        pls.potentialPitchRatings = player.potentialPitchRatings
        pls.potentialHittingRatings = player.potentialHittingRatings
        pls.age = player.age

        pls.player = player

        pls.stats = {
            hitting: {},
            pitching: {}
        } as any

        await playerLeagueSeasonService.put(pls)

        return pls

    }

    async function createTestTeamLeagueSeason(team:Team, league:League, season:Season): Promise<TeamLeagueSeason> {

        let tls:TeamLeagueSeason = new TeamLeagueSeason()

        tls._id = uuidv4()
        tls.teamId = team._id
        tls.leagueId = league._id
        tls.seasonId = season._id
        tls.financeSeason = {
            diamondBalance: "0",
            homeGamesPlayed: 0,
            awayGamesPlayed: 0,
            totalGamesPlayed: 0,
            revenue: "0",
            expenses: "0"
        } as any
        tls.longTermRating = {
            rating: 1500,
            ratingDeviation: 350,
            volatility: 0.06
        }
        tls.seasonRating = {
            rating: 1500,
            ratingDeviation: 350,
            volatility: 0.06
        }
        tls.overallRecord = {
            wins: 0,
            losses: 0,
            winPercent: 0,
            gamesBehind: 0,
            rank: 0
        }
        tls.lineups = [
            {
                order: [
                    {},
                    {},
                    {},
                    {},
                    {},
                    {},
                    {},
                    {},
                    {
                        position: Position.PITCHER
                    }
                ],
                rotation: [],
                availablePitchers: [],
                availableHitters: []
            }
        ]

        await teamLeagueSeasonService.put(tls)

        return tls

    }

    async function createTeamQueue(team:Team, league:League): Promise<TeamQueue> {

        let tq:TeamQueue = Object.assign(new TeamQueue(), {
            _id: uuidv4(),
            teamId: team._id,
            leagueId: league._id,
            teamRating: 0,
            maxRatingDiff: 0,
            expandRange: false,
            lastUpdated: null,
            dateCreated: null
        })

        await teamQueueRepository.put(tq)

        return tq

    }

    async function giveTeamDiamonds(team:Team, amount:string): Promise<void> {

        await offchainEventService.createTeamMintEvent(
            team._id,
            amount,
            {
                type: "test"
            } as any,
            uuidv4()
        )

    }

    after("After", async () => {
        await teamQueueRepository.clear()
    })

})