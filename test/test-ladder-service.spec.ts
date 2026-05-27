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

describe("LadderService", async () => {

    let service: LadderService
    let universeService: UniverseService
    let seasonService: SeasonService
    let leagueService: LeagueService
    let teamLeagueSeasonService: TeamLeagueSeasonService
    let playerLeagueSeasonService: PlayerLeagueSeasonService
    let schemaService: SchemaService

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

    })

    it("should generate a schedule", async () => {

        originalPls = await playerLeagueSeasonService.getMostRecentBySeason(season)

        let originalPlsIds = await playerLeagueSeasonService.getMostRecentIdsBySeason(season)

        assert.equal(leagues.length, 3)
        assert.equal(originalTls.length, 24)
        assert.equal(topTls.length, 8)
        assert.equal(middleTls.length, 8)
        assert.equal(bottomTls.length, 8)
        assert.equal(originalPls.length, 312)
        assert.equal(originalPlsIds.length, originalPls.length)

    })

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

    it("should finish a season", async () => {

        seasonsBeforeFinish = await seasonService.list(1000, 0)

        await service.finishSeason(season, leagues)

        let updatedSeason = await seasonService.get(season._id)

        assert.equal(updatedSeason.isComplete, true)

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

        let completedSeason = await seasonService.get(season._id)
        let nextLeagueRankByTeamId = new Map<string, number>()

        for (let log of completedSeason.promotionRelegationLog) {
            nextLeagueRankByTeamId.set(log._id, log.rank)
        }

        for (let oldTls of originalTls) {
            let newTls = nextTls.find(tls => tls.teamId == oldTls.teamId)

            assert.ok(newTls)
            assert.equal(newTls.seasonId, nextSeason._id)
            assert.equal(newTls.teamId, oldTls.teamId)
            assert.equal(newTls.logoId, oldTls.logoId)
            assert.equal(newTls.seasonRating.rating, 1500)

            let movedRank = nextLeagueRankByTeamId.get(oldTls.teamId)

            if (movedRank != undefined) {
                let expectedLeague = leagues.find(league => league.rank == movedRank)

                assert.ok(expectedLeague)
                assert.equal(newTls.leagueId, expectedLeague._id)
            } else {
                assert.equal(newTls.leagueId, oldTls.leagueId)
            }
        }

        for (let oldPls of originalPls) {
            let newPls = nextPls.find(pls => pls.playerId == oldPls.playerId)

            assert.ok(newPls)
            assert.equal(newPls.seasonId, nextSeason._id)
            assert.equal(newPls.playerId, oldPls.playerId)
            assert.equal(newPls.teamId, oldPls.teamId)
            assert.equal(newPls.primaryPosition, oldPls.primaryPosition)
            assert.equal(newPls.age, oldPls.age + 1)

            let movedRank = nextLeagueRankByTeamId.get(oldPls.teamId)

            if (movedRank != undefined) {
                let expectedLeague = leagues.find(league => league.rank == movedRank)

                assert.ok(expectedLeague)
                assert.equal(newPls.leagueId, expectedLeague._id)
            } else {
                assert.equal(newPls.leagueId, oldPls.leagueId)
            }
        }

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

})