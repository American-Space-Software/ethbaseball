import assert from "assert"
import { v4 as uuidv4 } from "uuid"

import { getContainer } from "./inversify.config.js"

import { SchemaService } from "../src/service/data/schema-service.js"
import { LeagueService } from "../src/service/data/league-service.js"
import { TeamRepository } from "../src/repository/team-repository.js"
import { TeamLeagueSeasonRepository } from "../src/repository/team-league-season-repository.js"

import { Team } from "../src/dto/team.js"
import { TeamLeagueSeason } from "../src/dto/team-league-season.js"
import { League } from "../src/dto/league.js"
import { Season } from "../src/dto/season.js"
import { User } from "../src/dto/user.js"

describe("TeamLeagueSeasonRepository", async () => {

    let repository: TeamLeagueSeasonRepository
    let teamRepository: TeamRepository
    let leagueService: LeagueService
    let schemaService: SchemaService
    let sequelize: Function
    let leagueRank = 1000

    before("", async () => {

        let container = getContainer()

        repository = container.get("TeamLeagueSeasonRepository")
        teamRepository = container.get("TeamRepository")
        leagueService = container.get(LeagueService)
        schemaService = container.get(SchemaService)
        sequelize = container.get("sequelize")

        await schemaService.load()

    })

    const createUser = async (): Promise<User> => {

        let user = Object.assign(new User(), {
            _id: uuidv4(),
            address: `0x${uuidv4().replace(/-/g, "").padEnd(40, "0").slice(0, 40)}`,
            dateCreated: new Date(),
            lastUpdated: new Date()
        })

        await user.save()

        return user

    }

    const createSeason = async (startDate: Date): Promise<Season> => {

        let season = Object.assign(new Season(), {
            _id: uuidv4(),
            startDate,
            dateCreated: new Date(),
            lastUpdated: new Date()
        })

        await season.save()

        return season

    }

    const createLeague = async (): Promise<League> => {

        let league = Object.assign(new League(), {
            _id: uuidv4(),
            name: `League ${uuidv4()}`,
            rank: leagueRank++,
            dateCreated: new Date(),
            lastUpdated: new Date()
        })

        await leagueService.put(league)

        return league

    }

    const createTeam = async (league: League, userId: string | null): Promise<Team> => {

        let team = Object.assign(new Team(), {
            _id: uuidv4(),
            name: `Team ${uuidv4()}`,
            userId,
            ownerId: "test-owner",
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
            longTermRating: {
                rating: 1500
            },
            seasonRating: {
                rating: 1500
            },
            tokenId: Math.floor(Math.random() * 100000000),
            developmentStrategy: { budgetPercent: 50 },
            dateCreated: new Date(),
            lastUpdated: new Date()
        })

        await teamRepository.put(team)

        return team

    }

    const createTLS = async (team: Team, league: League, season: Season, rating = 1500, hasValidLineup = true, wins=0): Promise<TeamLeagueSeason> => {

        let tls = Object.assign(new TeamLeagueSeason(), {
            _id: uuidv4(),
            teamId: team._id,
            leagueId: league._id,
            seasonId: season._id,
            hasValidLineup,
            longTermRating: {
                rating
            },
            seasonRating: {
                rating
            },
            overallRecord: {
                wins: wins,
                losses: 0
            },
            financeSeason: {
                diamondBalance: "0",
                revenue: {
                    seasonToDate: { total: "0" },
                    projectedTotal: { total: "0" }
                }
            },
            dateCreated: new Date(),
            lastUpdated: new Date()
        })

        await repository.put(tls)

        return tls

    }

    const createCompletedGameForTeam = async (team: Team, league: League, season: Season) => {

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
                seasonId: season._id,
                leagueId: league._id
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
                teamId: team._id
            }
        })

    }

    const createCompletedGamesForTeam = async (team: Team, league: League, season: Season, count: number) => {

        for (let i = 0; i < count; i++) {
            await createCompletedGameForTeam(team, league, season)
        }

    }

    it("should create and get a team league season by id", async () => {

        let user = await createUser()
        let league = await createLeague()
        let season = await createSeason(new Date("2026-01-01"))
        let team = await createTeam(league, user._id)
        let tls = await createTLS(team, league, season)

        let fetched = await repository.getById(tls._id)

        assert.equal(fetched._id, tls._id)
        assert.equal(fetched.teamId, team._id)
        assert.equal(fetched.leagueId, league._id)
        assert.equal(fetched.seasonId, season._id)

    })

    it("should get by team, league, and season", async () => {

        let user = await createUser()
        let league = await createLeague()
        let season = await createSeason(new Date("2026-01-01"))
        let team = await createTeam(league, user._id)
        let tls = await createTLS(team, league, season)

        let fetched = await repository.get(team, league, season)

        assert.equal(fetched._id, tls._id)

    })

    it("should get by team and season", async () => {

        let user = await createUser()
        let league = await createLeague()
        let season = await createSeason(new Date("2026-01-01"))
        let team = await createTeam(league, user._id)
        let tls = await createTLS(team, league, season)

        let fetched = await repository.getByTeamSeason(team, season)

        assert.equal(fetched._id, tls._id)

    })

    it("should get the most recent team league season for a team", async () => {

        let user = await createUser()
        let league = await createLeague()
        let oldSeason = await createSeason(new Date("2025-01-01"))
        let newSeason = await createSeason(new Date("2026-01-01"))
        let team = await createTeam(league, user._id)

        await createTLS(team, league, oldSeason)
        let newTls = await createTLS(team, league, newSeason)

        let fetched = await repository.getMostRecent(team)

        assert.equal(fetched._id, newTls._id)

    })

    it("should list by user and season", async () => {

        let user = await createUser()
        let otherUser = await createUser()
        let league = await createLeague()
        let season = await createSeason(new Date("2026-01-01"))

        let userTeam = await createTeam(league, user._id)
        let otherTeam = await createTeam(league, otherUser._id)

        let userTls = await createTLS(userTeam, league, season)
        await createTLS(otherTeam, league, season)

        let results = await repository.listByUserAndSeason(user, season)

        assert.equal(results.length, 1)
        assert.equal(results[0]._id, userTls._id)

    })

    it("should list only teams with completed games by league and season", async () => {

        let user = await createUser()
        let league = await createLeague()
        let season = await createSeason(new Date("2026-01-01"))

        let qualifiedTeam = await createTeam(league, user._id)
        let unqualifiedTeam = await createTeam(league, user._id)

        let qualifiedTls = await createTLS(qualifiedTeam, league, season, 1600)
        await createTLS(unqualifiedTeam, league, season, 1700)

        await createCompletedGameForTeam(qualifiedTeam, league, season)

        let results = await repository.listByLeagueAndSeason(league, season)

        assert.equal(results.length, 1)
        assert.equal(results[0]._id, qualifiedTls._id)

    })

    it("should list only user-owned teams with completed games by league and season", async () => {

        let user = await createUser()
        let league = await createLeague()
        let season = await createSeason(new Date("2026-01-01"))

        let userTeam = await createTeam(league, user._id)
        let cpuTeam = await createTeam(league, null)

        let userTls = await createTLS(userTeam, league, season, 1600)
        await createTLS(cpuTeam, league, season, 1700)

        await createCompletedGameForTeam(userTeam, league, season)
        await createCompletedGameForTeam(cpuTeam, league, season)

        let results = await repository.listUserTeamsByLeagueAndSeason(league, season)

        assert.equal(results.length, 1)
        assert.equal(results[0]._id, userTls._id)

    })

    it("should get by multiple team and season ids", async () => {

        let user = await createUser()
        let league = await createLeague()
        let season = await createSeason(new Date("2026-01-01"))

        let team1 = await createTeam(league, user._id)
        let team2 = await createTeam(league, user._id)

        let tls1 = await createTLS(team1, league, season)
        let tls2 = await createTLS(team2, league, season)

        let results = await repository.getByTeamSeasonIds([
            { teamId: team1._id, seasonId: season._id },
            { teamId: team2._id, seasonId: season._id }
        ])

        let ids = results.map(r => r._id)

        assert.equal(results.length, 2)
        assert.ok(ids.includes(tls1._id))
        assert.ok(ids.includes(tls2._id))

    })

    it("should list qualifying teams by league and season", async () => {

        let user = await createUser()
        let otherUser = await createUser()
        let league = await createLeague()
        let otherLeague = await createLeague()
        let season = await createSeason(new Date("2026-01-01"))

        let qualifiedTeam = await createTeam(league, user._id)
        let notEnoughGamesTeam = await createTeam(league, user._id)
        let invalidLineupTeam = await createTeam(league, user._id)
        let cpuTeam = await createTeam(league, null)
        let otherLeagueTeam = await createTeam(otherLeague, otherUser._id)

        let qualifiedTls = await createTLS(qualifiedTeam, league, season, 1800)
        await createTLS(notEnoughGamesTeam, league, season, 1700)
        await createTLS(invalidLineupTeam, league, season, 1600, false)
        await createTLS(cpuTeam, league, season, 1900)
        await createTLS(otherLeagueTeam, otherLeague, season, 2000)

        await createCompletedGamesForTeam(qualifiedTeam, league, season, 3)
        await createCompletedGamesForTeam(notEnoughGamesTeam, league, season, 2)
        await createCompletedGamesForTeam(invalidLineupTeam, league, season, 3)
        await createCompletedGamesForTeam(cpuTeam, league, season, 3)
        await createCompletedGamesForTeam(otherLeagueTeam, otherLeague, season, 3)

        let results = await repository.listQualifyingTeamsByLeagueAndSeason(league, season, 3)

        assert.equal(results.length, 1)
        assert.equal(results[0]._id, qualifiedTls._id)

    })


it("should list non-qualifying teams by league and season ordered by wins", async () => {

    let user = await createUser()
    let league = await createLeague()
    let otherLeague = await createLeague()
    let season = await createSeason(new Date("2026-01-01"))

    let qualifiedTeam = await createTeam(league, user._id)
    let lowWinsTeam = await createTeam(league, user._id)
    let highWinsTeam = await createTeam(league, user._id)
    let invalidLineupTeam = await createTeam(league, user._id)
    let cpuTeam = await createTeam(league, null)
    let otherLeagueTeam = await createTeam(otherLeague, user._id)

    await createTLS(qualifiedTeam, league, season, 1800, true, 20)
    let lowWinsTls = await createTLS(lowWinsTeam, league, season, 1700, true, 5)
    let highWinsTls = await createTLS(highWinsTeam, league, season, 1600, true, 12)
    let invalidLineupTls = await createTLS(invalidLineupTeam, league, season, 1500, false, 30)
    let cpuTls = await createTLS(cpuTeam, league, season, 1400, true, 40)
    await createTLS(otherLeagueTeam, otherLeague, season, 1300, true, 50)

    await createCompletedGamesForTeam(qualifiedTeam, league, season, 3)
    await createCompletedGamesForTeam(lowWinsTeam, league, season, 2)
    await createCompletedGamesForTeam(highWinsTeam, league, season, 2)
    await createCompletedGamesForTeam(invalidLineupTeam, league, season, 3)
    await createCompletedGamesForTeam(cpuTeam, league, season, 3)
    await createCompletedGamesForTeam(otherLeagueTeam, otherLeague, season, 2)

    let results = await repository.listNonQualifyingTeamsByLeagueAndSeason(league, season, 3)

    assert.equal(results.length, 4)

    assert.equal(results[0]._id, cpuTls._id)
    assert.equal(results[1]._id, invalidLineupTls._id)
    assert.equal(results[2]._id, highWinsTls._id)
    assert.equal(results[3]._id, lowWinsTls._id)

})

})