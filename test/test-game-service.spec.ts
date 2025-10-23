import assert, { fail } from "assert"

import fs from 'fs'
import { getContainer } from "./inversify.config.js"


import { RollService } from '../src/service/roll-service.js'
import { GameService, SimGameCommand } from "../src/service/game-service.js"
import { Game } from "../src/dto/game.js"
import { PlayerService } from "../src/service/player-service.js"
import { StatService } from "../src/service/stat-service.js"

import { UserIOService } from "../src/service/userio-service.js"
import { OwnerService } from "../src/service/owner-service.js"
// import { GameQueueService } from "../src/service/game-queue-service.js"
import { SchemaService } from "../src/service/schema-service.js"
import { PlayerRepository } from "../src/repository/player-repository.js"
import { IPFSService } from "../src/service/ipfs-service.js"
import { GameLevel, TeamInfo } from "../src/service/enums.js"
import dayjs from "dayjs"
import { SeasonService } from "../src/service/season-service.js"
import { LeagueService } from "../src/service/league-service.js"
import { StadiumService } from "../src/service/stadium-service.js"
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
            league: league,
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
        const awayTeam:TeamInfo = service.buildTeamInfoFromPlayers(laRatings, "Away", "", redTeam.map( p => { return { player: p } }), "", "", 1)


        // Create the home TeamInfo object
        const homeTeam:TeamInfo = service.buildTeamInfoFromPlayers(laRatings, "Home", "", blueTeam.map( p => { return { player: p } }), "", "", 10)


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
        assert.equal(result.score.home, 6)

    })


})