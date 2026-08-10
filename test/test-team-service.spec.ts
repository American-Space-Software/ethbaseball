import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { TeamService } from "../src/service/data/team-service.js"
import { PlayerService } from "../src/service/data/player-service.js"
import { LeagueService } from "../src/service/data/league-service.js"
import { OwnerService } from "../src/service/data/owner-service.js"
import { SchemaService } from "../src/service/data/schema-service.js"
import { PlayerLeagueSeasonService } from "../src/service/data/player-league-season-service.js"
import { SeasonService } from "../src/service/data/season-service.js"
import { TeamLeagueSeasonService } from "../src/service/data/team-league-season-service.js"

import { Team } from "../src/dto/team.js"
import { Player } from "../src/dto/player.js"
import { League } from "../src/dto/league.js"
import { Owner } from "../src/dto/owner.js"
import { Season } from "../src/dto/season.js"
import { PlayerLeagueSeason } from "../src/dto/player-league-season.js"
import { TeamLeagueSeason } from "../src/dto/team-league-season.js"

import { DEFAULT_MAX_PITCH_COUNT, PersonalityType } from "../src/service/enums.js"
import { Handedness, PitchType, Position } from "baseball-sim-engine"

import { v4 as uuidv4 } from "uuid"

describe("TeamService", async () => {

    let teamService:TeamService
    let playerService:PlayerService
    let leagueService:LeagueService
    let ownerService:OwnerService
    let playerLeagueSeasonService:PlayerLeagueSeasonService
    let schemaService:SchemaService
    let seasonService:SeasonService
    let teamLeagueSeasonService:TeamLeagueSeasonService

    before("", async () => {

        let container = getContainer()

        teamService = container.get(TeamService)
        playerService = container.get(PlayerService)
        leagueService = container.get(LeagueService)
        ownerService = container.get(OwnerService)
        schemaService = container.get(SchemaService)
        playerLeagueSeasonService = container.get(PlayerLeagueSeasonService)
        seasonService = container.get(SeasonService)
        teamLeagueSeasonService = container.get(TeamLeagueSeasonService)

        await schemaService.load()

    })

    it("should transfer a player from one team to another", async () => {

        let league:League = await createTestLeague()
        let fromTeam:Team = await createTestTeam("From Team", league)
        let toTeam:Team = await createTestTeam("To Team", league)
        let player:Player = await createTestPlayer()
        let season:Season = await createTestSeason()

        let originalPls:PlayerLeagueSeason = await createTestPlayerLeagueSeason(player, fromTeam, league, season)

        await createTestTeamLeagueSeason(fromTeam, league, season)
        await createTestTeamLeagueSeason(toTeam, league, season)

        await teamService.transferPlayerToTeam(player, fromTeam, toTeam, season, "tx-transfer-player-to-team-xyz")

        let endedPls:PlayerLeagueSeason = await playerLeagueSeasonService.getById(originalPls._id)
        let currentPls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

        assert.equal(endedPls.teamId, fromTeam._id)
        assert.notEqual(endedPls.endDate, undefined)

        assert.notEqual(currentPls._id, originalPls._id)
        assert.equal(currentPls.teamId, toTeam._id)
        assert.equal(currentPls.leagueId, league._id)
        assert.equal(currentPls.playerId, player._id)

    })

    it("should not transfer a player from the wrong team", async () => {

        let league:League = await createTestLeague()
        let fromTeam:Team = await createTestTeam("From Team", league)
        let wrongFromTeam:Team = await createTestTeam("Wrong From Team", league)
        let toTeam:Team = await createTestTeam("To Team", league)
        let player:Player = await createTestPlayer()
        let season:Season = await createTestSeason()

        await createTestPlayerLeagueSeason(player, fromTeam, league, season)
        await createTestTeamLeagueSeason(fromTeam, league, season)
        await createTestTeamLeagueSeason(wrongFromTeam, league, season)
        await createTestTeamLeagueSeason(toTeam, league, season)

        await assert.rejects(
            async () => teamService.transferPlayerToTeam(player, wrongFromTeam, toTeam, season, "tx-transfer-player-to-team-wrong-from-xyz"),
            /Player is not currently on this team./
        )

    })

    async function createTestLeague(): Promise<League> {

        let league:League = Object.assign(new League(), {
            _id: uuidv4(),
            name: "Test League"
        })

        await leagueService.put(league)

        return league

    }

    async function createTestSeason(): Promise<Season> {

        let season:Season = new Season()

        season._id = uuidv4()
        season.startDate = new Date()
        season.endDate = new Date()

        await seasonService.put(season)

        return season

    }

    async function createTestPlayerLeagueSeason(player:Player, team:Team, league:League, season:Season): Promise<PlayerLeagueSeason> {

        let pls:PlayerLeagueSeason = new PlayerLeagueSeason()

        pls._id = uuidv4()
        pls.playerId = player._id
        pls.teamId = team._id
        pls.leagueId = league._id
        pls.seasonId = season._id
        pls.seasonIndex = 1

        pls.primaryPosition = player.primaryPosition
        pls.overallRating = player.overallRating
        pls.pitchRatings = player.pitchRatings
        pls.hittingRatings = player.hittingRatings
        pls.potentialOverallRating = player.potentialOverallRating
        pls.potentialPitchRatings = player.potentialPitchRatings
        pls.potentialHittingRatings = player.potentialHittingRatings
        pls.age = player.age
        //@ts-ignore
        pls.stats = {}

        await playerLeagueSeasonService.put(pls)

        return pls

    }

    async function createTestTeamLeagueSeason(team:Team, league:League, season:Season): Promise<TeamLeagueSeason> {

        let tls:TeamLeagueSeason = new TeamLeagueSeason()

        tls._id = uuidv4()
        tls.teamId = team._id
        tls.leagueId = league._id
        tls.seasonId = season._id
        //@ts-ignore
        tls.financeSeason = {}
        //@ts-ignore
        tls.longTermRating = { rating: 1500 }
        //@ts-ignore
        tls.seasonRating = { rating: 1500 }
        //@ts-ignore
        tls.overallRecord = {
            wins: 0,
            losses: 0
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

    async function createTestTeam(name:string, league:League): Promise<Team> {

        let owner:Owner = await ownerService.getOrCreate(`owner-${uuidv4()}`)

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
        player.maxPitchCount = DEFAULT_MAX_PITCH_COUNT
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