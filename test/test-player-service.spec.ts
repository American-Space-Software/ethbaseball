
import { getContainer } from "./inversify.config.js"

import {  PlayerService } from "../src/service/player-service.js"
import { SchemaService } from "../src/service/schema-service.js"
import {  Player} from "../src/dto/player.js"
import assert from "assert"
import { GameService } from "../src/service/game-service.js"
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

      let ratings = service.calculateHittingRatings(player)

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


      let ratings = service.calculateHittingRatings(player)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 21,
        steals: 13,
        defense: 47,
        arm: 30,
        vsL: { contact: 40, gapPower: 47, homerunPower: 21, plateDiscipline: 47 },
        vsR: { contact: 51, gapPower: 60, homerunPower: 26, plateDiscipline: 60 }
      })




      player.overallRating = 65
      // player.dateOfBirth = dayjs().subtract(18, 'years').toDate()
      player.age = 18


      ratings = service.calculateHittingRatings(player)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 18,
        steals: 11,
        defense: 39,
        arm: 25,
        vsL: { contact: 34, gapPower: 40, homerunPower: 17, plateDiscipline: 40 },
        vsR: { contact: 43, gapPower: 50, homerunPower: 21, plateDiscipline: 50 }
      })




      player.overallRating = 70
      // player.dateOfBirth = dayjs().subtract(19, 'years').toDate()
      player.age = 19

      ratings = service.calculateHittingRatings(player)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 20,
        steals: 12,
        defense: 43,
        arm: 28,
        vsL: { contact: 37, gapPower: 43, homerunPower: 19, plateDiscipline: 43 },
        vsR: { contact: 47, gapPower: 55, homerunPower: 24, plateDiscipline: 55 }
      })

      // player.rating = {
      //   rating: 1700,
      //   volatility: 0,
      //   ratingDeviation: 0
      // }
      



      // player.dateOfBirth = dayjs().subtract(20, 'years').toDate()
      player.age = 20


      player.overallRating = 75

      ratings = service.calculateHittingRatings(player)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 23,
        steals: 14,
        defense: 50,
        arm: 32,
        vsL: { contact: 43, gapPower: 51, homerunPower: 21, plateDiscipline: 51 },
        vsR: { contact: 55, gapPower: 64, homerunPower: 27, plateDiscipline: 64 }
      })



      // player.rating = {
      //   rating: 1800,
      //   volatility: 0,
      //   ratingDeviation: 0
      // }
      
      // player.dateOfBirth = dayjs().subtract(21, 'years').toDate()
      player.age = 21


      player.overallRating = 78

      ratings = service.calculateHittingRatings(player)



      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 24,
        steals: 15,
        defense: 53,
        arm: 34,
        vsL: { contact: 46, gapPower: 54, homerunPower: 23, plateDiscipline: 54 },
        vsR: { contact: 58, gapPower: 68, homerunPower: 29, plateDiscipline: 68 }
      })

      // player.rating = {
      //   rating: 1900,
      //   volatility: 0,
      //   ratingDeviation: 0
      // }
      
      // player.dateOfBirth = dayjs().subtract(22, 'years').toDate()
      player.age = 22


      
      player.overallRating = 83


      ratings = service.calculateHittingRatings(player)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 26,
        steals: 16,
        defense: 58,
        arm: 37,
        vsL: { contact: 50, gapPower: 58, homerunPower: 25, plateDiscipline: 58 },
        vsR: { contact: 63, gapPower: 74, homerunPower: 32, plateDiscipline: 74 }
      })

      // player.rating = {
      //   rating: 2000,
      //   volatility: 0,
      //   ratingDeviation: 0
      // }
      
      // player.dateOfBirth = dayjs().subtract(24, 'years').toDate()
      player.age = 24


      player.overallRating = 86

      ratings = service.calculateHittingRatings(player)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 28,
        steals: 17,
        defense: 62,
        arm: 40,
        vsL: { contact: 54, gapPower: 62, homerunPower: 27, plateDiscipline: 62 },
        vsR: { contact: 68, gapPower: 79, homerunPower: 34, plateDiscipline: 79 }
      })

      // player.dateOfBirth = dayjs().subtract(27, 'years').toDate()
      player.age = 27

      player.overallRating = 89

      ratings = service.calculateHittingRatings(player)


      assert.deepStrictEqual(ratings, {
        contactProfile: { groundball: 20, flyBall: 60, lineDrive: 20 },
        speed: 32,
        steals: 19,
        defense: 70,
        arm: 45,
        vsL: { contact: 60, gapPower: 70, homerunPower: 30, plateDiscipline: 70 },
        vsR: { contact: 76, gapPower: 89, homerunPower: 38, plateDiscipline: 89 }
      })


    })

    it("should scout a hitter", async () => {

        let player:Player = await service.scoutPlayer({ type: Position.SECOND_BASE, onDate: dayjs(simDate).format("YYYY-MM-DD") })


        assert.equal(player.primaryPosition, Position.SECOND_BASE)
        assert.equal(player.fullName, "Anna Von")
        assert.equal(player.throws, "R")
        assert.equal(player.hits, "R")

        assert.deepStrictEqual(player.hittingRatings, {
          contactProfile: { groundball: 370, flyBall: 370, lineDrive: 260 },
          speed: 14,
          steals: 8,
          defense: 30,
          arm: 18,
          vsR: { contact: 36, gapPower: 14, homerunPower: 24, plateDiscipline: 34 },
          vsL: { contact: 36, gapPower: 14, homerunPower: 24, plateDiscipline: 34 }
        })

        assert.deepStrictEqual(player.pitchRatings, {
          pitches: [ { rating: 7, type: 'FF' } ],
          contactProfile: { groundball: 295, flyBall: 514, lineDrive: 191 },
          power: 8,
          vsR: { control: 9, movement: 5 },
          vsL: { control: 9, movement: 5 }
        })




    })

    it("should scout a pitcher", async () => {

        let player:Player = await service.scoutPlayer({ type: Position.PITCHER, onDate: dayjs(simDate).format("YYYY-MM-DD") })
        
        assert.equal(player.primaryPosition, Position.PITCHER)
        assert.equal(player.fullName, "Lesly Leffler")
        assert.equal(player.throws, "R")
        assert.equal(player.hits, "L")


        assert.deepStrictEqual(player.hittingRatings, {
          contactProfile: { groundball: 386, flyBall: 287, lineDrive: 327 },
          speed: 3,
          steals: 7,
          defense: 3,
          arm: 5,
          vsL: { contact: 6, gapPower: 8, homerunPower: 8, plateDiscipline: 8 },
          vsR: { contact: 7, gapPower: 9, homerunPower: 9, plateDiscipline: 9 }
        })


        assert.deepStrictEqual(player.pitchRatings, {
          pitches: [ { rating: 32, type: 'SV' }, { rating: 25, type: 'FF' } ],
          contactProfile: { groundball: 356, flyBall: 302, lineDrive: 342 },
          power: 20,
          vsR: { control: 29, movement: 31 },
          vsL: { control: 32, movement: 34 }
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

    it('should update player attributes when gameCount is 25', async () => {
      // let player = await service.scoutPlayer({ type: Position.SECOND_BASE })
      // assert.strictEqual(player.playerLevel, PlayerLevel.HIGH_SCHOOL_SENIOR)
      // assert.strictEqual(player.gameLevel, GameLevel.HIGH_SCHOOL)
      assert.strictEqual(service.updateAge(17, 26), 18)
    })
  
    it('should update player attributes when gameCount is 50', async () => {
      // let player = await service.scoutPlayer({ type: Position.SECOND_BASE })
      // await service.updateAgeAndGameLevel(player, 50)
      // assert.strictEqual(player.playerLevel, PlayerLevel.JUNIOR_COLLEGE)
      // assert.strictEqual(player.gameLevel, GameLevel.JUNIOR_COLLEGE)
      assert.strictEqual(service.updateAge(18, 51), 19)
    })
  
    it('should update player attributes when gameCount is 75', async () => {
      // let player = await service.scoutPlayer({ type: Position.SECOND_BASE })
      // await service.updateAgeAndGameLevel(player, 75)
      // assert.strictEqual(player.playerLevel, PlayerLevel.COLLEGE_JUNIOR)
      // assert.strictEqual(player.gameLevel, GameLevel.COLLEGE)
      assert.strictEqual(service.updateAge(19, 76), 20)
    })
  
    it('should update player attributes when gameCount is 100', async () => {
      // let player = await service.scoutPlayer({ type: Position.SECOND_BASE })
      // await service.updateAgeAndGameLevel(player, 100)
      // assert.strictEqual(player.playerLevel, PlayerLevel.COLLEGE_SENIOR)
      // assert.strictEqual(player.gameLevel, GameLevel.COLLEGE)
      assert.strictEqual(service.updateAge(20, 101), 21)
    })
  
    it('should update player attributes when gameCount is 125', async () => {
      // let player = await service.scoutPlayer({ type: Position.SECOND_BASE })
      // await service.updateAgeAndGameLevel(player, 125)
      // assert.strictEqual(player.playerLevel, PlayerLevel.MINORS)
      // assert.strictEqual(player.gameLevel, GameLevel.MINORS)
      assert.strictEqual(service.updateAge(21, 126), 22)
    })
  
    it('should increment player age every 162 games after 125', async () => {
      let player = await service.scoutPlayer({ type: Position.SECOND_BASE, onDate: dayjs(simDate).format("YYYY-MM-DD") })
      
      assert.strictEqual(service.updateAge(22, 288), 23)
      assert.strictEqual(service.updateAge(23, 450), 24)

    })
  


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

