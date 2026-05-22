import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { TradeRequestRepository } from "../src/repository/trade-request-repository.js"
import { TeamRepository } from "../src/repository/team-repository.js"
import { SchemaService } from "../src/service/data/schema-service.js"

import { v4 as uuidv4 } from "uuid"
import { TradeRequest } from "../src/dto/trade-request.js"
import { Team } from "../src/dto/team.js"
import { TradeRequestStatus } from "../src/service/enums.js"

let id1:string

describe("TradeRequestRepository", async () => {

    let repository:TradeRequestRepository
    let teamRepository:TeamRepository
    let schemaService:SchemaService

    before("", async () => {

        let container = getContainer()

        repository = container.get("TradeRequestRepository")
        teamRepository = container.get("TeamRepository")
        schemaService = container.get(SchemaService)

        await schemaService.load()

    })

    it("should create & get a trade request", async () => {

        let fromTeam:Team = await createTestTeam("From Team")
        let toTeam:Team = await createTestTeam("To Team")

        let tradeRequest:TradeRequest = Object.assign(new TradeRequest(), {
            _id: uuidv4(),
            fromTeamId: fromTeam._id,
            toTeamId: toTeam._id,
            fromPackage: {
                playerIds: [uuidv4(), uuidv4()],
                diamonds: "100"
            },
            toPackage: {
                playerIds: [uuidv4()],
                diamonds: "25"
            },
            status: TradeRequestStatus.PENDING
        })

        await repository.put(tradeRequest)

        id1 = tradeRequest._id

        let fetched = await repository.get(id1)

        assert.equal(fetched._id, id1)
        assert.equal(fetched.fromTeamId, fromTeam._id)
        assert.equal(fetched.toTeamId, toTeam._id)
        assert.equal(fetched.status, TradeRequestStatus.PENDING)
        assert.equal(fetched.fromPackage.diamonds, "100")
        assert.equal(fetched.toPackage.diamonds, "25")
        assert.equal(fetched.fromPackage.playerIds.length, 2)
        assert.equal(fetched.toPackage.playerIds.length, 1)

    })

    it("should update a trade request", async () => {

        let tradeRequest:TradeRequest = await repository.get(id1)

        tradeRequest.status = TradeRequestStatus.CANCELLED

        await repository.put(tradeRequest)

        let fetched = await repository.get(id1)

        assert.equal(fetched._id, id1)
        assert.equal(fetched.status, TradeRequestStatus.CANCELLED)

    })

    async function createTestTeam(name:string): Promise<Team> {

        let team:Team = Object.assign(new Team(), {
            _id: uuidv4(),
            name: name,
            longTermRating: { rating: 1500 },
            seasonRating: { rating: 1500 },
            developmentStrategy: { budgetPercent: 50 },
            colors: {}
        })

        await teamRepository.put(team)

        return team

    }

    after("After", async () => {
    })

})