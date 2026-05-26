import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { TeamMarketOfferRepository } from "../src/repository/team-market-offer-repository.js"
import { TeamRepository } from "../src/repository/team-repository.js"
import { SchemaService } from "../src/service/data/schema-service.js"

import { v4 as uuidv4 } from "uuid"
import { TeamMarketOffer } from "../src/dto/team-market-offer.js"
import { Team } from "../src/dto/team.js"
import { TeamMarketOfferStatus } from "../src/service/enums.js"

let id1:string

describe("TeamMarketOfferRepository", async () => {

    let repository:TeamMarketOfferRepository
    let teamRepository:TeamRepository
    let schemaService:SchemaService

    before("", async () => {

        let container = getContainer()

        repository = container.get("TeamMarketOfferRepository")
        teamRepository = container.get("TeamRepository")
        schemaService = container.get(SchemaService)

        await schemaService.load()

    })

    it("should create & get a team market offer", async () => {

        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team")

        let tmo:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            _id: uuidv4(),
            buyerTeamId: buyerTeam._id,
            sellerTeamId: sellerTeam._id,
            package: {
                playerIds: [uuidv4(), uuidv4()]
            },
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "escrow-transaction-id",
            settlementTransactionId: undefined
        })

        await repository.put(tmo)

        id1 = tmo._id

        let fetched = await repository.get(id1)

        assert.equal(fetched._id, id1)
        assert.equal(fetched.buyerTeamId, buyerTeam._id)
        assert.equal(fetched.sellerTeamId, sellerTeam._id)
        assert.equal(fetched.status, TeamMarketOfferStatus.PENDING)
        assert.equal(fetched.diamondAmount, "100")
        assert.equal(fetched.package.playerIds.length, 2)
        assert.equal(fetched.escrowTransactionId, "escrow-transaction-id")
        assert.equal(fetched.settlementTransactionId, undefined)

    })

    it("should update a team market offer", async () => {

        let tmo:TeamMarketOffer = await repository.get(id1)

        tmo.status = TeamMarketOfferStatus.CANCELLED

        await repository.put(tmo)

        let fetched = await repository.get(id1)

        assert.equal(fetched._id, id1)
        assert.equal(fetched.status, TeamMarketOfferStatus.CANCELLED)

    })

    it("should list pending team market offers by player id", async () => {

        let buyerTeam:Team = await createTestTeam("Buyer Team")
        let sellerTeam:Team = await createTestTeam("Seller Team")

        let playerId = uuidv4()
        let otherPlayerId = uuidv4()

        let matchingOffer:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            _id: uuidv4(),
            buyerTeamId: buyerTeam._id,
            sellerTeamId: sellerTeam._id,
            package: {
                playerIds: [playerId, otherPlayerId]
            },
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "matching-escrow-transaction-id"
        })

        let nonMatchingOffer:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            _id: uuidv4(),
            buyerTeamId: buyerTeam._id,
            sellerTeamId: sellerTeam._id,
            package: {
                playerIds: [uuidv4()]
            },
            diamondAmount: "100",
            status: TeamMarketOfferStatus.PENDING,
            escrowTransactionId: "non-matching-escrow-transaction-id"
        })

        let cancelledMatchingOffer:TeamMarketOffer = Object.assign(new TeamMarketOffer(), {
            _id: uuidv4(),
            buyerTeamId: buyerTeam._id,
            sellerTeamId: sellerTeam._id,
            package: {
                playerIds: [playerId]
            },
            diamondAmount: "100",
            status: TeamMarketOfferStatus.CANCELLED,
            escrowTransactionId: "cancelled-escrow-transaction-id"
        })

        await repository.put(matchingOffer)
        await repository.put(nonMatchingOffer)
        await repository.put(cancelledMatchingOffer)

        let offers:TeamMarketOffer[] = await repository.listPendingByPlayerId(playerId)

        assert.equal(offers.length, 1)
        assert.equal(offers[0]._id, matchingOffer._id)
        assert.equal(offers[0].status, TeamMarketOfferStatus.PENDING)
        assert.equal(offers[0].package.playerIds.includes(playerId), true)

    })

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