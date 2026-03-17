
import { getContainer } from "./inversify.config.js"

import {  PlayerService } from "../src/service/data/player-service.js"
import { SchemaService } from "../src/service/data/schema-service.js"
import {  Player} from "../src/dto/player.js"
import assert from "assert"
import { GameService } from "../src/service/data/game-service.js"
import { Position } from "../src/service/enums.js"
import dayjs from "dayjs"

let container = getContainer()
let simDate = new Date(new Date().toUTCString())

describe('PlayerService', async () => {

    let service:PlayerService
    let gameService:GameService
    let schemaService:SchemaService


    before("", async () => {
       
        service = container.get(PlayerService)
        gameService = container.get(GameService)
        schemaService = container.get(SchemaService)

        await schemaService.load()
       
    })

    it("should calculate ratings 80 overall player", async () => {

      let player:Player = new Player()
      player.primaryPosition = Position.CATCHER
      player.age = 27
      // player.dateOfBirth = dayjs().subtract(27, 'years').toDate()
      // player.rating = {
      //   rating: 3000,
      //   volatility: 0,
      //   ratingDeviation: 0
      // }
      player.hittingProfile = {
        plateDisciplineDelta: 0.0,
        contactDelta: 0.0,
        gapPowerDelta: 0.0,
        homerunPowerDelta: 0,
        speedDelta: 0,
        stealsDelta: 0,
        defenseDelta: 0,
        armDelta: 0,
        vsSameHandDelta: 0,
        contactProfile: {
            groundball: 20,
            flyBall: 60,
            lineDrive: 20
        }
      }

      player.overallRating = 80

      let ratings = service.calculateHittingRatings(player, player.overallRating)

      assert.deepStrictEqual(ratings, {
        speed: 80,
        steals: 80,
        defense: 80,
        arm: 80,
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        vsL: {
          contact: 80,
          gapPower: 80,
          homerunPower: 80,
          plateDiscipline: 80
        },
        vsR: {
          contact: 80,
          gapPower: 80,
          homerunPower: 80,
          plateDiscipline: 80
        }
      })




    })

    it("should calculate ratings for players at each level", async () => {

      let player:Player = new Player()
      player.overallRating = 60
      player.primaryPosition = Position.CATCHER
      // player.dateOfBirth = dayjs().subtract(27, 'years').toDate()
      player.age = 27

      // player.rating = {
      //   rating: 1400,
      //   volatility: 0,
      //   ratingDeviation: 0
      // }
      player.hittingProfile = {
        plateDisciplineDelta: 0.5399999999999997,
        contactDelta: 0.31999999999999973,
        gapPowerDelta: 0.5399999999999997,
        homerunPowerDelta: -0.34000000000000014,
        speedDelta: -0.45000000000000007,
        stealsDelta: -0.67,
        defenseDelta: 0.21,
        armDelta: -0.23000000000000015,
        vsSameHandDelta: 0.21,
        contactProfile: {
            groundball: 20,
            flyBall: 60,
            lineDrive: 20
        }
      }


      let ratings = service.calculateHittingRatings(player, player.overallRating)




      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 15,
        steals: -7,
        defense: 81,
        arm: 37,
        vsL: { contact: 73, gapPower: 90, homerunPower: 21, plateDiscipline: 90 },
        vsR: {
          contact: 92,
          gapPower: 114,
          homerunPower: 26,
          plateDiscipline: 114
        }
      })




      player.overallRating = 65
      // player.dateOfBirth = dayjs().subtract(18, 'years').toDate()
      player.age = 18


      ratings = service.calculateHittingRatings(player, player.overallRating)

      
      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 5,
        steals: -17,
        defense: 71,
        arm: 27,
        vsL: { contact: 65, gapPower: 82, homerunPower: 13, plateDiscipline: 82 },
        vsR: {
          contact: 82,
          gapPower: 104,
          homerunPower: 16,
          plateDiscipline: 104
        }
      })




      player.overallRating = 70
      // player.dateOfBirth = dayjs().subtract(19, 'years').toDate()
      player.age = 19

      ratings = service.calculateHittingRatings(player, player.overallRating)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 10,
        steals: -12,
        defense: 76,
        arm: 32,
        vsL: { contact: 69, gapPower: 86, homerunPower: 17, plateDiscipline: 86 },
        vsR: {
          contact: 87,
          gapPower: 109,
          homerunPower: 21,
          plateDiscipline: 109
        }
      })

      // player.rating = {
      //   rating: 1700,
      //   volatility: 0,
      //   ratingDeviation: 0
      // }
      



      // player.dateOfBirth = dayjs().subtract(20, 'years').toDate()
      player.age = 20


      player.overallRating = 75

      ratings = service.calculateHittingRatings(player, player.overallRating)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 19,
        steals: -3,
        defense: 85,
        arm: 41,
        vsL: { contact: 76, gapPower: 93, homerunPower: 24, plateDiscipline: 93 },
        vsR: {
          contact: 96,
          gapPower: 118,
          homerunPower: 30,
          plateDiscipline: 118
        }
      })



      // player.rating = {
      //   rating: 1800,
      //   volatility: 0,
      //   ratingDeviation: 0
      // }
      
      // player.dateOfBirth = dayjs().subtract(21, 'years').toDate()
      player.age = 21


      player.overallRating = 78

      ratings = service.calculateHittingRatings(player, player.overallRating)



      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 23,
        steals: 1,
        defense: 89,
        arm: 45,
        vsL: { contact: 79, gapPower: 96, homerunPower: 27, plateDiscipline: 96 },
        vsR: {
          contact: 100,
          gapPower: 122,
          homerunPower: 34,
          plateDiscipline: 122
        }
      })

      // player.rating = {
      //   rating: 1900,
      //   volatility: 0,
      //   ratingDeviation: 0
      // }
      
      // player.dateOfBirth = dayjs().subtract(22, 'years').toDate()
      player.age = 22


      
      player.overallRating = 83


      ratings = service.calculateHittingRatings(player, player.overallRating)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 29,
        steals: 7,
        defense: 95,
        arm: 51,
        vsL: {
          contact: 84,
          gapPower: 101,
          homerunPower: 31,
          plateDiscipline: 101
        },
        vsR: {
          contact: 106,
          gapPower: 128,
          homerunPower: 40,
          plateDiscipline: 128
        }
      })

      // player.rating = {
      //   rating: 2000,
      //   volatility: 0,
      //   ratingDeviation: 0
      // }
      
      // player.dateOfBirth = dayjs().subtract(24, 'years').toDate()
      player.age = 24


      player.overallRating = 86

      ratings = service.calculateHittingRatings(player, player.overallRating)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 34,
        steals: 12,
        defense: 100,
        arm: 56,
        vsL: {
          contact: 88,
          gapPower: 105,
          homerunPower: 36,
          plateDiscipline: 105
        },
        vsR: {
          contact: 111,
          gapPower: 133,
          homerunPower: 45,
          plateDiscipline: 133
        }
      })

      // player.dateOfBirth = dayjs().subtract(27, 'years').toDate()
      player.age = 27

      player.overallRating = 89

      ratings = service.calculateHittingRatings(player, player.overallRating)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 44,
        steals: 22,
        defense: 110,
        arm: 66,
        vsL: {
          contact: 96,
          gapPower: 113,
          homerunPower: 43,
          plateDiscipline: 113
        },
        vsR: {
          contact: 121,
          gapPower: 143,
          homerunPower: 55,
          plateDiscipline: 143
        }
      })


    })

    it("should scout a hitter", async () => {

        let player:Player = await service.scoutPlayer({ type: Position.SECOND_BASE, onDate: dayjs(simDate).format("YYYY-MM-DD") })


        assert.equal(player.primaryPosition, Position.SECOND_BASE)
        assert.equal(player.fullName, "Anna Von")
        assert.equal(player.throws, "R")
        assert.equal(player.hits, "R")




        assert.deepStrictEqual(player.hittingRatings, {
          contactProfile: { groundball: 365, flyBall: 364, lineDrive: 271 },
          speed: 25,
          steals: 61,
          defense: 7,
          arm: 79,
          vsR: { contact: 69, gapPower: 7, homerunPower: 51, plateDiscipline: 51 },
          vsL: { contact: 70, gapPower: 7, homerunPower: 52, plateDiscipline: 52 }
        })

        assert.deepStrictEqual(player.pitchRatings, {
          pitches: [ 'FF' ],
          contactProfile: { groundball: 272, flyBall: 454, lineDrive: 274 },
          power: 51,
          vsR: { control: -36, movement: 22 },
          vsL: { control: -37, movement: 23 }
        })




    })

    it("should scout a pitcher", async () => {

        let player:Player = await service.scoutPlayer({ type: Position.PITCHER, onDate: dayjs(simDate).format("YYYY-MM-DD") })
        
        assert.equal(player.primaryPosition, Position.PITCHER)
        assert.equal(player.fullName, "Barry Mayert")
        assert.equal(player.throws, "R")
        assert.equal(player.hits, "R")


        assert.deepStrictEqual(player.hittingRatings, {
          contactProfile: { groundball: 516, flyBall: 219, lineDrive: 265 },
          speed: -35,
          steals: 28,
          defense: 82,
          arm: -44,
          vsR: {
            contact: 25,
            gapPower: 82,
            homerunPower: -23,
            plateDiscipline: -23
          },
          vsL: {
            contact: 28,
            gapPower: 91,
            homerunPower: -26,
            plateDiscipline: -26
          }
        })


        assert.deepStrictEqual(player.pitchRatings, {
          pitches: [ 'FF', 'SV', 'CU', 'SL' ],
          contactProfile: { groundball: 426, flyBall: 264, lineDrive: 310 },
          power: 24,
          vsR: { control: 77, movement: 29 },
          vsL: { control: 84, movement: 32 }
        })

    })

    // it("should update player ratings", async () => {
      
    //   let winners:Player[] = []
    //   for (let i=0; i < 9; i++) {
        
    //     let winner = new Player()
    //     winner.firstName = "B"
    //     // winner.rating = { rating: GLICKO_SETTINGS.rating, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }
    //     winners.push(winner)
    //   }

    //   let losers:Player[] = []
    //   for (let i=0; i < 9; i++) {
        
    //     let loser = new Player()
    //     loser.firstName = "B"
    //     // loser.rating = { rating: GLICKO_SETTINGS.rating, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }
    //     losers.push(loser)
    //   }

    //   // let winningGamePlayers = await gameService.initGamePlayers(winners, "", "")
    //   // let losingGamePlayers = await gameService.initGamePlayers(losers, "", "")


    //   let updatedRatings:RatingPlayer[] = await service.updateRatings(
    //       winningGamePlayers.map( gp => { return { _id: gp._id, rating: gp.ratingBefore }}), 
    //       losingGamePlayers.map( gp => { return { _id: gp._id, rating: gp.ratingBefore }})
    //   )

    //   for (let player of updatedRatings) {

    //     if (winningGamePlayers.find(p => p._id == player._id)) {

    //       assert.deepEqual(player.rating, {
    //         rating: 1502.0923342081746,
    //         ratingDeviation: 27.004369480191432,
    //         volatility: 0.05999997998631668
    //       })
          
    //     } else {

    //       assert.deepEqual(player.rating, {
    //         rating: 1497.9076657918254,
    //         ratingDeviation: 27.004369480191432,
    //         volatility: 0.05999997998631668
    //       })

    //     }

    //   }



    // })

    // it('should update player attributes when gameCount is 25', async () => {
    //   // let player = await service.scoutPlayer({ type: Position.SECOND_BASE })
    //   // assert.strictEqual(player.playerLevel, PlayerLevel.HIGH_SCHOOL_SENIOR)
    //   // assert.strictEqual(player.gameLevel, GameLevel.HIGH_SCHOOL)
    //   assert.strictEqual(service.updateAge(17, 26), 18)
    // })
  
    // it('should update player attributes when gameCount is 50', async () => {
    //   // let player = await service.scoutPlayer({ type: Position.SECOND_BASE })
    //   // await service.updateAgeAndGameLevel(player, 50)
    //   // assert.strictEqual(player.playerLevel, PlayerLevel.JUNIOR_COLLEGE)
    //   // assert.strictEqual(player.gameLevel, GameLevel.JUNIOR_COLLEGE)
    //   assert.strictEqual(service.updateAge(18, 51), 19)
    // })
  
    // it('should update player attributes when gameCount is 75', async () => {
    //   // let player = await service.scoutPlayer({ type: Position.SECOND_BASE })
    //   // await service.updateAgeAndGameLevel(player, 75)
    //   // assert.strictEqual(player.playerLevel, PlayerLevel.COLLEGE_JUNIOR)
    //   // assert.strictEqual(player.gameLevel, GameLevel.COLLEGE)
    //   assert.strictEqual(service.updateAge(19, 76), 20)
    // })
  
    // it('should update player attributes when gameCount is 100', async () => {
    //   // let player = await service.scoutPlayer({ type: Position.SECOND_BASE })
    //   // await service.updateAgeAndGameLevel(player, 100)
    //   // assert.strictEqual(player.playerLevel, PlayerLevel.COLLEGE_SENIOR)
    //   // assert.strictEqual(player.gameLevel, GameLevel.COLLEGE)
    //   assert.strictEqual(service.updateAge(20, 101), 21)
    // })
  
    // it('should update player attributes when gameCount is 125', async () => {
    //   // let player = await service.scoutPlayer({ type: Position.SECOND_BASE })
    //   // await service.updateAgeAndGameLevel(player, 125)
    //   // assert.strictEqual(player.playerLevel, PlayerLevel.MINORS)
    //   // assert.strictEqual(player.gameLevel, GameLevel.MINORS)
    //   assert.strictEqual(service.updateAge(21, 126), 22)
    // })
  
    // it('should increment player age every 162 games after 125', async () => {
    //   let player = await service.scoutPlayer({ type: Position.SECOND_BASE, onDate: dayjs(simDate).format("YYYY-MM-DD") })
      
    //   assert.strictEqual(service.updateAge(22, 288), 23)
    //   assert.strictEqual(service.updateAge(23, 450), 24)

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

