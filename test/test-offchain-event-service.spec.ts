import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { SchemaService } from "../src/service/data/schema-service.js"
import { OffchainEventService } from "../src/service/data/offchain-event-service.js"
import { PlayerService } from "../src/service/data/player-service.js"
import { TeamService } from "../src/service/data/team-service.js"
import { LeagueService } from "../src/service/data/league-service.js"
import { OwnerService } from "../src/service/data/owner-service.js"

import { Player } from "../src/dto/player.js"
import { Team } from "../src/dto/team.js"
import { League } from "../src/dto/league.js"
import { Owner } from "../src/dto/owner.js"

import { ContractType, OffChainEventSource, PersonalityType } from "../src/service/enums.js"
import { Handedness, PitchType, Position } from "../src/baseball-sim-engine/index.js"

import { v4 as uuidv4 } from "uuid"

describe("OffchainEventService", async () => {

    let service:OffchainEventService
    let playerService:PlayerService
    let teamService:TeamService
    let leagueService:LeagueService
    let ownerService:OwnerService
    let schemaService:SchemaService

    let player:Player
    let fromTeam:Team
    let toTeam:Team

    before("", async () => {

        let container = getContainer()

        service = container.get(OffchainEventService)
        playerService = container.get(PlayerService)
        teamService = container.get(TeamService)
        leagueService = container.get(LeagueService)
        ownerService = container.get(OwnerService)
        schemaService = container.get(SchemaService)

        await schemaService.load()

        player = await createTestPlayer()
        fromTeam = await createTestTeam("From Team")
        toTeam = await createTestTeam("To Team")

    })

    it("should create a team mint event", async () => {

        let source:OffChainEventSource = {
            type: "test"
        } as OffChainEventSource

        let created = await service.createTeamMintEvent(toTeam._id, "100", source, "tx-team-mint-xyz")

        let fetched = await service.get(created._id)

        assert.equal(fetched._id, created._id)
        assert.equal(fetched.contractType, ContractType.DIAMONDS)
        assert.equal(fetched.event, "Transfer")
        assert.equal(fetched.fromAddress, "0x0000000000000000000000000000000000000000")
        assert.equal(fetched.toTeamId, toTeam._id)
        assert.equal(fetched.amount, "100")
        assert.equal(fetched.transactionId, "tx-team-mint-xyz")
        assert.equal(fetched.source.type, "test")

    })

    it("should not create a team mint event with a negative amount", async () => {

        let source:OffChainEventSource = {
            type: "test"
        } as OffChainEventSource

        await assert.rejects(
            async () => service.createTeamMintEvent(toTeam._id, "-1", source, "tx-team-mint-negative"),
            /Mint amount can not be negative./
        )

    })

    it("should create a team burn event", async () => {

        let created = await service.createTeamBurnEvent(fromTeam._id, "50", "tx-team-burn-xyz")

        let fetched = await service.get(created._id)

        assert.equal(fetched._id, created._id)
        assert.equal(fetched.contractType, ContractType.DIAMONDS)
        assert.equal(fetched.event, "Transfer")
        assert.equal(fetched.toAddress, "0x0000000000000000000000000000000000000000")
        assert.equal(fetched.fromTeamId, fromTeam._id)
        assert.equal(fetched.amount, "50")
        assert.equal(fetched.transactionId, "tx-team-burn-xyz")

    })

    it("should not create a team burn event with a zero amount", async () => {

        await assert.rejects(
            async () => service.createTeamBurnEvent(fromTeam._id, "0", "tx-team-burn-zero"),
            /Burn amount can not be negative./
        )

    })

    it("should create a player transfer event", async () => {

        let created = await service.createPlayerTransferEvent(fromTeam._id, toTeam._id, player._id, "tx-player-transfer-xyz")

        let fetched = await service.get(created._id)

        assert.equal(fetched._id, created._id)
        assert.equal(fetched.contractType, ContractType.PLAYERS)
        assert.equal(fetched.event, "Transfer")
        assert.equal(fetched.fromTeamId, fromTeam._id)
        assert.equal(fetched.toTeamId, toTeam._id)
        assert.equal(fetched.playerId, player._id)
        assert.equal(fetched.transactionId, "tx-player-transfer-xyz")

    })

    it("should create a free agent transfer event", async () => {

        let created = await service.createFreeAgentTransferEvent(toTeam._id, player._id, "tx-free-agent-xyz")

        let fetched = await service.get(created._id)

        assert.equal(fetched._id, created._id)
        assert.equal(fetched.contractType, ContractType.PLAYERS)
        assert.equal(fetched.event, "Transfer")
        assert.equal(fetched.toTeamId, toTeam._id)
        assert.equal(fetched.playerId, player._id)
        assert.equal(fetched.transactionId, "tx-free-agent-xyz")

    })

    it("should create a player drop transfer event", async () => {

        let created = await service.createPlayerDropTransferEvent(fromTeam._id, player._id, "tx-player-drop-xyz")

        let fetched = await service.get(created._id)

        assert.equal(fetched._id, created._id)
        assert.equal(fetched.contractType, ContractType.PLAYERS)
        assert.equal(fetched.event, "Transfer")
        assert.equal(fetched.fromTeamId, fromTeam._id)
        assert.equal(fetched.playerId, player._id)
        assert.equal(fetched.transactionId, "tx-player-drop-xyz")

    })

    it("should create a player experience event", async () => {

        let source:OffChainEventSource = {
            type: "test"
        } as OffChainEventSource

        let created = await service.createPlayerExperienceEvent(toTeam._id, player._id, "25", source, "tx-player-experience-xyz")

        let fetched = await service.get(created._id)

        assert.equal(fetched._id, created._id)
        assert.equal(fetched.contractType, ContractType.EXPERIENCE)
        assert.equal(fetched.event, "Transfer")
        assert.equal(fetched.toTeamId, toTeam._id)
        assert.equal(fetched.playerId, player._id)
        assert.equal(fetched.amount, "25")
        assert.equal(fetched.transactionId, "tx-player-experience-xyz")
        assert.equal(fetched.source.type, "test")

    })


    it("should create a player transfer event", async () => {

        let created = await service.createPlayerTransferEvent(
            fromTeam._id,
            toTeam._id,
            player._id,
            "tx-player-transfer-xyz"
        )

        let fetched = await service.get(created._id)

        assert.equal(fetched._id, created._id)
        assert.equal(fetched.contractType, ContractType.PLAYERS)
        assert.equal(fetched.event, "Transfer")
        assert.equal(fetched.fromTeamId, fromTeam._id)
        assert.equal(fetched.toTeamId, toTeam._id)
        assert.equal(fetched.playerId, player._id)
        assert.equal(fetched.transactionId, "tx-player-transfer-xyz")

    })


    async function createTestTeam(name:string): Promise<Team> {

        let owner:Owner = await ownerService.getOrCreate(`owner-${uuidv4()}`)

        let league:League = new League()
        await leagueService.put(league)

        let team:Team = Object.assign(new Team(), {
            _id: uuidv4(),
            name: name,
            ownerId: owner._id,
            rating: { rating: 1500 },
            isGhost: false,
            leagueId: league._id,
            overallRecord: {
                wins: 0,
                losses: 0
            },
            finances: {},
            colors: {},
            diamondBalance: "0",
            longTermRating: 1500,
            seasonRating: 1500,
            tokenId: Math.floor(Math.random() * 1000000000),
            developmentStrategy: { budgetPercent: 50 }
        })

        await teamService.put(team)

        return team

    }

    async function createTestPlayer(): Promise<Player> {

        let player:Player = new Player()

        player._id = uuidv4()
        player.firstName = "Bob"
        player.lastName = "Smith"
        player.zodiacSign = "ZOD"
        player.age = 18
        player.stamina = 1
        player.primaryPosition = Position.CATCHER
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

    after("After", async () => {
    })

})