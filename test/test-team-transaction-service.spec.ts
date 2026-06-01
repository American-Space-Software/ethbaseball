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

import { ContractType, DEFAULT_MAX_PITCH_COUNT, DEFAULT_ROSTER_CONSTRAINTS, PersonalityType, TeamMarketOfferStatus } from "../src/service/enums.js"
import { Handedness, PitchType, Position } from "../src/baseball-sim-engine/index.js"
import { PitchingRoleType } from "../src/baseball-sim-engine/service/enums.js"
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



   

    it("should update roster by assigning a user-owned unassigned player to the bench", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Update Bench Roster Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        tls.lineups[0].availableHitters = [
            {
                _id: player._id,
                position: Position.CATCHER
            } as any
        ]

        await service.updateRoster(tls.lineups, team)

        let fetchedPLS: PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let fetchedTLS: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.equal(fetchedPLS.userId, user._id)
        assert.equal(fetchedPLS.teamId, team._id)
        assert.equal(fetchedTLS.lineups[0].availableHitters.some(p => p._id == player._id), true)

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

        let offer:TeamMarketOffer = await service.createTeamMarketOffer(
            buyerTeam,
            sellerTeam,
            {
                playerIds: [player._id]
            },
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


    


    

    it("should not drop an unrostered player", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        await assert.rejects(
            async () => service.dropPlayer(user, player, new Date()),
            /Player is not rostered./
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

        await service.dropPlayer(user, player, new Date())

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

        let offer:TeamMarketOffer = await service.createTeamMarketOffer(
            buyerTeam,
            sellerTeam,
            {
                playerIds: [player._id]
            },
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

    it("should not create a team market offer to the same payment team", async () => {

        let team:Team = await createTestTeam("Same Team")

        await assert.rejects(
            async () => service.createTeamMarketOffer(
                team,
                team,
                {
                    playerIds: [uuidv4()]
                },
                "100"
            ),
            /Buyer and seller teams cannot be the same./
        )

    })

    it("should not create a team market offer with zero diamonds", async () => {

        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team")

        await assert.rejects(
            async () => service.createTeamMarketOffer(
                buyerTeam,
                sellerTeam,
                {
                    playerIds: [uuidv4()]
                },
                "0"
            ),
            /Diamond amount must be greater than zero./
        )

    })

    it("should not create a team market offer with negative diamonds", async () => {

        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team")

        await assert.rejects(
            async () => service.createTeamMarketOffer(
                buyerTeam,
                sellerTeam,
                {
                    playerIds: [uuidv4()]
                },
                "-1"
            ),
            /Diamond amount must be greater than zero./
        )

    })

    it("should not create a team market offer when a player is not owned by the seller", async () => {

        let sellerUser:User = await createTestUser()
        let otherUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, otherUser, undefined, league, season)
        await createTestTeamLeagueSeason(sellerTeam, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        await assert.rejects(
            async () => service.createTeamMarketOffer(
                buyerTeam,
                sellerTeam,
                {
                    playerIds: [player._id]
                },
                "100"
            ),
            /Player is not owned by the seller./
        )

    })

    it("should not create a team market offer when the buyer does not have enough diamonds", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await createTestTeamLeagueSeason(sellerTeam, league, season)

        await assert.rejects(
            async () => service.createTeamMarketOffer(
                buyerTeam,
                sellerTeam,
                {
                    playerIds: [player._id]
                },
                "100"
            ),
            /Buyer team does not have enough diamonds to create this offer./
        )

    })

    it("should create a team market offer", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await createTestTeamLeagueSeason(sellerTeam, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let startingBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        let offer = await service.createTeamMarketOffer(
            buyerTeam,
            sellerTeam,
            {
                playerIds: [player._id]
            },
            "100"
        )

        let fetched = await service.get(offer._id)
        let endingBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, buyerTeam._id)

        assert.equal(fetched.buyerUserId, buyerUser._id)
        assert.equal(fetched.sellerUserId, sellerUser._id)
        assert.equal(fetched.buyerPaymentTeamId, buyerTeam._id)
        assert.equal(fetched.sellerPaymentTeamId, sellerTeam._id)
        assert.equal(fetched.package.playerIds.length, 1)
        assert.equal(fetched.package.playerIds[0], player._id)
        assert.equal(fetched.diamondAmount, "100")
        assert.equal(fetched.status, TeamMarketOfferStatus.PENDING)
        assert.notEqual(fetched.escrowTransactionId, undefined)
        assert.equal(BigInt(endingBalance), BigInt(startingBalance) - BigInt("100"))

    })


    it("should not accept and process a team market offer when the buyer roster is full", async () => {

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

        await createTestTeamLeagueSeason(buyerTeam, league, season)
        await createTestTeamLeagueSeason(sellerTeam, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createTeamMarketOffer(
            buyerTeam,
            sellerTeam,
            {
                playerIds: [player._id]
            },
            "100"
        )

        await assert.rejects(
            async () => service.acceptAndProcessTeamMarketOffer(sellerUser, offer, new Date()),
            /Buyer roster is full./
        )

    })

    it("should not cancel a team market offer that is not pending", async () => {

        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team")

        let offer:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            _id: uuidv4(),
            buyerUserId: buyerTeam.userId,
            sellerUserId: sellerTeam.userId,
            buyerPaymentTeamId: buyerTeam._id,
            sellerPaymentTeamId: sellerTeam._id,
            package: {
                playerIds: [uuidv4()]
            },
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

    it("should cancel a team market offer and refund escrowed diamonds", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)
        await createTestTeamLeagueSeason(sellerTeam, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createTeamMarketOffer(
            buyerTeam,
            sellerTeam,
            {
                playerIds: [player._id]
            },
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

    it("should not accept and process a team market offer that is not pending", async () => {

        let sellerUser:User = await createTestUser()
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)

        let offer:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            _id: uuidv4(),
            buyerUserId: buyerTeam.userId,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerTeam._id,
            sellerPaymentTeamId: sellerTeam._id,
            package: {
                playerIds: [uuidv4()]
            },
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

    it("should not accept and process a team market offer for the wrong user", async () => {

        let owner:User = await createTestUser()
        let wrongUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", owner)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, owner, undefined, league, season)
        await createTestTeamLeagueSeason(buyerTeam, league, season)
        await createTestTeamLeagueSeason(sellerTeam, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createTeamMarketOffer(
            buyerTeam,
            sellerTeam,
            {
                playerIds: [player._id]
            },
            "100"
        )

        await assert.rejects(
            async () => service.acceptAndProcessTeamMarketOffer(wrongUser, offer, new Date()),
            /Not authorized./
        )

    })

    it("should not accept and process a team market offer when the player is no longer owned by the seller", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let otherUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        await createTestTeamLeagueSeason(buyerTeam, league, season)
        await createTestTeamLeagueSeason(sellerTeam, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createTeamMarketOffer(
            buyerTeam,
            sellerTeam,
            {
                playerIds: [player._id]
            },
            "100"
        )

        originalPls.userId = otherUser._id
        await playerLeagueSeasonService.put(originalPls)

        await assert.rejects(
            async () => service.acceptAndProcessTeamMarketOffer(sellerUser, offer, new Date()),
            /Player is not owned by the seller./
        )

    })

    it("should accept and process a team market offer for an unassigned owned player", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, sellerUser, undefined, league, season)

        await createTestTeamLeagueSeason(buyerTeam, league, season)
        await createTestTeamLeagueSeason(sellerTeam, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createTeamMarketOffer(
            buyerTeam,
            sellerTeam,
            {
                playerIds: [player._id]
            },
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

    it("should accept and process a team market offer for an assigned owned player and remove from the seller team", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team", buyerUser)
        let sellerTeam:Team = await createTestTeam("Seller Team", sellerUser)
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, sellerUser, sellerTeam, league, season)

        await createTestTeamLeagueSeason(buyerTeam, league, season)
        await createTestTeamLeagueSeason(sellerTeam, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createTeamMarketOffer(
            buyerTeam,
            sellerTeam,
            {
                playerIds: [player._id]
            },
            "100"
        )

        await service.acceptAndProcessTeamMarketOffer(sellerUser, offer, new Date())

        let fetchedOffer:TeamMarketOffer = await service.get(offer._id)
        let sellerFinalBalance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, sellerTeam._id)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let allPls:PlayerLeagueSeason[] = await playerLeagueSeasonService.getByPlayersSeason([player], season)
        let endedPls:PlayerLeagueSeason | undefined = allPls.find((pls) => pls._id == originalPls._id)

        assert.equal(fetchedOffer.status, TeamMarketOfferStatus.PROCESSED)
        assert.equal(sellerFinalBalance, "100")

        assert.notEqual(endedPls, undefined)
        assert.notEqual(endedPls.endDate, undefined)

        assert.notEqual(currentPls._id, originalPls._id)
        assert.equal(currentPls.userId, buyerUser._id)
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

    it("should update roster by assigning a user-owned unassigned player to the team", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Update Roster Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        tls.lineups[0].order[0] = {
            _id: player._id,
            position: Position.CATCHER
        } as any

        await service.updateRoster(tls.lineups, team)

        let fetchedPLS: PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let fetchedTLS: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.equal(fetchedPLS.userId, user._id)
        assert.equal(fetchedPLS.teamId, team._id)
        assert.equal(fetchedTLS.lineups[0].order[0]._id, player._id)

    })

    it("should reject update roster when the player is owned by another user", async () => {

        let owner: User = await createTestUser()
        let otherUser: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Update Roster Team", owner)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, otherUser, undefined, league, season)

        tls.lineups[0].order[0] = {
            _id: player._id,
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
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, owner, otherTeam, league, season)

        tls.lineups[0].order[0] = {
            _id: player._id,
            position: Position.CATCHER
        } as any

        await assert.rejects(
            async () => service.updateRoster(tls.lineups, team),
            /Invalid player in roster./
        )

    })

    it("should reject update roster when adding a player would exceed the team roster limit", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Full Update Roster Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTeamRosterSize; i++) {
            let rosterPlayer: Player = await createTestPlayer(Position.PITCHER)
            await createTestPlayerLeagueSeason(rosterPlayer, user, team, league, season)
        }

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        tls.lineups[0].order[0] = {
            _id: player._id,
            position: Position.CATCHER
        } as any

        await assert.rejects(
            async () => service.updateRoster(tls.lineups, team),
            /Team roster is full./
        )

    })    

    it("should update roster without removing omitted players from the team roster", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Update Roster Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, team, league, season)

        tls.lineups[0].order[0] = {
            position: Position.CATCHER
        } as any

        await service.updateRoster(tls.lineups, team)

        let fetchedPLS: PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

        assert.equal(fetchedPLS.userId, user._id)
        assert.equal(fetchedPLS.teamId, team._id)

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

    it("should update roster by assigning a user-owned unassigned player to the team", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Update Roster Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        tls.lineups[0].order[0] = {
            _id: player._id,
            position: Position.CATCHER
        } as any

        await service.updateRoster(tls.lineups, team)

        let fetchedPLS: PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let fetchedTLS: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.equal(fetchedPLS.userId, user._id)
        assert.equal(fetchedPLS.teamId, team._id)
        assert.equal(fetchedTLS.lineups[0].order[0]._id, player._id)

    })

    it("should update roster by assigning a user-owned unassigned player to the bench", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Update Bench Roster Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        tls.lineups[0].availableHitters = [
            {
                _id: player._id
            } as any
        ]

        await service.updateRoster(tls.lineups, team)

        let fetchedPLS: PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let fetchedTLS: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.equal(fetchedPLS.userId, user._id)
        assert.equal(fetchedPLS.teamId, team._id)
        assert.equal(fetchedTLS.lineups[0].availableHitters.some(p => p._id == player._id), true)

    })

    it("should update roster by assigning an owned player to the bench when the lineup already has that position", async () => {

        let user:User = await createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Assign Bench Team", user)
        let activeCatcher:Player = await createTestPlayer(Position.CATCHER)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(activeCatcher, user, team, league, season)
        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        let tls:TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)

        tls.lineups[0].order[0] = {
            _id: activeCatcher._id,
            position: Position.CATCHER
        } as any

        tls.lineups[0].availableHitters = [
            {
                _id: player._id,
                position: Position.CATCHER
            } as any
        ]

        await service.updateRoster(tls.lineups, team)

        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let fetchedTLS:TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        assert.equal(currentPls.userId, user._id)
        assert.equal(currentPls.teamId, team._id)

        assert.equal(fetchedTLS.lineups[0].order.some(p => p._id == player._id), false)
        assert.equal(fetchedTLS.lineups[0].availableHitters.some(p => p._id == player._id), true)

    })

    it("should reject update roster when adding a player would exceed the team roster limit", async () => {

        let user: User = await createTestUser()
        let league: League = await createTestLeague()
        let season: Season = await createTestSeason()
        let team: Team = await createTestTeam("Full Update Roster Team", user)
        let tls: TeamLeagueSeason = await createTestTeamLeagueSeason(team, league, season)
        let player: Player = await createTestPlayer(Position.CATCHER)

        for (let i = 0; i < DEFAULT_ROSTER_CONSTRAINTS.maxTeamRosterSize; i++) {
            let rosterPlayer: Player = await createTestPlayer(Position.PITCHER)
            await createTestPlayerLeagueSeason(rosterPlayer, user, team, league, season)
        }

        await createTestPlayerLeagueSeason(player, user, undefined, league, season)

        tls.lineups[0].order[0] = {
            _id: player._id,
            position: Position.CATCHER
        } as any

        await assert.rejects(
            async () => service.updateRoster(tls.lineups, team),
            /Team roster is full./
        )

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