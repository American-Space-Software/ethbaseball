import assert from "assert"
import { v4 as uuidv4 } from "uuid"

import { getContainer } from "./inversify.config.js"

import { SchemaService } from "../src/service/data/schema-service.js"

import { TeamQueueRepository } from "../src/repository/team-queue-repository.js"
import { TeamQueue } from "../src/dto/team-queue.js"

import { TeamRepository } from "../src/repository/team-repository.js"
import { Team } from "../src/dto/team.js"

import { LeagueRepository } from "../src/repository/league-repository.js"
import { League } from "../src/dto/league.js"

let tqId1: string
let team1: Team
let team2: Team
let league1: League

describe("TeamQueueRepository", async () => {
  let teamQueueRepository: TeamQueueRepository
  let teamRepository: TeamRepository
  let leagueRepository: LeagueRepository
  let schemaService: SchemaService

  const createLeague = async (name: string) => {
    const league: League = Object.assign(new League(), {
      _id: uuidv4(),
      name
    })
    await leagueRepository.put(league)
    return league
  }

  const createTeam = async (leagueId: string, tokenId: number, name: string) => {
    const team: Team = Object.assign(new Team(), {
      _id: uuidv4(),
      name,
      ownerId: "xyz",
      rating: { rating: 1500 },
      isGhost: false,
      leagueId,
      overallRecord: { wins: 0, losses: 0 },
      finances: {},
      colors: {},
      diamondBalance: "0",
      longTermRating: 1500,
      seasonRating: 1500,
      tokenId
    })

    await teamRepository.put(team)
    return team
  }

  const createQueueRow = async (team: Team, league: League) => {

    const tq: TeamQueue = Object.assign(new TeamQueue(), {
      _id: uuidv4(),
      teamId: team._id,
      leagueId: league._id,
      teamRating: 0,
      maxRatingDiff: 0,
      lastUpdated: null,
      dateCreated: null
    })

    await teamQueueRepository.put(tq)
    return tq

  }

  before("", async () => {
    const container = getContainer()

    teamQueueRepository = container.get("TeamQueueRepository")
    teamRepository = container.get("TeamRepository")
    leagueRepository = container.get("LeagueRepository")
    schemaService = container.get(SchemaService)

    await schemaService.load()
    await teamQueueRepository.clear()

    league1 = await createLeague("Queue Test League 1")

    team1 = await createTeam(league1._id, 999, "Queue Test Team 1")
    team2 = await createTeam(league1._id, 1000, "Queue Test Team 2")
  })

  it("should create & get a team queue record", async () => {
    const tq = await createQueueRow(team1, league1)
    tqId1 = tq._id

    const fetched = await teamQueueRepository.get(tqId1)

    assert.ok(fetched)
    assert.equal(fetched._id, tqId1)
    assert.equal(fetched.teamId, team1._id)
  })

  it("should update a team queue record", async () => {
    const tq: TeamQueue = await teamQueueRepository.get(tqId1)
    assert.ok(tq)

    tq.teamId = team2._id
    await teamQueueRepository.put(tq)

    const fetched = await teamQueueRepository.get(tqId1)

    assert.ok(fetched)
    assert.equal(fetched._id, tqId1)
    assert.equal(fetched.teamId, team2._id)
  })

  it("should return correct isTeamQueued result", async () => {
    await teamQueueRepository.clear()

    const queuedBefore = await teamQueueRepository.isTeamQueued(team1)
    assert.equal(queuedBefore, false)

    await createQueueRow(team1, league1)

    const queuedAfterTeam1 = await teamQueueRepository.isTeamQueued(team1)
    const queuedAfterTeam2 = await teamQueueRepository.isTeamQueued(team2)

    assert.equal(queuedAfterTeam1, true)
    assert.equal(queuedAfterTeam2, false)
  })

  it("should clear the queue", async () => {
    await teamQueueRepository.clear()

    // create 2 rows with distinct teamIds (teamId is UNIQUE)
    await createQueueRow(team1, league1)
    await createQueueRow(team2, league1)

    await teamQueueRepository.clear()

    const rows = await teamQueueRepository.list(50, 0)
    assert.equal(rows.length, 0)
  })

  after("After", async () => {
    await teamQueueRepository.clear()
  })
})
