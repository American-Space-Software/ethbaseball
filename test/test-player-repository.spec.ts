import assert from "assert"

import { getContainer } from "./inversify.config.js"


import {  Player } from "../src/dto/player.js"
import { PlayerRepository } from "../src/repository/player-repository.js"
import { SchemaService } from "../src/service/data/schema-service.js"

import { PlayerService } from "../src/service/data/player-service.js"
import { Owner } from "../src/dto/owner.js"
import { OwnerService } from "../src/service/data/owner-service.js"
import { GameRepository } from "../src/repository/game-repository.js"
import dayjs from "dayjs"
import { Handedness, PersonalityType, PitchType, Position } from "../src/service/enums.js"


let id1

describe('PlayerRepository', async () => {

    let repository:PlayerRepository
    let gameRepository:GameRepository
    let ownerService:OwnerService

    let schemaService:SchemaService
    let playerService:PlayerService
    

    before("", async () => {

        let container = getContainer()
        
        repository = container.get("PlayerRepository")
        gameRepository = container.get("GameRepository")

        ownerService = container.get(OwnerService)

        schemaService = container.get(SchemaService)
        playerService = container.get(PlayerService)

        await schemaService.load()

    })


    it("should create & get a player", async () => {

        //Arrange
        let player:Player = new Player()

        player._id = "1"
        player.displayRating = 40
        player.firstName = "Bob"
        player.lastName = "Smith"
        player.zodiacSign = "ZOD"
        player.age = 18

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


        player.hittingRatings = playerService.calculateHittingRatings(player)
        player.pitchRatings = playerService.calculatePitchRatings(player)

        //Act
        await repository.put(player)

        id1 = player._id

        //Read via permalinkKey
        let fetched = await repository.get(id1)

        assert.equal(fetched.fullName, "Bob Smith")
        assert.equal(fetched._id, id1)

    })


    it("should update a player", async () => {

        //Arrange
        let player:Player = await repository.get(id1)
        player.firstName = "Updated name"
        player.lastName = "blah"

        //Act
        await repository.put(player)

        //Assert
        let fetched = await repository.get(id1)

        assert.equal(fetched.firstName, "Updated name")
        assert.equal(fetched._id, id1)

    })


    it("should get players by owner", async () => {

        //Arrange
        let owner:Owner = await ownerService.getOrCreate("xyz")


        //Update player with owner info
        let player:Player = await repository.get(id1)
        player.ownerId = owner._id

        await repository.put(player)

        //Act
        let players:Player[] = await repository.getByOwner(owner)

        assert.equal(players.length, 1)

    })

    // it("should get players by rating desc", async () => {

    //     //Arrange
    //     let owner:Owner = await ownerService.getOrCreate("xyz")


    //     //Update player with owner info
    //     let player:Player = await repository.get(id1)
    //     player.ownerId = owner._id

    //     await repository.put(player)

    //     //Act
    //     let players:Player[] = await repository.getByRatingDescending()

    //     assert.equal(players.length, 1)

    // })


    // it("should trigger player cooldowns", async () => {

    //     //Arrange
    //     let player:Player = await repository.get(id1)

    //     //Act
    //     await repository.triggerCooldowns([player])

    //     //Assert
    //     let fetched = await repository.get(id1)

    //     assert.equal(dayjs(fetched.lastGamePlayed).isValid(), true)
    //     assert.equal(fetched._id, id1)

    // })


    after("After", async () => {
    })


})



// it("should fail to create invalid author", async () => {
        
//     try {
//         await service.put(new Author())
//         assert.fail("Did not throw exception")
//     } catch(ex) {
//         assert.strictEqual(ex.errors.length, 1)
//     }

// })

// it("should fail to create valid object if it's not the right class", async () => {
    
//     try {
//         await service.put({
//             walletAddress: user0,
//             name: "Bob",
//             description: "Really is bob",
//             url: "https://bobshouse.com",
//             coverPhotoId: "6"
//         })
//         assert.fail("Did not throw exception")
//     } catch(ex) {
//         assert.strictEqual(ex.errors.length, 1)
//     }

// })

