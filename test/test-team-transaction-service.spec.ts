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

import { ContractType, PersonalityType, TeamMarketOfferStatus } from "../src/service/enums.js"
import { Handedness, PitchType, Position } from "../src/baseball-sim-engine/index.js"
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


    it("should not sign a rostered player", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Signing Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, team, league, season)
        await createTestTeamLeagueSeason(team, league, season)

        await assert.rejects(
            async () => service.signFreeAgent(user, player, team, new Date(), uuidv4()),
            /Player is rostered./
        )

    })

    it("should not sign a player for the wrong user", async () => {

        let owner:User = createTestUser()
        let wrongUser:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Signing Team", owner)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, league, season)
        await createTestTeamLeagueSeason(team, league, season)
        await giveTeamDiamonds(team, "1000000")

        await assert.rejects(
            async () => service.signFreeAgent(wrongUser, player, team, new Date(), uuidv4()),
            /Not authorized./
        )

    })

    it("should not sign a player when the team is queued", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Queued Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, league, season)
        await createTestTeamLeagueSeason(team, league, season)
        await createTeamQueue(team, league)
        await giveTeamDiamonds(team, "1000000")

        await assert.rejects(
            async () => service.signFreeAgent(user, player, team, new Date(), uuidv4()),
            /Team is queued for a game. Cannot sign player./
        )

    })

    it("should not sign a player when the team does not have enough diamonds", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Poor Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, league, season)
        await createTestTeamLeagueSeason(team, league, season)

        await assert.rejects(
            async () => service.signFreeAgent(user, player, team, new Date(), uuidv4()),
            /Team does not have enough diamonds to sign this player./
        )

    })

    it("should sign a player", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Signing Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, league, season)
        await createTestTeamLeagueSeason(team, league, season)
        await giveTeamDiamonds(team, "1000000000000000000000000")

        await service.signFreeAgent(user, player, team, new Date(), uuidv4())

        let fetchedPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
        let balance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)

        assert.equal(fetchedPls.teamId, team._id)
        assert.equal(BigInt(balance) < BigInt("1000000000000000000000000"), true)

    })

    it("should not drop an unrostered player", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, undefined, league, season)

        await assert.rejects(
            async () => service.dropPlayer(user, player, new Date()),
            /Player is not rostered./
        )

    })

    it("should not drop a player for the wrong user", async () => {

        let owner:User = createTestUser()
        let wrongUser:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Drop Team", owner)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, team, league, season)
        await createTestTeamLeagueSeason(team, league, season)
        await giveTeamDiamonds(team, "1000000000000000000000000")

        await assert.rejects(
            async () => service.dropPlayer(wrongUser, player, new Date()),
            /Not authorized./
        )

    })

    it("should not drop a player when the team is queued", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Queued Drop Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, team, league, season)
        await createTestTeamLeagueSeason(team, league, season)
        await createTeamQueue(team, league)
        await giveTeamDiamonds(team, "1000000000000000000000000")

        await assert.rejects(
            async () => service.dropPlayer(user, player, new Date()),
            /Team is queued for a game. Cannot drop player./
        )

    })

    it("should not drop a player when the team does not have enough diamonds", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Poor Drop Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, team, league, season)
        await createTestTeamLeagueSeason(team, league, season)

        await assert.rejects(
            async () => service.dropPlayer(user, player, new Date()),
            /Team does not have enough diamonds to drop this player./
        )

    })

    it("should drop a player", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let team:Team = await createTestTeam("Drop Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, team, league, season)

        await createTestTeamLeagueSeason(team, league, season)
        await giveTeamDiamonds(team, "1000000000000000000000000")

        await service.dropPlayer(user, player, new Date())

        let allPls:PlayerLeagueSeason[] = await playerLeagueSeasonService.getByPlayersSeason([player], season)
        let endedPls:PlayerLeagueSeason | undefined = allPls.find((pls) => pls._id == originalPls._id)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

        assert.notEqual(endedPls, undefined)
        assert.equal(endedPls.teamId, team._id)
        assert.notEqual(endedPls.endDate, undefined)

        assert.notEqual(currentPls._id, originalPls._id)
        assert.equal(currentPls.teamId, undefined)

    })

    it("should drop a player and cancel pending team market offers for that player", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let sellerTeam:Team = await createTestTeam("Seller Team", user)
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, sellerTeam, league, season)

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
        assert.equal(currentPls.teamId, undefined)

    })

    it("should not create a team market offer to the same team", async () => {

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

    it("should not create a team market offer when a player is not rostered by the seller team", async () => {

        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team")
        let otherTeam:Team = await createTestTeam("Other Team")
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, otherTeam, league, season)
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
            /Player is not currently rostered by the seller team./
        )

    })

    it("should not create a team market offer when the buyer does not have enough diamonds", async () => {

        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team")
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerTeam, league, season)
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

        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team")
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerTeam, league, season)
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

        assert.equal(fetched.buyerTeamId, buyerTeam._id)
        assert.equal(fetched.sellerTeamId, sellerTeam._id)
        assert.equal(fetched.package.playerIds.length, 1)
        assert.equal(fetched.package.playerIds[0], player._id)
        assert.equal(fetched.diamondAmount, "100")
        assert.equal(fetched.status, TeamMarketOfferStatus.PENDING)
        assert.notEqual(fetched.escrowTransactionId, undefined)
        assert.equal(BigInt(endingBalance), BigInt(startingBalance) - BigInt("100"))

    })


    it("should not cancel a team market offer that is not pending", async () => {

        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team")

        let offer:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            _id: uuidv4(),
            buyerTeamId: buyerTeam._id,
            sellerTeamId: sellerTeam._id,
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

        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team")
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerTeam, league, season)
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

        let user:User = createTestUser()
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team", user)

        let offer:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            _id: uuidv4(),
            buyerTeamId: buyerTeam._id,
            sellerTeamId: sellerTeam._id,
            package: {
                playerIds: [uuidv4()]
            },
            diamondAmount: "100",
            status: TeamMarketOfferStatus.CANCELLED,
            escrowTransactionId: uuidv4()
        })

        await service.put(offer)

        await assert.rejects(
            async () => service.acceptAndProcessTeamMarketOffer(user, offer, new Date()),
            /Team market offer is not pending./
        )

    })

    it("should not accept and process a team market offer for the wrong user", async () => {

        let owner:User = createTestUser()
        let wrongUser:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team", owner)
        let player:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(player, sellerTeam, league, season)
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

    it("should not accept and process a team market offer when the player is no longer on the seller team", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team", user)
        let otherTeam:Team = await createTestTeam("Other Team")
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, sellerTeam, league, season)

        await createTestTeamLeagueSeason(buyerTeam, league, season)
        await createTestTeamLeagueSeason(sellerTeam, league, season)
        await createTestTeamLeagueSeason(otherTeam, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createTeamMarketOffer(
            buyerTeam,
            sellerTeam,
            {
                playerIds: [player._id]
            },
            "100"
        )

        originalPls.teamId = otherTeam._id
        await playerLeagueSeasonService.put(originalPls)

        await assert.rejects(
            async () => service.acceptAndProcessTeamMarketOffer(user, offer, new Date()),
            /Player is not currently rostered by the seller team./
        )

    })

    it("should not accept and process a team market offer when the buyer roster has no space", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team", user)
        let buyerCatcher:Player = await createTestPlayer(Position.CATCHER)
        let sellerCatcher:Player = await createTestPlayer(Position.CATCHER)

        await createTestPlayerLeagueSeason(buyerCatcher, buyerTeam, league, season)
        await createTestPlayerLeagueSeason(sellerCatcher, sellerTeam, league, season)
        await createTestTeamLeagueSeason(buyerTeam, league, season)
        await createTestTeamLeagueSeason(sellerTeam, league, season)
        await giveTeamDiamonds(buyerTeam, "1000")

        let offer:TeamMarketOffer = await service.createTeamMarketOffer(
            buyerTeam,
            sellerTeam,
            {
                playerIds: [sellerCatcher._id]
            },
            "100"
        )

        await assert.rejects(
            async () => service.acceptAndProcessTeamMarketOffer(user, offer, new Date()),
            /Buyer roster does not have space for a/
        )

    })

    it("should accept and process a team market offer", async () => {

        let user:User = createTestUser()
        let league:League = await createTestLeague()
        let season:Season = await createTestSeason()
        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team", user)
        let player:Player = await createTestPlayer(Position.CATCHER)

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, sellerTeam, league, season)

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

        await service.acceptAndProcessTeamMarketOffer(user, offer, new Date())

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
        assert.equal(currentPls.teamId, buyerTeam._id)

    })


    function createTestUser(): User {

        return Object.assign(new User(), {
            _id: uuidv4()
        })

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

        let team:Team = Object.assign(new Team(), {
            _id: uuidv4(),
            name: name,
            userId: user?._id,
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

    async function createTestPlayerLeagueSeason(player:Player, team:Team | undefined, league:League, season:Season): Promise<PlayerLeagueSeason> {

        let pls:PlayerLeagueSeason = new PlayerLeagueSeason()

        pls._id = uuidv4()
        pls.playerId = player._id
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
                rotation: []
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