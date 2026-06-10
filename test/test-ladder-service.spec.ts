import assert from "assert"

import { getContainer } from "./inversify.config.js"
import { SchemaService } from "../src/service/data/schema-service.js"
import { LadderService } from "../src/service/ladder-service.js"
import { UniverseService } from "../src/service/universe-service.js"
import { SeasonService } from "../src/service/data/season-service.js"
import { LeagueService } from "../src/service/data/league-service.js"
import { TeamLeagueSeasonService } from "../src/service/data/team-league-season-service.js"
import { PlayerLeagueSeasonService } from "../src/service/data/player-league-season-service.js"
import { Season } from "../src/dto/season.js"
import { Universe } from "../src/dto/universe.js"
import { League } from "../src/dto/league.js"
import { TeamLeagueSeason } from "../src/dto/team-league-season.js"
import { PlayerLeagueSeason } from "../src/dto/player-league-season.js"
import { v4 as uuidv4 } from "uuid"
import dayjs from "dayjs"
import { ContractType, DEFAULT_MAX_PITCH_COUNT } from "../src/service/enums.js"
import { Player } from "../src/dto/player.js"
import { PitchingRoleType, Position } from "../src/baseball-sim-engine/index.js"
import { TeamService } from "../src/service/data/team-service.js"
import { Team } from "../src/dto/team.js"
import { OffchainEventService } from "../src/service/data/offchain-event-service.js"
import { ethers } from "ethers"

describe("LadderService", async () => {

    let service: LadderService
    let universeService: UniverseService
    let seasonService: SeasonService
    let leagueService: LeagueService
    let teamLeagueSeasonService: TeamLeagueSeasonService
    let playerLeagueSeasonService: PlayerLeagueSeasonService
    let schemaService: SchemaService

    let teamService:TeamService
    let offchainEventService:OffchainEventService
    let sequelize: Function
    let universe: Universe
    let season: Season
    let nextSeason: Season
    let leagues: League[]
    let seasonsBeforeFinish: Season[]

    let originalTls: TeamLeagueSeason[]
    let originalPls: PlayerLeagueSeason[]
    let topTls: TeamLeagueSeason[]
    let middleTls: TeamLeagueSeason[]
    let bottomTls: TeamLeagueSeason[]

    before("Before", async () => {

        let container = getContainer()

        service = container.get(LadderService)
        universeService = container.get(UniverseService)
        seasonService = container.get(SeasonService)
        leagueService = container.get(LeagueService)
        teamLeagueSeasonService = container.get(TeamLeagueSeasonService)
        playerLeagueSeasonService = container.get(PlayerLeagueSeasonService)
        schemaService = container.get(SchemaService)
        teamService = container.get(TeamService)
        sequelize = container.get("sequelize")
        offchainEventService = container.get(OffchainEventService)
        

        await schemaService.load()

        universe = new Universe()
        universe._id = uuidv4()
        universe.name = "Ethereum Baseball League"
        universe.symbol = "EBL"
        universe.diamondAddress = "abc"
        universe.adminAddress = "blah"
        universe.minterAddress = "blah"
        universe.currentDate = dayjs("2021-01-01").toDate()

        await universeService.put(universe)
        await universeService.setupCities()

        season = new Season()
        season._id = uuidv4()
        season.startDate = universe.currentDate
        season.endDate = dayjs(season.startDate).add(161, "day").toDate()
        season.isComplete = false
        season.isInitialized = false

        await seasonService.put(season)

        await universeService.runLeagueGenerator(universe, season, 1, "Apex League", 8)
        await universeService.runLeagueGenerator(universe, season, 2, "The Second League", 8)
        await universeService.runLeagueGenerator(universe, season, 3, "The Third League", 8)

        leagues = [
            await leagueService.getByRank(1),
            await leagueService.getByRank(2),
            await leagueService.getByRank(3)
        ]

        originalTls = await teamLeagueSeasonService.listBySeason(season)

        topTls = await setLeagueTeamRanks(leagues[0], season, originalTls)
        middleTls = await setLeagueTeamRanks(leagues[1], season, originalTls)
        bottomTls = await setLeagueTeamRanks(leagues[2], season, originalTls)

        originalTls = await teamLeagueSeasonService.listBySeason(season)
        originalPls = await playerLeagueSeasonService.getMostRecentBySeason(season)

    })

    // it("should generate a schedule", async () => {

    //     originalPls = await playerLeagueSeasonService.getMostRecentBySeason(season)

    //     let originalPlsIds = await playerLeagueSeasonService.getMostRecentIdsBySeason(season)

    //     assert.equal(leagues.length, 3)
    //     assert.equal(originalTls.length, 24)
    //     assert.equal(topTls.length, 8)
    //     assert.equal(middleTls.length, 8)
    //     assert.equal(bottomTls.length, 8)
    //     assert.equal(originalPls.length, 312)
    //     assert.equal(originalPlsIds.length, originalPls.length)

    // })

    it("should build promotion and relegation structure", async () => {

        let result = await service.buildNextSeasonLeagueStructure(season, leagues, 3)

        let topLeagueInfo = result.structure.find(leagueInfo => leagueInfo.league._id == leagues[0]._id)
        let middleLeagueInfo = result.structure.find(leagueInfo => leagueInfo.league._id == leagues[1]._id)
        let bottomLeagueInfo = result.structure.find(leagueInfo => leagueInfo.league._id == leagues[2]._id)

        assert.ok(topLeagueInfo)
        assert.ok(middleLeagueInfo)
        assert.ok(bottomLeagueInfo)

        assert.equal(topLeagueInfo.teamInfo.length, 8)
        assert.equal(middleLeagueInfo.teamInfo.length, 8)
        assert.equal(bottomLeagueInfo.teamInfo.length, 8)

        let promotedToTop = result.promotionRelegationLog.filter(log => log.rank == leagues[0].rank && log.previousRank == leagues[1].rank)
        let relegatedFromTop = result.promotionRelegationLog.filter(log => log.rank == leagues[1].rank && log.previousRank == leagues[0].rank)
        let promotedToMiddle = result.promotionRelegationLog.filter(log => log.rank == leagues[1].rank && log.previousRank == leagues[2].rank)
        let relegatedFromMiddle = result.promotionRelegationLog.filter(log => log.rank == leagues[2].rank && log.previousRank == leagues[1].rank)

        assert.equal(promotedToTop.length, 3)
        assert.equal(relegatedFromTop.length, 3)
        assert.equal(promotedToMiddle.length, 3)
        assert.equal(relegatedFromMiddle.length, 3)

        for (let log of promotedToTop) {
            assert.ok(topLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == log._id))
        }

        for (let log of relegatedFromTop) {
            assert.ok(middleLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == log._id))
            assert.ok(!topLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == log._id))
        }

        for (let log of promotedToMiddle) {
            assert.ok(middleLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == log._id))
            assert.ok(!bottomLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == log._id))
        }

        for (let log of relegatedFromMiddle) {
            assert.ok(bottomLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == log._id))
            assert.ok(!middleLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == log._id))
        }

    })

    it("should return the same structure for a single league", async () => {

        let result = await service.buildNextSeasonLeagueStructure(season, [leagues[0]], 3)

        assert.equal(result.structure.length, 1)
        assert.equal(result.promotionRelegationLog.length, 0)

        let topLeagueInfo = result.structure[0]

        assert.equal(topLeagueInfo.league._id, leagues[0]._id)
        assert.equal(topLeagueInfo.teamInfo.length, topTls.length)

        for (let tls of topTls) {
            assert.ok(topLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == tls.teamId))
        }

    })

    it("should build promotion and relegation structure for two leagues", async () => {

        let result = await service.buildNextSeasonLeagueStructure(season, [leagues[0], leagues[1]], 3)

        let topLeagueInfo = result.structure.find(leagueInfo => leagueInfo.league._id == leagues[0]._id)
        let middleLeagueInfo = result.structure.find(leagueInfo => leagueInfo.league._id == leagues[1]._id)

        assert.ok(topLeagueInfo)
        assert.ok(middleLeagueInfo)

        assert.equal(topLeagueInfo.teamInfo.length, topTls.length)
        assert.equal(middleLeagueInfo.teamInfo.length, middleTls.length)

        let promotedToTop = result.promotionRelegationLog.filter(log => log.rank == leagues[0].rank && log.previousRank == leagues[1].rank)
        let relegatedFromTop = result.promotionRelegationLog.filter(log => log.rank == leagues[1].rank && log.previousRank == leagues[0].rank)

        assert.equal(promotedToTop.length, 3)
        assert.equal(relegatedFromTop.length, 3)

        for (let log of promotedToTop) {
            assert.ok(topLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == log._id))
            assert.ok(!middleLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == log._id))
        }

        for (let log of relegatedFromTop) {
            assert.ok(middleLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == log._id))
            assert.ok(!topLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == log._id))
        }

    })

    it("should reject non-contiguous league ranks when building promotion and relegation structure", async () => {

        let badLeagues = [
            leagues[0],
            Object.assign(new League(), {
                _id: uuidv4(),
                rank: leagues[0].rank + 2,
                name: "Bad League"
            })
        ]

        await assert.rejects(
            async () => service.buildNextSeasonLeagueStructure(season, badLeagues, 3),
            /League ranks must be contiguous/
        )

    })

    it("should finish a season and only reward qualifying teams", async () => {

        seasonsBeforeFinish = await seasonService.list(1000, 0)

        let qualifyingTls = topTls[0]
        let notEnoughGamesTls = topTls[1]
        let invalidLineupTls = topTls[2]

        let league = leagues.find(l => l._id == qualifyingTls.leagueId)

        qualifyingTls.hasValidLineup = true
        notEnoughGamesTls.hasValidLineup = true
        invalidLineupTls.hasValidLineup = false

        qualifyingTls.overallRecord.wins = 100
        notEnoughGamesTls.overallRecord.wins = 100
        invalidLineupTls.overallRecord.wins = 100

        qualifyingTls.changed("hasValidLineup", true)
        notEnoughGamesTls.changed("hasValidLineup", true)
        invalidLineupTls.changed("hasValidLineup", true)

        qualifyingTls.changed("overallRecord", true)
        notEnoughGamesTls.changed("overallRecord", true)
        invalidLineupTls.changed("overallRecord", true)

        await teamLeagueSeasonService.put(qualifyingTls)
        await teamLeagueSeasonService.put(notEnoughGamesTls)
        await teamLeagueSeasonService.put(invalidLineupTls)

        let qualifyingTeam = await makeTeamUserOwned(qualifyingTls.teamId)
        let notEnoughGamesTeam = await makeTeamUserOwned(notEnoughGamesTls.teamId)
        let invalidLineupTeam = await makeTeamUserOwned(invalidLineupTls.teamId)

        await createCompletedGamesForTeam(qualifyingTls.teamId, league._id, season._id, 130)
        await createCompletedGamesForTeam(notEnoughGamesTls.teamId, league._id, season._id, 129)
        await createCompletedGamesForTeam(invalidLineupTls.teamId, league._id, season._id, 130)

        let qualifyingTeamsBeforeFinish = await teamLeagueSeasonService.listQualifyingTeamsByLeagueAndSeason(
            league,
            season,
            season.endDate
        )

        let qualifyingTeamIdsBeforeFinish = qualifyingTeamsBeforeFinish.map(tls => tls.teamId)

        assert.ok(qualifyingTeamIdsBeforeFinish.includes(qualifyingTls.teamId))
        assert.ok(!qualifyingTeamIdsBeforeFinish.includes(notEnoughGamesTls.teamId))
        assert.ok(!qualifyingTeamIdsBeforeFinish.includes(invalidLineupTls.teamId))

        await service.finishSeason(season, leagues)

        let updatedSeason = await seasonService.get(season._id)

        assert.equal(updatedSeason.isComplete, true)

        let qualifyingEvents = await offchainEventService.getByTeamId(qualifyingTeam._id)
        let notEnoughGamesEvents = await offchainEventService.getByTeamId(notEnoughGamesTeam._id)
        let invalidLineupEvents = await offchainEventService.getByTeamId(invalidLineupTeam._id)

        let qualifyingSeasonRewards = qualifyingEvents.filter(e =>
            e.contractType == ContractType.DIAMONDS &&
            e.toTeamId == qualifyingTeam._id &&
            e.source?.type == "reward" &&
            e.source?.rewardType == "season"
        )

        let notEnoughGamesSeasonRewards = notEnoughGamesEvents.filter(e =>
            e.contractType == ContractType.DIAMONDS &&
            e.toTeamId == notEnoughGamesTeam._id &&
            e.source?.type == "reward" &&
            e.source?.rewardType == "season"
        )

        let invalidLineupSeasonRewards = invalidLineupEvents.filter(e =>
            e.contractType == ContractType.DIAMONDS &&
            e.toTeamId == invalidLineupTeam._id &&
            e.source?.type == "reward" &&
            e.source?.rewardType == "season"
        )

        let expectedReward = (BigInt(league.baseDiamondReward) * BigInt(qualifyingTls.overallRecord.wins)) / 2n

        assert.equal(qualifyingSeasonRewards.length, 1)
        assert.equal(qualifyingSeasonRewards[0].amount, expectedReward.toString())

        assert.equal(notEnoughGamesSeasonRewards.length, 0)
        assert.equal(invalidLineupSeasonRewards.length, 0)

    })

    it("should create the next season when finishing a season", async () => {

        let seasonsAfter = await seasonService.list(1000, 0)
        let newSeasons = seasonsAfter.filter(afterSeason => !seasonsBeforeFinish.some(beforeSeason => beforeSeason._id == afterSeason._id))

        assert.equal(newSeasons.length, 1)

        nextSeason = newSeasons[0]

        assert.ok(nextSeason)
        assert.equal(nextSeason.isComplete, false)
        assert.equal(nextSeason.isInitialized, true)
        assert.equal(dayjs(nextSeason.startDate).format("YYYY-MM-DD"), dayjs(season.endDate).add(1, "day").format("YYYY-MM-DD"))

    })

    it("should create new TLS and PLS records with correct player ages when finishing a season", async () => {

        let nextTls = await teamLeagueSeasonService.listBySeason(nextSeason)
        let nextPls = await playerLeagueSeasonService.getMostRecentBySeason(nextSeason)

        assert.equal(nextTls.length, originalTls.length)
        assert.equal(nextPls.length, originalPls.length)

        let originalTeamIds = originalTls.map(tls => tls.teamId).sort()
        let nextTeamIds = nextTls.map(tls => tls.teamId).sort()

        assert.deepEqual(nextTeamIds, originalTeamIds)

        let originalPlayerIds = originalPls.map(pls => pls.playerId).sort()
        let nextPlayerIds = nextPls.map(pls => pls.playerId).sort()

        assert.deepEqual(nextPlayerIds, originalPlayerIds)

        for (let oldPls of originalPls) {
            let newPls = nextPls.find(pls => pls.playerId == oldPls.playerId)

            assert.ok(newPls)
            assert.equal(newPls.seasonId, nextSeason._id)
            assert.equal(newPls.playerId, oldPls.playerId)
            assert.equal(newPls.teamId, oldPls.teamId)
            assert.equal(newPls.userId, oldPls.userId)
            assert.equal(newPls.primaryPosition, oldPls.primaryPosition)
            assert.equal(newPls.age, oldPls.age + 1)
            assert.equal(newPls.seasonIndex, 1)
        }

    })

    it("should include every team exactly once in the next season structure", async () => {

        let result = await service.buildNextSeasonLeagueStructure(season, leagues, 3)

        let originalTeamIds = originalTls.map(tls => tls.teamId).sort()
        let resultTeamIds = result.structure
            .flatMap(leagueInfo => leagueInfo.teamInfo.map(teamInfo => teamInfo.teamId))
            .sort()

        assert.equal(resultTeamIds.length, originalTeamIds.length)
        assert.deepEqual(resultTeamIds, originalTeamIds)

    })

    it("should not move any team more than one league during promotion and relegation", async () => {

        let result = await service.buildNextSeasonLeagueStructure(season, leagues, 3)

        for (let leagueInfo of result.structure) {
            for (let teamInfo of leagueInfo.teamInfo) {
                assert.ok(Math.abs(leagueInfo.league.rank - teamInfo.previousRank) <= 1)
            }
        }

    })

    it("should relegate bottom teams only one league", async () => {

        let result = await service.buildNextSeasonLeagueStructure(season, leagues, 3)

        let middleLeagueInfo = result.structure.find(leagueInfo => leagueInfo.league._id == leagues[1]._id)
        let bottomLeagueInfo = result.structure.find(leagueInfo => leagueInfo.league._id == leagues[2]._id)

        assert.ok(middleLeagueInfo)
        assert.ok(bottomLeagueInfo)

        let bottomTopLeagueTeams = [...topTls]
            .sort((a, b) => a.overallRecord.rank - b.overallRecord.rank)
            .slice(-3)

        let bottomMiddleLeagueTeams = [...middleTls]
            .sort((a, b) => a.overallRecord.rank - b.overallRecord.rank)
            .slice(-3)

        for (let tls of bottomTopLeagueTeams) {
            assert.ok(middleLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == tls.teamId))
            assert.ok(!bottomLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == tls.teamId))
        }

        for (let tls of bottomMiddleLeagueTeams) {
            assert.ok(bottomLeagueInfo.teamInfo.some(teamInfo => teamInfo.teamId == tls.teamId))
        }

    })



    it("should reduce starter stamina based on pitches thrown", async () => {

        let player:Player = new Player()

        player._id = uuidv4()
        player.primaryPosition = Position.PITCHER
        player.stamina = 1
        player.maxPitchCount = DEFAULT_MAX_PITCH_COUNT

        let game:any = {
            home: {
                _id: "home-team",
                availablePitchers: []
            },
            away: {
                _id: "away-team",
                availablePitchers: []
            }
        }

        let gamePlayer:any = {
            _id: player._id,
            teamId: "home-team",
            pitchResult: {
                pitches: 30
            }
        }

        service.adjustPitcherStamina(game, gamePlayer, player)

        assert.equal(player.stamina, 0.7)
        assert.equal(player.maxPitchCount, DEFAULT_MAX_PITCH_COUNT)

    })
    
    it("should recover starter stamina by twenty percent when they do not pitch", async () => {

        let player:Player = new Player()

        player._id = uuidv4()
        player.primaryPosition = Position.PITCHER
        player.stamina = 0.5
        player.maxPitchCount = DEFAULT_MAX_PITCH_COUNT

        let game:any = {
            home: {
                _id: "home-team",
                availablePitchers: []
            },
            away: {
                _id: "away-team",
                availablePitchers: []
            }
        }

        let gamePlayer:any = {
            _id: player._id,
            teamId: "home-team",
            pitchResult: {
                pitches: 0
            }
        }

        service.adjustPitcherStamina(game, gamePlayer, player)

        assert.equal(player.stamina, 0.7)
        assert.equal(player.maxPitchCount, DEFAULT_MAX_PITCH_COUNT)

    })

    it("should recover reliever stamina by thirty-three percent when they do not pitch", async () => {

        let player:Player = new Player()

        player._id = uuidv4()
        player.primaryPosition = Position.PITCHER
        player.stamina = 0.5
        player.maxPitchCount = 30

        let game:any = {
            home: {
                _id: "home-team",
                availablePitchers: [
                    {
                        playerId: player._id,
                        role: PitchingRoleType.CLOSER,
                        priority: 1
                    }
                ]
            },
            away: {
                _id: "away-team",
                availablePitchers: []
            }
        }

        let gamePlayer:any = {
            _id: player._id,
            teamId: "home-team",
            pitchResult: {
                pitches: 0
            }
        }

        service.adjustPitcherStamina(game, gamePlayer, player)

        assert.equal(player.stamina, 0.83)
        assert.equal(player.maxPitchCount, 30)

    })

    it("should stretch out a starter by ten pitches when they throw their current max", async () => {

        let player:Player = new Player()

        player._id = uuidv4()
        player.primaryPosition = Position.PITCHER
        player.stamina = 1
        player.maxPitchCount = 30

        let game:any = {
            home: {
                _id: "home-team",
                availablePitchers: []
            },
            away: {
                _id: "away-team",
                availablePitchers: []
            }
        }

        let gamePlayer:any = {
            _id: player._id,
            teamId: "home-team",
            pitchResult: {
                pitches: 30
            }
        }

        service.adjustPitcherStamina(game, gamePlayer, player)

        assert.equal(player.stamina, 0)
        assert.equal(player.maxPitchCount, 40)

    })

    it("should stretch out a mop-up reliever by ten pitches when they throw their current max", async () => {

        let player:Player = new Player()

        player._id = uuidv4()
        player.primaryPosition = Position.PITCHER
        player.stamina = 1
        player.maxPitchCount = 30

        let game:any = {
            home: {
                _id: "home-team",
                availablePitchers: [
                    {
                        playerId: player._id,
                        role: PitchingRoleType.MOP_UP,
                        priority: 1
                    }
                ]
            },
            away: {
                _id: "away-team",
                availablePitchers: []
            }
        }

        let gamePlayer:any = {
            _id: player._id,
            teamId: "home-team",
            pitchResult: {
                pitches: 30
            }
        }

        service.adjustPitcherStamina(game, gamePlayer, player)

        assert.equal(player.stamina, 0)
        assert.equal(player.maxPitchCount, 40)

    })

    it("should not stretch a closer beyond their bullpen max pitch count", async () => {

        let player:Player = new Player()

        player._id = uuidv4()
        player.primaryPosition = Position.PITCHER
        player.stamina = 1
        player.maxPitchCount = 30

        let game:any = {
            home: {
                _id: "home-team",
                availablePitchers: [
                    {
                        playerId: player._id,
                        role: PitchingRoleType.CLOSER,
                        priority: 1
                    }
                ]
            },
            away: {
                _id: "away-team",
                availablePitchers: []
            }
        }

        let gamePlayer:any = {
            _id: player._id,
            teamId: "home-team",
            pitchResult: {
                pitches: 30
            }
        }

        service.adjustPitcherStamina(game, gamePlayer, player)

        assert.equal(player.stamina, 0)
        assert.equal(player.maxPitchCount, 30)

    })

    it("should give full hitter XP percent when hitter appears", async () => {

        let player = Object.assign(new Player(), {
            _id: uuidv4(),
            primaryPosition: Position.CATCHER,
            maxPitchCount: DEFAULT_MAX_PITCH_COUNT
        })

        let gamePlayer = {
            hitResult: { pa: 4 },
            pitchResult: { pitches: 0 }
        } as any

        let result = service.getGameExperiencePercent(player, gamePlayer)

        assert.equal(result, 100n)

    })

    it("should give half hitter XP percent when hitter does not appear", async () => {

        let player = Object.assign(new Player(), {
            _id: uuidv4(),
            primaryPosition: Position.CATCHER,
            maxPitchCount: DEFAULT_MAX_PITCH_COUNT
        })

        let gamePlayer = {
            hitResult: { pa: 0 },
            pitchResult: { pitches: 0 }
        } as any

        let result = service.getGameExperiencePercent(player, gamePlayer)

        assert.equal(result, 50n)

    })

    it("should give starter XP percent based on pitch usage", async () => {

        let player = Object.assign(new Player(), {
            _id: uuidv4(),
            primaryPosition: Position.PITCHER,
            maxPitchCount: 100
        })

        let gamePlayer = {
            hitResult: { pa: 0 },
            pitchResult: { pitches: 60 }
        } as any

        let result = service.getGameExperiencePercent(player, gamePlayer, PitchingRoleType.STARTER)

        assert.equal(result, 60n)

    })

    it("should cap starter XP percent at one hundred", async () => {

        let player = Object.assign(new Player(), {
            _id: uuidv4(),
            primaryPosition: Position.PITCHER,
            maxPitchCount: 100
        })

        let gamePlayer = {
            hitResult: { pa: 0 },
            pitchResult: { pitches: 115 }
        } as any

        let result = service.getGameExperiencePercent(player, gamePlayer, PitchingRoleType.STARTER)

        assert.equal(result, 100n)

    })

    it("should give no XP percent to idle starters", async () => {

        let player = Object.assign(new Player(), {
            _id: uuidv4(),
            primaryPosition: Position.PITCHER,
            maxPitchCount: 100
        })

        let gamePlayer = {
            hitResult: { pa: 0 },
            pitchResult: { pitches: 0 }
        } as any

        let result = service.getGameExperiencePercent(player, gamePlayer, PitchingRoleType.STARTER)

        assert.equal(result, 0n)

    })

    it("should give full reliever XP percent as twenty percent of starter XP", async () => {

        let player = Object.assign(new Player(), {
            _id: uuidv4(),
            primaryPosition: Position.PITCHER,
            maxPitchCount: 30
        })

        let gamePlayer = {
            hitResult: { pa: 0 },
            pitchResult: { pitches: 30 }
        } as any

        let result = service.getGameExperiencePercent(player, gamePlayer, PitchingRoleType.CLOSER)

        assert.equal(result, 20n)

    })

    it("should give partial reliever XP percent based on pitch usage", async () => {

        let player = Object.assign(new Player(), {
            _id: uuidv4(),
            primaryPosition: Position.PITCHER,
            maxPitchCount: 30
        })

        let gamePlayer = {
            hitResult: { pa: 0 },
            pitchResult: { pitches: 15 }
        } as any

        let result = service.getGameExperiencePercent(player, gamePlayer, PitchingRoleType.SETUP)

        assert.equal(result, 10n)

    })

    it("should give unused bullpen pitchers five percent XP", async () => {

        let player = Object.assign(new Player(), {
            _id: uuidv4(),
            primaryPosition: Position.PITCHER,
            maxPitchCount: 30
        })

        let gamePlayer = {
            hitResult: { pa: 0 },
            pitchResult: { pitches: 0 }
        } as any

        let result = service.getGameExperiencePercent(player, gamePlayer, PitchingRoleType.MIDDLE)

        assert.equal(result, 5n)

    })


    
    async function setLeagueTeamRanks(league: League, season: Season, tlssForSeason: TeamLeagueSeason[]): Promise<TeamLeagueSeason[]> {

        let tlss = tlssForSeason.filter(tls => tls.leagueId == league._id)

        tlss = tlss.sort((a, b) => a.teamId.localeCompare(b.teamId))

        for (let i = 0; i < tlss.length; i++) {
            tlss[i].overallRecord.rank = i + 1
            tlss[i].changed("overallRecord", true)

            await teamLeagueSeasonService.put(tlss[i])
        }

        let refreshedTlss = await teamLeagueSeasonService.listBySeason(season)

        return refreshedTlss
            .filter(tls => tls.leagueId == league._id)
            .sort((a, b) => a.overallRecord.rank - b.overallRecord.rank)

    }

    async function makeTeamUserOwned(teamId: string): Promise<Team> {

        let team = await teamService.get(teamId)

        team.userId = uuidv4()

        await teamService.put(team)

        return await teamService.get(teamId)

    }

    async function createCompletedGamesForTeam(teamId: string, leagueId: string, seasonId: string, count: number) {

        for (let i = 0; i < count; i++) {
            await createCompletedGameForTeam(teamId, leagueId, seasonId)
        }

    }

    async function createCompletedGameForTeam(teamId: string, leagueId: string, seasonId: string) {

        let s = await sequelize()
        let gameId = uuidv4()

        await s.query(`
            INSERT INTO game (
                _id,
                seasonId,
                leagueId,
                playIndex,
                isComplete,
                isFinished,
                startDate,
                dateCreated,
                lastUpdated
            )
            VALUES (
                :gameId,
                :seasonId,
                :leagueId,
                0,
                1,
                1,
                NOW(),
                NOW(),
                NOW()
            )
        `, {
            replacements: {
                gameId,
                seasonId,
                leagueId
            }
        })

        await s.query(`
            INSERT INTO game_team (
                gameId,
                teamId,
                createdAt,
                updatedAt
            )
            VALUES (
                :gameId,
                :teamId,
                NOW(),
                NOW()
            )
        `, {
            replacements: {
                gameId,
                teamId
            }
        })

    }    

})