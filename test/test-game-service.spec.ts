import assert, { fail } from "assert"

import fs from 'fs'
import { getContainer } from "./inversify.config.js"


import { RollService } from '../src/service/roll-service.js'
import { GameService, SimGameCommand } from "../src/service/data/game-service.js"
import { Game } from "../src/dto/game.js"
import { PlayerService } from "../src/service/data/player-service.js"
import { StatService } from "../src/service/stat-service.js"

import { UserIOService } from "../src/service/userio-service.js"
import { OwnerService } from "../src/service/data/owner-service.js"
// import { GameQueueService } from "../src/service/game-queue-service.js"
import { SchemaService } from "../src/service/data/schema-service.js"
import { PlayerRepository } from "../src/repository/player-repository.js"
import { IPFSService } from "../src/service/ipfs-service.js"
import { BaseResult, Contact, PlayResult, Position, ShallowDeep, TeamInfo, ThrowResult } from "../src/service/enums.js"
import dayjs from "dayjs"
import { SeasonService } from "../src/service/data/season-service.js"
import { LeagueService } from "../src/service/data/league-service.js"
import { StadiumService } from "../src/service/data/stadium-service.js"
import { Stadium } from "../src/dto/stadium.js"
import { Season } from "../src/dto/season.js"
import { League } from "../src/dto/league.js"

let owner
let redTeam
let blueTeam

let league
let season
let stadium

describe('GameService', async () => {

    let service: GameService
    let rollService:RollService
    let seasonService:SeasonService
    let leagueService:LeagueService
    let stadiumService:StadiumService
    let playerService:PlayerService
    let userIOService:UserIOService
    let ownerService:OwnerService
    // let gameQueueService:GameQueueService
    let schemaService:SchemaService
    let statService:StatService
    let playerRepository:PlayerRepository
    let ipfsService:IPFSService
    let sequelize

    let simDate = new Date(new Date().toUTCString())


    before('Before', async () => {

        let container = getContainer()

        service = container.get(GameService)
        // gameQueueService = container.get(GameQueueService)
        rollService = container.get(RollService)
        playerService = container.get(PlayerService)
        userIOService = container.get(UserIOService)
        ownerService = container.get(OwnerService)
        schemaService = container.get(SchemaService)
        statService = container.get(StatService)
        ipfsService = container.get(IPFSService)
        seasonService = container.get(SeasonService)
        leagueService = container.get(LeagueService)
        stadiumService = container.get(StadiumService)
        playerRepository = container.get("PlayerRepository")
        sequelize = container.get("sequelize")

        await schemaService.load()

        // await ipfsService.init()

        season = new Season()
        season._id = "abc"
        season.startDate = new Date()
        await seasonService.put(season)

        league = new League()
        league._id = "abc"
        await leagueService.put(league)

        stadium = new Stadium()
        stadium._id = "abc"
        stadium.name = "B"
        stadium.capacity = 22000
        await stadiumService.put(stadium)

        owner = await ownerService.getOrCreate("yyyvvvmmmbb")
        redTeam = await playerService.draftTeam(1, "abc", dayjs(simDate).format("YYYY-MM-DD"))

        redTeam = redTeam.slice(0, 9)

        
        for (let player of redTeam) {
            player.ownerId = owner._id
            await playerService.put(player)
        }

        blueTeam = await playerService.draftTeam(14, "abcd", dayjs(simDate).format("YYYY-MM-DD"))

        blueTeam = blueTeam.slice(0, 9)


        for (let player of blueTeam) {
            player.ownerId = owner._id
            await playerService.put(player)
        }


    })

    it("should sim a game", async () => {

        // Arrange
        let laRatings = playerService.buildLeagueAverages( {
            hittingRatings: {
                arm: 15,
                contactProfile: { flyBall: 33, groundball: 33, lineDrive: 34},
                defense: 15,
                speed: 15,
                steals: 15,
                vsL: { contact: 15, gapPower: 15, homerunPower: 15, plateDiscipline: 15},
                vsR: { contact: 15, gapPower: 15, homerunPower: 15, plateDiscipline: 15}
            },
            pitchRatings: {
                contactProfile: { flyBall: 33, groundball: 33, lineDrive: 34},
                pitches: [],
                power: 15,
                vsL: { control: 15, movement: 15 },
                vsR: { control: 15, movement: 15 }
            }
        })

        // Create the away TeamInfo object
        const awayTeam:TeamInfo = service.buildTeamInfoFromPlayers(laRatings, "Away", "", redTeam, "", "", 1)


        // Create the home TeamInfo object
        const homeTeam:TeamInfo = service.buildTeamInfoFromPlayers(laRatings, "Home", "", blueTeam, "", "", 10)


        let game: Game = service.initGame(new Game())

        game.seasonId = season._id
        game.leagueId = league._id
        game.stadiumId = stadium._id

        game.away = awayTeam
        game.home = homeTeam,
        game.leagueAverages = laRatings 

        await service.put(game)

        // Put all of those into the following simGameCommand
        //Act
        let result = await service.simGame(game)

        // let gameViewModel:GameViewModel = service.getGameViewModel(result)
        // userIOService.print(userIOService.getGameOutput(gameViewModel))

        await service.put(result)

        // assert.equal(result.currentInning, 9)
        assert.equal(result.isComplete, true)
        assert.equal(result.score.away, 3)
        assert.equal(result.score.home, 7)

    })

    it("inning can end during runner events; stop further processing but keep events", async () => {
        const laRatings = playerService.buildLeagueAverages({
            hittingRatings: {
                arm: 15,
                contactProfile: { flyBall: 33, groundball: 33, lineDrive: 34 },
                defense: 15,
                speed: 15,
                steals: 15,
                vsL: { contact: 15, gapPower: 15, homerunPower: 15, plateDiscipline: 15 },
                vsR: { contact: 15, gapPower: 15, homerunPower: 15, plateDiscipline: 15 },
            },
            pitchRatings: {
                contactProfile: { flyBall: 33, groundball: 33, lineDrive: 34 },
                pitches: [],
                power: 15,
                vsL: { control: 15, movement: 15 },
                vsR: { control: 15, movement: 15 },
            },
        })

        const awayTeam: TeamInfo = service.buildTeamInfoFromPlayers(laRatings, "Away", "", redTeam, "", "", 1)
        const homeTeam: TeamInfo = service.buildTeamInfoFromPlayers(laRatings, "Home", "", blueTeam, "", "", 10)

        const pitcher = homeTeam.players.find(p => p._id === homeTeam.currentPitcherId)!
        const fielder =
            homeTeam.players.find(p => p.currentPosition === Position.CENTER_FIELD) ??
            homeTeam.players.find(p => p.currentPosition === Position.RIGHT_FIELD) ??
            homeTeam.players.find(p => p.currentPosition === Position.LEFT_FIELD)!

        const hitter = awayTeam.players.find(p => awayTeam.lineupIds.includes(p._id))!
        const runner2B = awayTeam.players.find(p => p._id !== hitter._id)!

        const runnerResult: any = {
            first: undefined,
            second: runner2B._id,
            third: undefined,
            out: [],
            scored: [],
        }

        const halfInningRunnerEvents: any[] = [
            { runner: { _id: "fakeOut1" }, movement: { isOut: true, start: BaseResult.HOME, end: BaseResult.FIRST } },
            { runner: { _id: "fakeOut2" }, movement: { isOut: true, start: BaseResult.HOME, end: BaseResult.FIRST } },
        ]

        const defensiveCredits: any[] = []

        const originalChance = (rollService as any).getChanceRunnerSafe
        const originalThrow = (rollService as any).getThrowResult

            ; (rollService as any).getChanceRunnerSafe = () => 95
            ; (rollService as any).getThrowResult = () => ({ roll: 100, result: ThrowResult.OUT })

        let inPlayRunnerEvents: any[] = []
        try {
            inPlayRunnerEvents = rollService.getRunnerEvents(
                () => 0.5,
                runnerResult,
                halfInningRunnerEvents,
                defensiveCredits,
                laRatings,
                PlayResult.SINGLE,
                Contact.LINE_DRIVE,
                ShallowDeep.NORMAL,
                hitter,
                fielder,
                undefined,
                runner2B,
                undefined,
                awayTeam,
                homeTeam,
                pitcher,
                0
            ) as any[]
        } finally {
            ; (rollService as any).getChanceRunnerSafe = originalChance
                ; (rollService as any).getThrowResult = originalThrow
        }

        const outs =
            halfInningRunnerEvents.filter(e => e?.movement?.isOut).length +
            inPlayRunnerEvents.filter(e => e?.movement?.isOut).length

        assert.equal(outs, 3)
        assert.ok(inPlayRunnerEvents.length > 0)

        const baseIds = [runnerResult.first, runnerResult.second, runnerResult.third].filter(Boolean)
        assert.equal(new Set(baseIds).size, baseIds.length)
    })

    it("Ground ball to infielder with runner on 3B and 2 outs must record the batter out at 1B (throw if needed), no run", async () => {
        const laRatings = playerService.buildLeagueAverages({
            hittingRatings: {
                arm: 15,
                contactProfile: { flyBall: 33, groundball: 33, lineDrive: 34 },
                defense: 15,
                speed: 15,
                steals: 15,
                vsL: { contact: 15, gapPower: 15, homerunPower: 15, plateDiscipline: 15 },
                vsR: { contact: 15, gapPower: 15, homerunPower: 15, plateDiscipline: 15 },
            },
            pitchRatings: {
                contactProfile: { flyBall: 33, groundball: 33, lineDrive: 34 },
                pitches: [],
                power: 15,
                vsL: { control: 15, movement: 15 },
                vsR: { control: 15, movement: 15 },
            },
        })

        const awayTeam: TeamInfo = service.buildTeamInfoFromPlayers(laRatings, "Away", "", redTeam, "", "", 1)
        const homeTeam: TeamInfo = service.buildTeamInfoFromPlayers(laRatings, "Home", "", blueTeam, "", "", 10)

        const pitcher = homeTeam.players.find(p => p._id === homeTeam.currentPitcherId)
        assert.ok(pitcher)

        const infielder =
            homeTeam.players.find(p => p.currentPosition === Position.FIRST_BASE) ??
            homeTeam.players.find(p => p.currentPosition === Position.SECOND_BASE) ??
            homeTeam.players.find(p => p.currentPosition === Position.THIRD_BASE) ??
            homeTeam.players.find(p => p.currentPosition === Position.SHORTSTOP)

        assert.ok(infielder, "Need an infielder on defense")

        const hitter = awayTeam.players.find(p => awayTeam.lineupIds?.includes(p._id)) ?? awayTeam.players[0]
        assert.ok(hitter)

        const runner3B = awayTeam.players.find(p => p._id !== hitter._id)
        assert.ok(runner3B)

        const runnerResult: any = {
            first: undefined,
            second: undefined,
            third: runner3B._id,
            out: [],
            scored: [],
        }

        // already 2 outs
        const halfInningRunnerEvents: any[] = [
            { runner: { _id: "out1" }, movement: { isOut: true, start: BaseResult.HOME, end: BaseResult.FIRST } },
            { runner: { _id: "out2" }, movement: { isOut: true, start: BaseResult.HOME, end: BaseResult.FIRST } },
        ]

        const defensiveCredits: any[] = []

        const originalChance = (rollService as any).getChanceRunnerSafe
        const originalThrow = (rollService as any).getThrowResult

            ; (rollService as any).getChanceRunnerSafe = () => 95
            ; (rollService as any).getThrowResult = () => ({ roll: 100, result: ThrowResult.OUT })

        let inPlayRunnerEvents: any[] = []
        try {
            inPlayRunnerEvents = rollService.getRunnerEvents(
                () => 0.5,
                runnerResult,
                halfInningRunnerEvents,
                defensiveCredits,
                laRatings,
                PlayResult.OUT,
                Contact.GROUNDBALL,
                ShallowDeep.NORMAL,
                hitter,
                infielder,
                undefined,
                undefined,
                runner3B,
                awayTeam,
                homeTeam,
                pitcher,
                2
            ) as any[]
        } finally {
            ; (rollService as any).getChanceRunnerSafe = originalChance
                ; (rollService as any).getThrowResult = originalThrow
        }

        // Find the batter-runner event (HOME -> FIRST) and assert it ended as an out at 1B
        const batterEvent = inPlayRunnerEvents.find(e => e?.runner?._id === hitter._id)
        assert.ok(batterEvent, "Expected a runner event for the hitter")

        assert.equal(batterEvent.movement?.start, BaseResult.HOME)
        assert.equal(batterEvent.movement?.end, BaseResult.FIRST)
        assert.equal(batterEvent.movement?.isOut, true)
        assert.equal(batterEvent.movement?.outBase, BaseResult.FIRST)

        // If the fielder is not 1B, we should see a recorded throw to 1B.
        // If the fielder IS 1B, it is an unassisted putout and your code will not record a throw object.
        if (infielder.currentPosition !== Position.FIRST_BASE) {
            assert.ok(batterEvent.throw, "Expected a throw to be recorded (fielder != 1B)")
            assert.equal(batterEvent.throw.to.position, Position.FIRST_BASE)
            assert.equal(batterEvent.throw.result, ThrowResult.OUT)
        } else {
            assert.equal(batterEvent.throw, undefined, "Unassisted putout at 1B should not record a throw object")
        }

        // Total outs should be 3
        const outs =
            halfInningRunnerEvents.filter(e => e?.movement?.isOut).length +
            inPlayRunnerEvents.filter(e => e?.movement?.isOut).length
        assert.equal(outs, 3)

        // Runner from 3B must NOT score
        const scored = inPlayRunnerEvents.some(e => e?.movement?.end === BaseResult.HOME && e?.movement?.isOut === false)
        assert.equal(scored, false)
    })


})

