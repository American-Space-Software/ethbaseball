import assert from "assert"
import { v4 as uuidv4 } from "uuid"

import { getContainer } from "./inversify.config.js"

import { GameNotificationsRepository } from "../src/repository/game-notifications-repository.js"
import { GameRepository } from "../src/repository/game-repository.js"

import { SchemaService } from "../src/service/data/schema-service.js"
import { SeasonService } from "../src/service/data/season-service.js"
import { LeagueService } from "../src/service/data/league-service.js"
import { StadiumService } from "../src/service/data/stadium-service.js"

import { GameNotifications } from "../src/dto/game-notifications.js"
import { Game } from "../src/dto/game.js"
import { Season } from "../src/dto/season.js"
import { League } from "../src/dto/league.js"
import { Stadium } from "../src/dto/stadium.js"

let id1: string

let game: Game
let league: League
let season: Season
let stadium: Stadium

describe("GameNotificationsRepository", async () => {

    let repository: GameNotificationsRepository
    let gameRepository: GameRepository
    let schemaService: SchemaService
    let seasonService: SeasonService
    let leagueService: LeagueService
    let stadiumService: StadiumService

    before("", async () => {

        let container = getContainer()

        repository = container.get("GameNotificationsRepository")
        gameRepository = container.get("GameRepository")
        schemaService = container.get(SchemaService)
        seasonService = container.get(SeasonService)
        leagueService = container.get(LeagueService)
        stadiumService = container.get(StadiumService)

        await schemaService.load()

        season = new Season()
        season._id = "game-notifications-season"
        season.startDate = new Date()
        await seasonService.put(season)

        league = new League()
        league._id = "game-notifications-league"
        await leagueService.put(league)

        stadium = new Stadium()
        stadium._id = "game-notifications-stadium"
        stadium.name = "Test Stadium"
        stadium.capacity = 22000
        await stadiumService.put(stadium)

        game = Object.assign(new Game(), {
            _id: uuidv4(),
            currentInning: 1,
            isTopInning: true,
            isComplete: false,
            isFinished: false,
            isStarted: false,
            count: {
                balls: 0,
                strikes: 0,
                outs: 0
            },
            score: {
                away: 0,
                home: 0
            },
            away: {
                _id: "away-team-id",
                name: "Away Team"
            },
            home: {
                _id: "home-team-id",
                name: "Home Team"
            },
            halfInnings: [],
            playIndex: 0,
            leagueAverages: {}
        })

        game.seasonId = season._id
        game.leagueId = league._id
        game.stadiumId = stadium._id

        await gameRepository.put(game)

    })

    it("should create & get game notifications", async () => {

        let gn: GameNotifications = Object.assign(new GameNotifications(), {
            _id: uuidv4(),
            gameId: game._id,
            updatesSent: {
                discordStarted: false,
                discordEnded: false
            },
            isComplete: false
        })

        await repository.put(gn)

        id1 = gn._id

        let fetched = await repository.get(id1)

        assert.equal(fetched._id, id1)
        assert.equal(fetched.gameId, game._id)
        assert.equal(fetched.updatesSent?.discordStarted, false)
        assert.equal(fetched.updatesSent?.discordEnded, false)

    })

    it("should get game notifications that are not complete", async () => {

        let fetched = await repository.getNotComplete()

        assert.equal(fetched?.length, 1)

        

    })




    it("should update game notifications", async () => {

        let gn: GameNotifications = await repository.get(id1)

        gn.updatesSent = {
            discordStarted: true,
            discordEnded: false
        }

        gn.isComplete = true

        await repository.put(gn)

        let fetched = await repository.get(id1)

        assert.equal(fetched._id, id1)
        assert.equal(fetched.updatesSent?.discordStarted, true)
        assert.equal(fetched.updatesSent?.discordEnded, false)
        assert.equal(fetched.isComplete, true)

    })

    it("should get game notifications by game", async () => {

        let fetched = await repository.getByGame(game)

        assert.equal(fetched._id, id1)
        assert.equal(fetched.gameId, game._id)

    })

    after("After", async () => {
    })

})