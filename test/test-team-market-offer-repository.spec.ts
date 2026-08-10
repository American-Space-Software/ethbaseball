import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { TeamMarketOfferRepository } from "../src/repository/team-market-offer-repository.js"
import { TeamRepository } from "../src/repository/team-repository.js"
import { SchemaService } from "../src/service/data/schema-service.js"

import { v4 as uuidv4 } from "uuid"
import { TeamMarketOffer } from "../src/dto/team-market-offer.js"
import { Team } from "../src/dto/team.js"
import { User } from "../src/dto/user.js"
import { Player } from "../src/dto/player.js"
import { Position } from "baseball-sim-engine"
import { TeamMarketOfferStatus } from "../src/service/enums.js"

import { DEFAULT_MAX_PITCH_COUNT, PersonalityType } from "../src/service/enums.js"
import { Handedness, PitchType } from "baseball-sim-engine"
import { PlayerService } from "../src/service/data/player-service.js"

let id1:string

describe("TeamMarketOfferRepository", async () => {

    let repository:TeamMarketOfferRepository
    let teamRepository:TeamRepository
    let schemaService:SchemaService
    let playerService:PlayerService


    before("", async () => {

        let container = getContainer()

        repository = container.get("TeamMarketOfferRepository")
        teamRepository = container.get("TeamRepository")
        schemaService = container.get(SchemaService)
        playerService = container.get(PlayerService)

        await schemaService.load()

    })

    it("should create and get a team market offer", async () => {

        let buyerUser:User = await createTestUser()
        let sellerUser:User = await createTestUser()

        let buyerPaymentTeam:Team = await createTestTeam("Buyer Payment Team")
        let sellerPaymentTeam:Team = await createTestTeam("Seller Payment Team")

        let player:Player = await createTestPlayer()

        let tmo:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUser._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeam._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "escrow-transaction-id",
            settlementTransactionId: undefined
        })

        await repository.put(tmo)

        id1 = tmo._id

        let fetched:TeamMarketOffer = await repository.get(id1)

        assert.equal(fetched._id, tmo._id)
        assert.equal(fetched.buyerUserId, buyerUser._id)
        assert.equal(fetched.sellerUserId, sellerUser._id)
        assert.equal(fetched.buyerPaymentTeamId, buyerPaymentTeam._id)
        assert.equal(fetched.sellerPaymentTeamId, sellerPaymentTeam._id)
        assert.equal(fetched.salePlayerId, player._id)
        assert.equal(fetched.status, TeamMarketOfferStatus.PENDING)
        assert.equal(fetched.diamondAmount, "100")
        assert.equal(fetched.escrowTransactionId, "escrow-transaction-id")
        assert.equal(fetched.settlementTransactionId, undefined)

    })

    it("should update a team market offer", async () => {

        let tmo:TeamMarketOffer = await repository.get(id1)

        tmo.status = TeamMarketOfferStatus.CANCELLED

        await repository.put(tmo)

        let fetched:TeamMarketOffer = await repository.get(id1)

        assert.equal(fetched._id, id1)
        assert.equal(fetched.status, TeamMarketOfferStatus.CANCELLED)

    })

    it("should get a pending sale listing by player id", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()

        let sellerPaymentTeam:Team = await createTestTeam("Seller Payment Team")
        let buyerPaymentTeam:Team = await createTestTeam("Buyer Payment Team")

        let player:Player = await createTestPlayer()
        let otherPlayer:Player = await createTestPlayer()

        let matchingListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING
        })

        let privateBuyOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUser._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeam._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "200",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "private-buy-escrow"
        })

        let otherPlayerListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: otherPlayer._id,
            diamondAmount: "300",
            status: TeamMarketOfferStatus.PENDING
        })

        let cancelledListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "400",
            status: TeamMarketOfferStatus.CANCELLED
        })

        await repository.put(matchingListing)
        await repository.put(privateBuyOffer)
        await repository.put(otherPlayerListing)
        await repository.put(cancelledListing)

        let listing:TeamMarketOffer | undefined = await repository.getPendingSaleListingByPlayerId(player._id)

        assert.notEqual(listing, undefined)
        assert.equal(listing!._id, matchingListing._id)
        assert.equal(listing!.buyerUserId, undefined)
        assert.equal(listing!.buyerPaymentTeamId, undefined)
        assert.equal(listing!.escrowTransactionId, undefined)
        assert.equal(listing!.salePlayerId, player._id)
        assert.equal(listing!.status, TeamMarketOfferStatus.PENDING)
        assert.equal(listing!.diamondAmount, "100")

    })

    it("should return undefined when there is no pending sale listing by player id", async () => {

        let player:Player = await createTestPlayer()

        let listing:TeamMarketOffer | undefined = await repository.getPendingSaleListingByPlayerId(player._id)

        assert.equal(listing, undefined)

    })

    it("should list sale listings by seller user id", async () => {

        let sellerUser:User = await createTestUser()
        let otherSellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()

        let sellerPaymentTeam:Team = await createTestTeam("Seller Payment Team")
        let otherSellerPaymentTeam:Team = await createTestTeam("Other Seller Payment Team")
        let buyerPaymentTeam:Team = await createTestTeam("Buyer Payment Team")

        let playerOne:Player = await createTestPlayer()
        let playerTwo:Player = await createTestPlayer()
        let playerThree:Player = await createTestPlayer()
        let playerFour:Player = await createTestPlayer()

        let listingOne:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: playerOne._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING
        })

        let listingTwo:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: playerTwo._id,
            diamondAmount: "200",
            status: TeamMarketOfferStatus.PENDING
        })

        let privateBuyOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUser._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeam._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: playerThree._id,
            diamondAmount: "300",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "private-buy-escrow"
        })

        let otherSellerListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: otherSellerUser._id,
            sellerPaymentTeamId: otherSellerPaymentTeam._id,
            salePlayerId: playerFour._id,
            diamondAmount: "400",
            status: TeamMarketOfferStatus.PENDING
        })

        let cancelledListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: await createTestPlayerId(),
            diamondAmount: "500",
            status: TeamMarketOfferStatus.CANCELLED
        })

        await repository.put(listingOne)
        await repository.put(listingTwo)
        await repository.put(privateBuyOffer)
        await repository.put(otherSellerListing)
        await repository.put(cancelledListing)

        let listings:TeamMarketOffer[] = await repository.listSaleListingsBySellerUserId(sellerUser._id)

        assert.equal(listings.some(o => o._id == listingOne._id), true)
        assert.equal(listings.some(o => o._id == listingTwo._id), true)
        assert.equal(listings.some(o => o._id == privateBuyOffer._id), false)
        assert.equal(listings.some(o => o._id == otherSellerListing._id), false)
        assert.equal(listings.some(o => o._id == cancelledListing._id), false)

    })

    it("should list pending private buy offers by player id ordered highest first", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUserOne:User = await createTestUser()
        let buyerUserTwo:User = await createTestUser()
        let buyerUserThree:User = await createTestUser()

        let sellerPaymentTeam:Team = await createTestTeam("Seller Payment Team")
        let buyerPaymentTeamOne:Team = await createTestTeam("Buyer Payment Team One")
        let buyerPaymentTeamTwo:Team = await createTestTeam("Buyer Payment Team Two")
        let buyerPaymentTeamThree:Team = await createTestTeam("Buyer Payment Team Three")

        let player:Player = await createTestPlayer()
        let otherPlayer:Player = await createTestPlayer()

        let lowOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUserOne._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeamOne._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "low-escrow"
        })

        let highOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUserTwo._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeamTwo._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "500",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "high-escrow"
        })

        let otherPlayerOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUserThree._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeamThree._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: otherPlayer._id,
            diamondAmount: "999",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "other-player-escrow"
        })

        let saleListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "1000",
            status: TeamMarketOfferStatus.PENDING
        })

        let cancelledOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUserThree._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeamThree._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "2000",
            status: TeamMarketOfferStatus.CANCELLED,
            escrowTransactionId: "cancelled-escrow"
        })

        await repository.put(lowOffer)
        await repository.put(highOffer)
        await repository.put(otherPlayerOffer)
        await repository.put(saleListing)
        await repository.put(cancelledOffer)

        let offers:TeamMarketOffer[] = await repository.listPendingByPlayerId(player._id)

        assert.equal(offers.length, 2)
        assert.equal(offers[0]._id, highOffer._id)
        assert.equal(offers[1]._id, lowOffer._id)

    })

    it("should get the highest pending private buy offer by player id", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUserOne:User = await createTestUser()
        let buyerUserTwo:User = await createTestUser()

        let sellerPaymentTeam:Team = await createTestTeam("Seller Payment Team")
        let buyerPaymentTeamOne:Team = await createTestTeam("Buyer Payment Team One")
        let buyerPaymentTeamTwo:Team = await createTestTeam("Buyer Payment Team Two")

        let player:Player = await createTestPlayer()

        let lowOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUserOne._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeamOne._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "low-escrow"
        })

        let highOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUserTwo._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeamTwo._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "500",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "high-escrow"
        })

        await repository.put(lowOffer)
        await repository.put(highOffer)

        let highestOffer:TeamMarketOffer | undefined = await repository.getHighestPendingByPlayerId(player._id)

        assert.notEqual(highestOffer, undefined)
        assert.equal(highestOffer!._id, highOffer._id)
        assert.equal(highestOffer!.diamondAmount, "500")

    })

    it("should return undefined when there is no highest pending private buy offer", async () => {

        let player:Player = await createTestPlayer()

        let highestOffer:TeamMarketOffer | undefined = await repository.getHighestPendingByPlayerId(player._id)

        assert.equal(highestOffer, undefined)

    })

    it("should list private buy offers by buyer user id", async () => {

        let buyerUser:User = await createTestUser()
        let otherBuyerUser:User = await createTestUser()
        let sellerUser:User = await createTestUser()

        let buyerPaymentTeam:Team = await createTestTeam("Buyer Payment Team")
        let otherBuyerPaymentTeam:Team = await createTestTeam("Other Buyer Payment Team")
        let sellerPaymentTeam:Team = await createTestTeam("Seller Payment Team")

        let playerOne:Player = await createTestPlayer()
        let playerTwo:Player = await createTestPlayer()
        let playerThree:Player = await createTestPlayer()

        let buyerOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUser._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeam._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: playerOne._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "buyer-escrow"
        })

        let otherBuyerOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: otherBuyerUser._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: otherBuyerPaymentTeam._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: playerTwo._id,
            diamondAmount: "200",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "other-buyer-escrow"
        })

        let buyerSaleListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: buyerUser._id,
            sellerPaymentTeamId: buyerPaymentTeam._id,
            salePlayerId: playerThree._id,
            diamondAmount: "300",
            status: TeamMarketOfferStatus.PENDING
        })

        await repository.put(buyerOffer)
        await repository.put(otherBuyerOffer)
        await repository.put(buyerSaleListing)

        let offers:TeamMarketOffer[] = await repository.listPendingByBuyerUserId(buyerUser._id)

        assert.equal(offers.some(o => o._id == buyerOffer._id), true)
        assert.equal(offers.some(o => o._id == otherBuyerOffer._id), false)
        assert.equal(offers.some(o => o._id == buyerSaleListing._id), false)

    })


    it("should list offers by buyer user id and player id", async () => {

        let buyerUser:User = await createTestUser()
        let otherBuyerUser:User = await createTestUser()
        let sellerUser:User = await createTestUser()

        let buyerPaymentTeam:Team = await createTestTeam("Buyer Payment Team")
        let otherBuyerPaymentTeam:Team = await createTestTeam("Other Buyer Payment Team")
        let sellerPaymentTeam:Team = await createTestTeam("Seller Payment Team")

        let player:Player = await createTestPlayer()
        let otherPlayer:Player = await createTestPlayer()

        let matchingOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUser._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeam._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "matching-escrow"
        })

        let otherBuyerOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: otherBuyerUser._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: otherBuyerPaymentTeam._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "200",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "other-buyer-escrow"
        })

        let otherPlayerOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUser._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeam._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: otherPlayer._id,
            diamondAmount: "300",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "other-player-escrow"
        })

        let saleListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: player._id,
            diamondAmount: "400",
            status: TeamMarketOfferStatus.PENDING
        })

        await repository.put(matchingOffer)
        await repository.put(otherBuyerOffer)
        await repository.put(otherPlayerOffer)
        await repository.put(saleListing)

        let offers:TeamMarketOffer[] = await repository.listPendingByBuyerUserIdAndPlayerId(buyerUser._id, player._id)

        assert.equal(offers.length, 1)
        assert.equal(offers[0]._id, matchingOffer._id)
        assert.equal(offers[0].buyerUserId, buyerUser._id)
        assert.equal(offers[0].salePlayerId, player._id)

    })


    it("should list pending sale listings", async () => {

        let sellerUser:User = await createTestUser()
        let buyerUser:User = await createTestUser()

        let sellerPaymentTeam:Team = await createTestTeam("Seller Payment Team")
        let buyerPaymentTeam:Team = await createTestTeam("Buyer Payment Team")

        let playerOne:Player = await createTestPlayer()
        let playerTwo:Player = await createTestPlayer()
        let playerThree:Player = await createTestPlayer()

        let listingOne:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: playerOne._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING
        })

        let listingTwo:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: playerTwo._id,
            diamondAmount: "200",
            status: TeamMarketOfferStatus.PENDING
        })

        let cancelledListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: playerThree._id,
            diamondAmount: "300",
            status: TeamMarketOfferStatus.CANCELLED
        })

        let buyOffer:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            buyerUserId: buyerUser._id,
            sellerUserId: sellerUser._id,
            buyerPaymentTeamId: buyerPaymentTeam._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: playerThree._id,
            diamondAmount: "400",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: uuidv4()
        })

        await repository.put(listingOne)
        await repository.put(listingTwo)
        await repository.put(cancelledListing)
        await repository.put(buyOffer)

        let listings:TeamMarketOffer[] = await repository.listPendingSaleListings()
        let listingIds:string[] = listings.map((offer) => offer._id)

        assert.equal(listingIds.includes(listingOne._id), true)
        assert.equal(listingIds.includes(listingTwo._id), true)
        assert.equal(listingIds.includes(cancelledListing._id), false)
        assert.equal(listingIds.includes(buyOffer._id), false)

    })   

    it("should page pending sale listings", async () => {

        let sellerUser:User = await createTestUser()
        let sellerPaymentTeam:Team = await createTestTeam("Seller Payment Team")

        let firstPlayer:Player = await createTestPlayer()
        let secondPlayer:Player = await createTestPlayer()
        let thirdPlayer:Player = await createTestPlayer()

        let firstListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: firstPlayer._id,
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING,
            dateCreated: new Date("2099-01-01T00:00:00.000Z")
        })

        let secondListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: secondPlayer._id,
            diamondAmount: "200",
            status: TeamMarketOfferStatus.PENDING,
            dateCreated: new Date("2099-01-02T00:00:00.000Z")
        })

        let thirdListing:TeamMarketOffer = TeamMarketOffer.build({
            _id: uuidv4(),
            sellerUserId: sellerUser._id,
            sellerPaymentTeamId: sellerPaymentTeam._id,
            salePlayerId: thirdPlayer._id,
            diamondAmount: "300",
            status: TeamMarketOfferStatus.PENDING,
            dateCreated: new Date("2099-01-03T00:00:00.000Z")
        })

        await repository.put(firstListing)
        await repository.put(secondListing)
        await repository.put(thirdListing)

        let firstPage:TeamMarketOffer[] = await repository.listPendingSaleListings({
            limit: 2,
            offset: 0
        })

        let secondPage:TeamMarketOffer[] = await repository.listPendingSaleListings({
            limit: 2,
            offset: 2
        })

        assert.equal(firstPage.length, 2)
        assert.equal(firstPage[0]._id, thirdListing._id)
        assert.equal(firstPage[1]._id, secondListing._id)

        assert.equal(secondPage.some((offer) => offer._id == firstListing._id), true)
        assert.equal(secondPage.some((offer) => offer._id == secondListing._id), false)
        assert.equal(secondPage.some((offer) => offer._id == thirdListing._id), false)

    })

    async function createTestUser(): Promise<User> {

        let user:User = User.build({
            _id: uuidv4(),
            address: `test-${uuidv4()}`,
            discordId: null,
            discordRefreshToken: null,
            discordAccessToken: null,
            discordProfile: null
        })

        await user.save()

        return user

    }

    async function createTestPlayer(primaryPosition:Position = Position.CATCHER): Promise<Player> {

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

    async function createTestPlayerId(): Promise<string> {

        let player:Player = await createTestPlayer()

        return player._id

    }

    async function createTestTeam(name:string): Promise<Team> {

        let team:Team = Object.assign(new Team(), {
            _id: uuidv4(),
            name: name,
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

    after("After", async () => {
    })

})