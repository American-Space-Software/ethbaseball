// import { getContainer } from "./inversify.config.js"

// import { GameQueueService } from "../src/service/game-queue-service.js"
// import { PlayerService } from "../src/service/player-service.js"
// import { OwnerRepository } from "../src/repository/owner-repository.js"
// import { SchemaService } from "../src/service/schema-service.js"
// import { Owner } from "../src/dto/owner.js"
// import { Player } from "../src/dto/player.js"
// import { IndividualGameQueue } from "../src/dto/individual-game-queue.js"
// import assert from "assert"

// import { LineupService } from "../src/service/lineup-service.js"
// import { Game } from "../src/dto/game.js"
// import { GameLevel, PlayerLevel, HomeAway } from "../src/service/enums.js"

// let drafted
// let drafted2
// let drafted3

// let lineup
// let lineup2
// let lineup3

// let owner1: Owner

// let sequelize

// describe('GameQueueService', async () => {

//     let service: GameQueueService
//     let playerService: PlayerService
//     let lineupService: LineupService
//     let schemaService: SchemaService

//     let ownerRepository: OwnerRepository


//     before('Before', async () => {

//         let container = getContainer()

//         service = container.get(GameQueueService)
//         schemaService = container.get(SchemaService)
//         lineupService = container.get(LineupService)

//         ownerRepository = container.get("OwnerRepository")
//         playerService = container.get(PlayerService)
//         sequelize = container.get("sequelize")

//         await schemaService.load()

//         owner1 = Object.assign(new Owner(), { _id: "xyz6787" })
//         let owner2: Owner = Object.assign(new Owner(), { _id: "abc67873" })

//         //Act
//         await ownerRepository.put(owner1)
//         await ownerRepository.put(owner2)

//         drafted = await playerService.draftTeam(1, "abc")

//         for (let player of drafted) {
//             player.ownerId = owner1._id
//             await playerService.put(player)
//         }

//         drafted2 = await playerService.draftTeam(10, "abcc")
        
//         for (let player of drafted2) {
//             player.ownerId = owner1._id
//             await playerService.put(player)
//         }
        
        
//         drafted3 = await playerService.draftTeam(19, "accd")

//         for (let player of drafted3) {
//             player.ownerId = owner1._id
//             await playerService.put(player)
//         }

//         lineup = await lineupService.createLineup({ owner: owner1 })
//         await lineupService.saveFullLineup(lineup, drafted)

//         lineup2 = await lineupService.createLineup({ owner: owner1 })
//         await lineupService.saveFullLineup(lineup2, drafted2)

//         lineup3 = await lineupService.createLineup({ owner: owner1 })
//         await lineupService.saveFullLineup(lineup3, drafted3)


//     })

//     // it("should queue a player", async () => {

//     //     //Queue them.
//     //     let gameQueue: IndividualGameQueue = await service.queuePlayer(drafted[0], "abc", "abc")

//     //     //Check player's cooldown
//     //     let player: Player = await playerService.get(drafted[0]._id)

//     //     assert.notEqual(gameQueue._id, undefined)
//     //     assert.equal(gameQueue.playerId, drafted[0]._id)
//     //     assert.equal(gameQueue.rating, drafted[0].rating.rating)
//     //     assert.equal(gameQueue.level, drafted[0].gameLevel)
//     //     assert.notEqual(gameQueue.dateCreated, undefined)
//     //     assert.notEqual(player.lastGamePlayed, undefined)

//     //     //Check the queue
//     //     let queued = await service.getQueuedPlayers(drafted[0].primaryPosition, GameLevel.HIGH_SCHOOL)

//     //     //Queue another
//     //     await service.queuePlayer(drafted[1], "abc", "abc")

//     //     let queued2 = await service.getQueuedPlayers(drafted[1].primaryPosition, GameLevel.HIGH_SCHOOL)


//     //     assert.equal(queued.length, 1)
//     //     assert.equal(queued2.length, 1)
//     //     // assert.equal(queued[0]._id, queued2[1]._id)


//     // })

//     // it("should fail to queue a player if already in queue", async () => {

//     //     let message
//     //     try {
//     //         await service.queuePlayer(drafted[0], "abc", "abc")
//     //     } catch (ex) {
//     //         message = ex.message
//     //     }

//     //     assert.equal(message, "Anna Reichert is already queued to play.")


//     // })

//     // it("should dequeue a player", async () => {

//     //     await service.dequeuePlayer(drafted[0])

//     //     let existingIndividualQueue: IndividualGameQueue = await service.getIndividualGameQueueByPlayer(drafted[0])

//     //     assert.equal(existingIndividualQueue, undefined)

//     // })

//     // it("should fail to queue a player if their cooldown is within the last day", async () => {

//     //     let message
//     //     try {
//     //         await service.queuePlayer(drafted[0], "abc", "abc")
//     //     } catch (ex) {
//     //         message = ex.message
//     //     }

//     //     assert.equal(message, "Player's cooldown has not reset.")

//     //     await playerService.clearCooldowns(drafted)


//     // })

//     // it("should fail to queue a lineup if player already in lineup queue", async () => {

//     //     let message
//     //     try {
//     //         await service.queueLineup(lineup, "abc", "abc")
//     //     } catch (ex) {
//     //         message = ex.message
//     //     }

//     //     assert.equal(message, "Duane Weimann is already queued to play.")

//     // })

//     // it("should fail to queue a lineup if any players are the wrong level", async () => {

//     //     //Arrange
//     //     let player: Player = await playerService.getByTokenId(lineup.players[0].tokenId)
//     //     // player.playerLevel = PlayerLevel.JUNIOR_COLLEGE
//     //     // player.gameLevel = GameLevel.JUNIOR_COLLEGE
//     //     await playerService.put(player)


//     //     let message
//     //     try {
//     //         await service.queueLineup(lineup, "abc", "abc")
//     //     } catch (ex) {
//     //         message = ex.message
//     //     }

//     //     assert.equal(message, "Lineup has players from multiple levels and is not elibigle to join the queue.")

//     // })

//     // it("should queue a lineup", async () => {

//     //     //Change this player level back
//     //     let player: Player = await playerService.getByTokenId(lineup.players[0].tokenId)
//     //     // player.playerLevel = PlayerLevel.HIGH_SCHOOL_JUNIOR
//     //     // player.gameLevel = GameLevel.HIGH_SCHOOL
//     //     await playerService.put(player)


//     //     await service.dequeuePlayer(drafted[1])

//     //     let { gameQueue } = await service.queueLineup(lineup, "abc", "abc")

//     //     assert.notEqual(gameQueue._id, undefined)
//     //     assert.equal(gameQueue.lineupId, lineup._id)
//     //     assert.equal(gameQueue.rating, 1500)
//     //     // assert.equal(gameQueue.level, GameLevel.HIGH_SCHOOL)
//     //     assert.notEqual(gameQueue.dateCreated, undefined)


//     //     let queued = await service.getNextLineup(GameLevel.HIGH_SCHOOL, HomeAway.HOME)



//     //     assert.equal(queued?.lineup?._id, lineup._id)

//     //     //Queue another
//     //     await service.queueLineup(lineup2, "abc", "abc")


//     //     let game2:Game = new Game()
//     //     game2._id = "444334"

//     //     //Dequeue the first
//     //     await service.dequeueLineup(lineup, game2)

//     //     let queued2 = await service.getNextLineup(GameLevel.HIGH_SCHOOL, HomeAway.HOME)

//     //     assert.equal(queued2?.lineup?._id, lineup2._id)

//     // })

//     // it("should dequeue a lineup", async () => {

//     //     await service.dequeueLineup(lineup)

//     //     let queued = await service.getNextLineup(GameLevel.HIGH_SCHOOL, HomeAway.HOME)

//     //     assert.equal(queued?.lineup?._id, lineup2._id)


//     //     await service.dequeueLineup(lineup2)

//     //     let queued2 = await service.getNextLineup(GameLevel.HIGH_SCHOOL, HomeAway.HOME)

//     //     assert.equal(queued2?.lineup?._id, undefined)

//     // })

//     // it("should remove player from queue and lineups when transferred", async () => {

//     //     let s = await sequelize()

//     //     let lineup
//     //     let player

//     //     await s.transaction(async (t1) => {

//     //         let options = { transaction: t1 }

//     //         // Create a player and lineup
//     //         let player = drafted[0]

//     //         lineup = await lineupService.createLineup({ owner: owner1 }, options)
//     //         await lineupService.addToLineup(lineup, player, 1, options)


//     //         let lineup2 = await lineupService.createLineup({ owner: owner1 }, options)
//     //         await lineupService.addToLineup(lineup2, player, 1, options)

//     //         await playerService.clearCooldowns([player], options)

//     //         player = await playerService.get(player._id, options)

//     //         try {
//     //          // Queue the player
//     //          await service.queuePlayer(player, "abc", "abc", options)
//     //         } catch(ex) {console.log(ex)}



//     //         //Simulate a transfer
//     //         await service.queuedPlayerTransferred(player, options)

//     //         // Check if the player is removed from the queue
//     //         const queuedPlayer = await service.getIndividualGameQueueByPlayer(player, options)
//     //         assert.strictEqual(queuedPlayer, null)

//     //         // Check if the player is removed from the lineup
//     //         const lineups = await lineupService.getByPlayer(player, options)
//     //         assert.strictEqual(lineups.length, 0)


//     //     })


//     //     await s.transaction(async (t1) => {

//     //         let options = { transaction: t1 }

//     //         //Create full lineup
//     //         let lineup = lineup3

//     //         //Queue lineup
//     //         await service.queueLineup(lineup, "abc", "abc", options)

//     //         //Simulate a transfer
//     //         await service.queuedPlayerTransferred(drafted3[0], options)


//     //         // Check if the player is removed from the queue
//     //         const queuedPlayer2 = await service.getIndividualGameQueueByPlayer(drafted3[0], options)
//     //         assert.strictEqual(queuedPlayer2, null)

//     //         // Check if the player is removed from the lineup
//     //         const lineups2 = await lineupService.getByPlayer(drafted3[0], options)
//     //         assert.strictEqual(lineups2.length, 0)

//     //         // Check if the lineup is removed from the queue
//     //         const queuedLineup = await service.getNextLineup(GameLevel.HIGH_SCHOOL, HomeAway.HOME, options)
//     //         assert.strictEqual(queuedLineup, undefined)

//     //     })




//     // })


//     // it("should start a game", async () => {

//     //    await  playerService.clearCooldowns(drafted)
//     //    await  playerService.clearCooldowns(drafted2)

//     //    await service.queueAllOwnedPlayers(owner1, "abc")

//     // //    await service.startGames()


//     // })


// })
