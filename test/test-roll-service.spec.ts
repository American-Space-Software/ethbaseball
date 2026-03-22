import assert, { fail } from "assert"


import { getContainer } from "./inversify.config.js"

import { RollService } from '../src/service/roll-service.js'
import { SeedService } from "../src/service/data/seed-service.js"
import { PlayerService } from "../src/service/data/player-service.js"
import { RollChartService } from "../src/service/roll-chart-service.js"
import { SchemaService } from "../src/service/data/schema-service.js"
import { GamePlayer, Handedness, HitterChange, HittingProfile, HittingRatings, HomeAway, LeagueAverage, MatchupHandedness, OfficialPlayResult, PitchRatings, PitchType, PitcherChange, PitchingProfile, Play, PlayResult, Position, RunnerResult } from "../src/service/enums.js"
import { Player } from "../src/dto/player.js"
import { GameService } from "../src/service/data/game-service.js"

let container = getContainer()

//Arrange
let hittingRatings:HittingRatings
let pitchRatings:PitchRatings
let hitterChange:HitterChange
let pitcherChange:PitcherChange

describe('RollService', async () => {

    let service: RollService
    let rollChartService:RollChartService
    let rollService:RollService
    let seedService:SeedService
    let playerService:PlayerService
    let schemaService:SchemaService
    let gameService:GameService

    let la:LeagueAverage

    before('Before', async () => {

        service = container.get(RollService)
        seedService = container.get(SeedService)
        rollChartService = container.get(RollChartService)
        playerService = container.get(PlayerService)
        rollService = container.get(RollService)
        schemaService = container.get(SchemaService)
        gameService = container.get(GameService)

        await schemaService.load()

        la = playerService.buildLeagueAverages()

        let hitter:Player = new Player()
        // hitter.dateOfBirth = dayjs().subtract(17, 'years').toDate()
        hitter.age = 17


        hitter.overallRating = 99
        hitter.hits = Handedness.R
        hitter.primaryPosition = Position.CATCHER

        hitter.hittingProfile = await playerService.generateHittingProfile()

        let pitcher:Player = new Player()
        pitcher.age = 17

        pitcher.overallRating = 99
        pitcher.throws = Handedness.R
        pitcher.primaryPosition = Position.PITCHER


        pitcher.pitchingProfile = await playerService.generatePitchingProfile()

        hittingRatings = playerService.calculateHittingRatings( hitter, hitter.overallRating)
        pitchRatings = playerService.calculatePitchRatings(pitcher, hitter.overallRating)

        hitterChange = rollChartService.getHitterChange(hittingRatings, la.hittingRatings, Handedness.R )
        pitcherChange = rollChartService.getPitcherChange(pitchRatings, la.pitchRatings , Handedness.R)

    })

    it("should build valid power roll input for hitter", async () => {

        //Act
        let result = await rollChartService.buildHitterPowerRollInput(la, hitterChange )
    
        assert.deepStrictEqual(result,{ out: 684, singles: 100, doubles: 60, triples: 6, hr: 80 })

    })

    it("should build valid power roll input for pitcher", async () => {

        //Act
        let result = await rollChartService.buildPitcherPowerRollInput(la, pitcherChange)

        assert.deepStrictEqual(result, { out: 515, singles: 276, doubles: 104, triples: 11, hr: 94 })

    })

    // it("should sim a matchup", async () => {

    //     //Arrange
    //     let hitterPlayer = new Player();
    //     hitterPlayer._id = "1";
    //     hitterPlayer.firstName = "Bill";
    //     hitterPlayer.pitchRatings = {
    //         power: 16,
    //         vsR: {
    //             control: 7,
    //             movement: 5,
    //         },
    //         vsL: {
    //             control: 7,
    //             movement: 5,
    //         },
    //         contactProfile: {
    //             groundball: 20,
    //             flyBall: 60,
    //             lineDrive: 20
    //         },
    //         pitches: [{ rating: 19, type: PitchType.FF }]
    //     }
    //     hitterPlayer.hittingRatings = {
    //         vsR: {
    //             contact: 30,
    //             gapPower: 33,
    //             homerunPower: 14,
    //             plateDiscipline: 27
    //         },
    //         vsL: {
    //             contact: 30,
    //             gapPower: 33,
    //             homerunPower: 14,
    //             plateDiscipline: 27
    //         },
    //         contactProfile: {
    //             groundball: 20,
    //             flyBall: 60,
    //             lineDrive: 20
    //         },
    //         speed: 27,
    //         defense: 22,
    //         steals: 27,
    //         arm: 25
    //     };
    //     hitterPlayer.primaryPosition = Position.CATCHER;
    //     hitterPlayer.throws = Handedness.R;
    //     hitterPlayer.hits = Handedness.R;



    //     let pitcherPlayer = new Player();
    //     pitcherPlayer._id = "2";
    //     pitcherPlayer.firstName = "Sam";
    //     pitcherPlayer.pitchRatings = {
    //         vsR: {
    //             control: 18,
    //             movement: 29
    //         },
    //         vsL: {
    //             control: 18,
    //             movement: 29
    //         },
    //         contactProfile: {
    //             groundball: 20,
    //             flyBall: 60,
    //             lineDrive: 20
    //         },
    //         power: 29,
    //         pitches: [
    //             { rating: 9, type: PitchType.FF },
    //             { rating: 29, type: PitchType.CU },
    //             { rating: 29, type: PitchType.CH }
    //         ]
    //     }
    //     pitcherPlayer.hittingRatings = {
    //         vsR: {
    //             contact: 15,
    //             gapPower: 17,
    //             homerunPower: 7,
    //             plateDiscipline: 14 
    //         },
    //         vsL: {
    //             contact: 15,
    //             gapPower: 17,
    //             homerunPower: 7,
    //             plateDiscipline: 14 
    //         },
    //         contactProfile: {
    //             groundball: 20,
    //             flyBall: 60,
    //             lineDrive: 20
    //         },

    //         speed: 14,
    //         defense: 11,
    //         steals: 14,
    //         arm: 13
    //     }
    //     pitcherPlayer.primaryPosition = Position.PITCHER;
    //     pitcherPlayer.throws = Handedness.R;
    //     pitcherPlayer.hits = Handedness.R;
        

        
        
    //     let hitter:GamePlayer = {
    //         fullName: hitterPlayer.fullName,
    //         overallRating: { before: hitterPlayer.overallRating},
    //         age: 21,
    //         ownerId: hitterPlayer.ownerId,

    //         throws: hitterPlayer.throws,
    //         hits: hitterPlayer.hits,

    //         pitchRatings: hitterPlayer.pitchRatings,
    //         hittingRatings: hitterPlayer.hittingRatings,

    //         currentPosition: Position.CATCHER,
    //         hitResult: {
    //             games: 0,
    //             pa: 0,
    //             atBats: 0,
    //             hits: 0,
    //             singles: 0,
    //             doubles: 0,
    //             triples: 0,
    //             homeRuns: 0,
    //             runs: 0,
    //             rbi: 0,
    //             bb: 0,
    //             sb: 0,
    //             cs: 0,
    //             hbp: 0,
    //             so: 0,
    //             lob: 0,
    //             sacBunts: 0,
    //             sacFlys: 0,
    //             groundOuts: 0,
    //             flyOuts: 0,
    //             lineOuts: 0,
    //             groundBalls: 0,
    //             lineDrives: 0,
    //             flyBalls: 0,
    //             gidp: 0,
    //             po: 0,
    //             assists: 0,
    //             e: 0,
    //             wpa: 0,
    //             teamWins: 0,
    //             teamLosses: 0,
    //             pitches: 0,
    //             balls: 0,
    //             strikes: 0,
    //             fouls: 0,
    //             swings: 0,
    //             swingAtBalls: 0,
    //             swingAtStrikes: 0,
    //             inZone: 0,
    //             outs: 0,
    //             ballsInPlay: 0,
    //             totalPitchQuality: 0,
    //             totalPitchPowerQuality: 0,
    //             totalPitchLocationQuality: 0,
    //             totalPitchMovementQuality: 0,
    //             inZoneContact: 0,
    //             outZoneContact: 0,
    //             passedBalls: 0,
    //             csDefense: 0,
    //             doublePlays: 0,
    //             sbAttempts: 0,
    //             outfieldAssists: 0
    //         },
    //         pitchResult: {
    //             games: 0,
    //             ip: '0.0',
    //             starts: 0,
    //             outs: 0,
    //             er: 0,
    //             so: 0,
    //             hits: 0,
    //             bb: 0,
    //             hbp: 0,
    //             singles: 0,
    //             doubles: 0,
    //             triples: 0,
    //             strikes: 0,
    //             balls: 0,
    //             runs: 0,
    //             homeRuns: 0,
    //             wins: 0,
    //             losses: 0,
    //             saves: 0,
    //             bs: 0,
    //             sho: 0,
    //             cg: 0,
    //             battersFaced: 0,
    //             atBats: 0,
    //             pitches: 0,
    //             groundOuts: 0,
    //             flyOuts: 0,
    //             lineOuts: 0,
    //             groundBalls: 0,
    //             lineDrives: 0,
    //             flyBalls: 0,
    //             wpa: 0,
    //             teamWins: 0,
    //             teamLosses: 0,
    //             fouls: 0,
    //             swings: 0,
    //             swingAtBalls: 0,
    //             swingAtStrikes: 0,
    //             inZone: 0,
    //             ballsInPlay: 0,
    //             sacFlys: 0,
    //             totalPitchQuality: 0,
    //             totalPitchPowerQuality: 0,
    //             totalPitchLocationQuality: 0,
    //             totalPitchMovementQuality: 0,
    //             inZoneContact: 0,
    //             outZoneContact: 0,
    //             wildPitches: 0
    //         },
    //         lineupIndex: 0,
    //         _id: "3",
    //         firstName: "a",
    //         lastName: "b",
    //         displayName: "c",
    //         coverImageCid: "",
    //         color1: "",
    //         color2: "",
    //         hitterChange: {
    //             vsL: rollService.getHitterChange(hitterPlayer.hittingRatings, la.hittingRatings, Handedness.L),
    //             vsR: rollService.getHitterChange(hitterPlayer.hittingRatings, la.hittingRatings, Handedness.R),
    //         },

    //         pitcherChange: {
    //             vsL: rollService.getPitcherChange(hitterPlayer.pitchRatings, la.pitchRatings, Handedness.L),
    //             vsR: rollService.getPitcherChange(hitterPlayer.pitchRatings, la.pitchRatings, Handedness.R),
    //         },
    //     }

    //     let pitcher:GamePlayer = {
    //         fullName: pitcherPlayer.fullName,
    //         // ratingBefore: pitcherPlayer.rating,
    //         // ratingAfter: undefined,
    //         // playerLevel: pitcherPlayer.playerLevel,
    //         age: 21,
    //         ownerId: pitcherPlayer.ownerId,

    //         overallRating: { before: pitcherPlayer.overallRating},

    //         throws: pitcherPlayer.throws,
    //         hits: pitcherPlayer.hits,

    //         pitchRatings: pitcherPlayer.pitchRatings,
    //         hittingRatings: pitcherPlayer.hittingRatings,

    //         currentPosition: Position.PITCHER,
    //         hitResult: {
    //             games: 0,
    //             pa: 0,
    //             atBats: 0,
    //             hits: 0,
    //             singles: 0,
    //             doubles: 0,
    //             triples: 0,
    //             homeRuns: 0,
    //             runs: 0,
    //             rbi: 0,
    //             bb: 0,
    //             sb: 0,
    //             cs: 0,
    //             hbp: 0,
    //             so: 0,
    //             lob: 0,
    //             sacBunts: 0,
    //             sacFlys: 0,
    //             groundOuts: 0,
    //             flyOuts: 0,
    //             lineOuts: 0,
    //             groundBalls: 0,
    //             lineDrives: 0,
    //             flyBalls: 0,
    //             gidp: 0,
    //             po: 0,
    //             assists: 0,
    //             e: 0,
    //             wpa: 0,
    //             teamWins: 0,
    //             teamLosses: 0,
    //             pitches: 0,
    //             balls: 0,
    //             strikes: 0,
    //             fouls: 0,
    //             swings: 0,
    //             swingAtBalls: 0,
    //             swingAtStrikes: 0,
    //             inZone: 0,
    //             outs: 0,
    //             ballsInPlay: 0,
    //             totalPitchQuality: 0,
    //             totalPitchPowerQuality: 0,
    //             totalPitchLocationQuality: 0,
    //             totalPitchMovementQuality: 0,
    //             inZoneContact: 0,
    //             outZoneContact: 0,
    //             passedBalls: 0,
    //             csDefense: 0,
    //             doublePlays: 0,
    //             sbAttempts: 0,
    //             outfieldAssists: 0
    //         },
    //         pitchResult: {
    //             games: 0,
    //             ip: '0.0',
    //             starts: 0,
    //             outs: 0,
    //             er: 0,
    //             so: 0,
    //             hits: 0,
    //             bb: 0,
    //             hbp: 0,
    //             singles: 0,
    //             doubles: 0,
    //             triples: 0,
    //             strikes: 0,
    //             balls: 0,
    //             runs: 0,
    //             homeRuns: 0,
    //             wins: 0,
    //             losses: 0,
    //             saves: 0,
    //             bs: 0,
    //             sho: 0,
    //             cg: 0,
    //             battersFaced: 0,
    //             atBats: 0,
    //             pitches: 0,
    //             groundOuts: 0,
    //             flyOuts: 0,
    //             lineOuts: 0,
    //             groundBalls: 0,
    //             lineDrives: 0,
    //             flyBalls: 0,
    //             wpa: 0,
    //             teamWins: 0,
    //             teamLosses: 0,
    //             fouls: 0,
    //             swings: 0,
    //             swingAtBalls: 0,
    //             swingAtStrikes: 0,
    //             inZone: 0,
    //             ballsInPlay: 0,
    //             sacFlys: 0,
    //             totalPitchQuality: 0,
    //             totalPitchPowerQuality: 0,
    //             totalPitchLocationQuality: 0,
    //             totalPitchMovementQuality: 0,
    //             inZoneContact: 0,
    //             outZoneContact: 0,
    //             wildPitches: 0
    //         },
    //         lineupIndex: 0,
    //         _id: "4",
    //         // gameLevel: GameLevel.HIGH_SCHOOL,
    //         firstName: "a",
    //         lastName: "b",
    //         displayName: "c",
    //         coverImageCid: "",
    //         color1: "",
    //         color2: "",
    //         hitterChange: {
    //             vsL: rollService.getHitterChange(pitcherPlayer.hittingRatings, la.hittingRatings, Handedness.L),
    //             vsR: rollService.getHitterChange(pitcherPlayer.hittingRatings, la.hittingRatings, Handedness.R),
    //         },

    //         pitcherChange: {
    //             vsL: rollService.getPitcherChange(pitcherPlayer.pitchRatings, la.pitchRatings, Handedness.L),
    //             vsR: rollService.getPitcherChange(pitcherPlayer.pitchRatings, la.pitchRatings, Handedness.R),
    //         },
    //     }

    //     let defensePlayers = [pitcher]
    //     let offensePlayers = [hitter]

    //     let id=5

    //     let otherDefense = [Position.CATCHER, Position.FIRST_BASE, Position.SECOND_BASE, Position.SHORTSTOP, Position.THIRD_BASE, Position.LEFT_FIELD, Position.RIGHT_FIELD, Position.CENTER_FIELD].map( p => {
            
    //         id++

    //         let player:Player = Object.assign(new Player, {
    //             _id: id.toString(),
    //             primaryPosition: p,
    //             hittingRatings: {
    //                 defense: 85,
    //                 arm: 85
    //             }
    //         })

    //         let gamePlayer:GamePlayer = {
    //             fullName: player.fullName,
    //             // ratingBefore: player.rating,
    //             // ratingAfter: undefined,
    //             // playerLevel: player.playerLevel,
    //             age: 21,
    //             ownerId: player.ownerId,

    //             overallRating: { before: player.overallRating},


    //             throws: player.throws,
    //             hits: player.hits,

    //             pitchRatings: player.pitchRatings,
    //             hittingRatings: player.hittingRatings,
    //             hitResult: {
    //                 games: 0,
    //                 pa: 0,
    //                 atBats: 0,
    //                 hits: 0,
    //                 singles: 0,
    //                 doubles: 0,
    //                 triples: 0,
    //                 homeRuns: 0,
    //                 runs: 0,
    //                 rbi: 0,
    //                 bb: 0,
    //                 sb: 0,
    //                 cs: 0,
    //                 hbp: 0,
    //                 so: 0,
    //                 lob: 0,
    //                 sacBunts: 0,
    //                 sacFlys: 0,
    //                 groundOuts: 0,
    //                 flyOuts: 0,
    //                 lineOuts: 0,
    //                 groundBalls: 0,
    //                 lineDrives: 0,
    //                 flyBalls: 0,
    //                 gidp: 0,
    //                 po: 0,
    //                 assists: 0,
    //                 e: 0,
    //                 wpa: 0,
    //                 teamWins: 0,
    //                 teamLosses: 0,
    //                 pitches: 0,
    //                 balls: 0,
    //                 strikes: 0,
    //                 fouls: 0,
    //                 swings: 0,
    //                 swingAtBalls: 0,
    //                 swingAtStrikes: 0,
    //                 inZone: 0,
    //                 outs: 0,
    //                 ballsInPlay: 0,
    //                 totalPitchQuality: 0,
    //                 totalPitchPowerQuality: 0,
    //                 totalPitchLocationQuality: 0,
    //                 totalPitchMovementQuality: 0,
    //                 inZoneContact: 0,
    //                 outZoneContact: 0,
    //                 passedBalls: 0,
    //                 csDefense: 0,
    //                 doublePlays: 0,
    //                 sbAttempts: 0,
    //                 outfieldAssists: 0
    //             },
    //             pitchResult: {
    //                 games: 0,
    //                 ip: '0.0',
    //                 starts: 0,
    //                 wins: 0,
    //                 losses: 0,
    //                 saves: 0,
    //                 bs: 0,
    //                 outs: 0,
    //                 er: 0,
    //                 so: 0,
    //                 hits: 0,
    //                 bb: 0,
    //                 sho: 0,
    //                 cg: 0,
    //                 hbp: 0,
    //                 singles: 0,
    //                 doubles: 0,
    //                 triples: 0,
    //                 strikes: 0,
    //                 balls: 0,
    //                 battersFaced: 0,
    //                 atBats: 0,
    //                 pitches: 0,
    //                 runs: 0,
    //                 homeRuns: 0,
    //                 groundOuts: 0,
    //                 flyOuts: 0,
    //                 lineOuts: 0,
    //                 groundBalls: 0,
    //                 lineDrives: 0,
    //                 flyBalls: 0,
    //                 wpa: 0,
    //                 teamWins: 0,
    //                 teamLosses: 0,
    //                 fouls: 0,
    //                 swings: 0,
    //                 swingAtBalls: 0,
    //                 swingAtStrikes: 0,
    //                 inZone: 0,
    //                 ballsInPlay: 0,
    //                 sacFlys: 0,
    //                 totalPitchQuality: 0,
    //                 totalPitchPowerQuality: 0,
    //                 totalPitchLocationQuality: 0,
    //                 totalPitchMovementQuality: 0,
    //                 inZoneContact: 0,
    //                 outZoneContact: 0,
    //                 wildPitches: 0
    //             },
    //             currentPosition: p,
    //             _id: id.toString(),
    //             // gameLevel: GameLevel.HIGH_SCHOOL,
    //             firstName: "a",
    //             lastName: "b",
    //             displayName: "c",
    //             coverImageCid: "",
    //             color1: "",
    //             color2: "",
    //             hitterChange: {
    //                 vsL: rollService.getHitterChange(hitterPlayer.hittingRatings, la.hittingRatings, Handedness.L),
    //                 vsR: rollService.getHitterChange(hitterPlayer.hittingRatings, la.hittingRatings, Handedness.R),
    //             },

    //             pitcherChange: {
    //                 vsL: rollService.getPitcherChange(hitterPlayer.pitchRatings, la.pitchRatings, Handedness.L),
    //                 vsR: rollService.getPitcherChange(hitterPlayer.pitchRatings, la.pitchRatings, Handedness.R),
    //             },
    //         }

    //         return gamePlayer

    //     })

    //     id=20

    //     let otherOffense = [Position.PITCHER, Position.FIRST_BASE, Position.SECOND_BASE, Position.SHORTSTOP, Position.THIRD_BASE, Position.LEFT_FIELD, Position.RIGHT_FIELD, Position.CENTER_FIELD].map( p => {

    //         let player:Player = Object.assign(new Player, {
    //             _id: id++,
    //             primaryPosition: p,
    //             hittingRatings: {
    //                 defense: 85,
    //                 arm: 85
    //             }
    //         })

            
    //         let gamePlayer:GamePlayer = {
    //             fullName: player.fullName,

    //             age: 21,
    //             ownerId: player.ownerId,
    //             overallRating: { before: player.overallRating},

    //             throws: player.throws,
    //             hits: player.hits,

    //             pitchRatings: player.pitchRatings,
    //             hittingRatings: player.hittingRatings,
    //             hitResult: {
    //                 games: 0,
    //                 pa: 0,
    //                 atBats: 0,
    //                 hits: 0,
    //                 singles: 0,
    //                 doubles: 0,
    //                 triples: 0,
    //                 homeRuns: 0,
    //                 runs: 0,
    //                 rbi: 0,
    //                 bb: 0,
    //                 sb: 0,
    //                 cs: 0,
    //                 hbp: 0,
    //                 so: 0,
    //                 lob: 0,
    //                 sacBunts: 0,
    //                 sacFlys: 0,
    //                 groundOuts: 0,
    //                 flyOuts: 0,
    //                 lineOuts: 0,
    //                 groundBalls: 0,
    //                 lineDrives: 0,
    //                 flyBalls: 0,
    //                 gidp: 0,
    //                 po: 0,
    //                 assists: 0,
    //                 e: 0,
    //                 wpa: 0,
    //                 teamWins: 0,
    //                 teamLosses: 0,
    //                 pitches: 0,
    //                 balls: 0,
    //                 strikes: 0,
    //                 fouls: 0,
    //                 swings: 0,
    //                 swingAtBalls: 0,
    //                 swingAtStrikes: 0,
    //                 inZone: 0,
    //                 outs: 0,
    //                 ballsInPlay: 0,
    //                 totalPitchQuality: 0,
    //                 totalPitchPowerQuality: 0,
    //                 totalPitchLocationQuality: 0,
    //                 totalPitchMovementQuality: 0,
    //                 inZoneContact: 0,
    //                 outZoneContact: 0,
    //                 passedBalls: 0,
    //                 csDefense: 0,
    //                 doublePlays: 0,
    //                 sbAttempts: 0,
    //                 outfieldAssists: 0
    //             },
    //             pitchResult: {
    //                 games: 0,
    //                 ip: '0.0',
    //                 starts: 0,
    //                 wins: 0,
    //                 losses: 0,
    //                 saves: 0,
    //                 bs: 0,
    //                 outs: 0,
    //                 er: 0,
    //                 so: 0,
    //                 hits: 0,
    //                 bb: 0,
    //                 sho: 0,
    //                 cg: 0,
    //                 hbp: 0,
    //                 singles: 0,
    //                 doubles: 0,
    //                 triples: 0,
    //                 strikes: 0,
    //                 balls: 0,
    //                 battersFaced: 0,
    //                 atBats: 0,
    //                 pitches: 0,
    //                 runs: 0,
    //                 homeRuns: 0,
    //                 groundOuts: 0,
    //                 flyOuts: 0,
    //                 lineOuts: 0,
    //                 groundBalls: 0,
    //                 lineDrives: 0,
    //                 flyBalls: 0,
    //                 wpa: 0,
    //                 teamWins: 0,
    //                 teamLosses: 0,
    //                 fouls: 0,
    //                 swings: 0,
    //                 swingAtBalls: 0,
    //                 swingAtStrikes: 0,
    //                 inZone: 0,
    //                 ballsInPlay: 0,
    //                 sacFlys: 0,
    //                 totalPitchQuality: 0,
    //                 totalPitchPowerQuality: 0,
    //                 totalPitchLocationQuality: 0,
    //                 totalPitchMovementQuality: 0,
    //                 inZoneContact: 0,
    //                 outZoneContact: 0,
    //                 wildPitches: 0
    //             },
    //             currentPosition: p,
    //             _id: id.toString(),
    //             // gameLevel: GameLevel.HIGH_SCHOOL,
    //             firstName: "a",
    //             lastName: "b",
    //             displayName: "c",
    //             coverImageCid: "",
    //             color1: "",
    //             color2: "",
    //             hitterChange: {
    //                 vsL: rollService.getHitterChange(hitterPlayer.hittingRatings, la.hittingRatings, Handedness.L),
    //                 vsR: rollService.getHitterChange(hitterPlayer.hittingRatings, la.hittingRatings, Handedness.R),
    //             },

    //             pitcherChange: {
    //                 vsL: rollService.getPitcherChange(hitterPlayer.pitchRatings, la.pitchRatings, Handedness.L),
    //                 vsR: rollService.getPitcherChange(hitterPlayer.pitchRatings, la.pitchRatings, Handedness.R),
    //             },
    //         }

            

    //         return gamePlayer

    //     })

    //     //Create the rest of the defense
    //     for (let player of otherDefense) {
    //         defensePlayers.push(player)
    //     }

    //     for (let player of otherOffense) {
    //         offensePlayers.push(player)
    //     }

    //     //@ts-ignore
    //     let catcher:GamePlayer = otherDefense.find( p => p.currentPosition == "C")

    //     let matchupHandedness: MatchupHandedness = gameService.getMatchupHandedness(hitter, pitcher)


    //     let leagueAverages:LeagueAverage = playerService.buildLeagueAverages(la)

    //     let play:Play = gameService.createPlay(0, 
    //                                hitter, 
    //                                pitcher, 
    //                                catcher, 
    //                                undefined, 
    //                                undefined, 
    //                                undefined, 
    //                                matchupHandedness, 
    //                                0, 
    //                                {away: 0, home: 0 }, 
    //                                1, 
    //                                true
    //                             )


    //     let command:SimPitchCommand = {
    //         play:play,

    //         offense: {
    //             name: "Offense",
    //             players: offensePlayers,
    //             lineupIds: offensePlayers.map(p => p._id),
    //             currentHitterIndex: 0,
    //             currentPitcherId: offensePlayers.find(p => p.currentPosition == Position.PITCHER)?._id,
    //             runner1BId: undefined,
    //             runner2BId: undefined,
    //             runner3BId: undefined,
    //             homeAway: HomeAway.HOME,
    //             abbrev: "",
    //             seasonRating: { before: 1500 },
    //             longTermRating: { before: 1500 },

    //             overallRecord: {
    //                 before: {
    //                     wins: 0,
    //                     losses: 0,
    //                     winPercent: 0,
    //                     gamesBehind: 0,
    //                     resultLast10: [],
    //                     runsScored: 0,
    //                     runsAgainst: 0,
    //                     rank: 0,
    //                 }
    //             },
    //             logoId: "",
    //             finances: {}
    //         },
    //         defense: {
    //             name: "Defense",
    //             players: defensePlayers,
    //             lineupIds: defensePlayers.map(p => p._id),
    //             currentHitterIndex: 0,
    //             currentPitcherId: pitcher._id,
    //             runner1BId: undefined,
    //             runner2BId: undefined,
    //             runner3BId: undefined,
    //             homeAway: HomeAway.AWAY,
    //             abbrev: "",
    //             seasonRating: { before: 1500 },
    //             longTermRating: { before: 1500 },

    //             overallRecord: {
    //                 before: {
    //                     wins: 0,
    //                     losses: 0,
    //                     winPercent: 0,
    //                     gamesBehind: 0,
    //                     resultLast10: [],
    //                     runsScored: 0,
    //                     runsAgainst: 0,
    //                     rank: 0,
    //                 }
    //             },
    //             logoId: "",
    //             finances: {}
    //         },

    //         hitter:hitter,
    //         pitcher:pitcher,

    //         hitterChange:hitterChange,
    //         pitcherChange:pitcherChange,

    //         //@ts-ignore
    //         catcher:catcher,

    //         halfInningRunnerEvents:[],
    //         leagueAverages: leagueAverages,

    //         rng: await seedService.getRNG()

    //     }


    //     //Act
    //     let result = service.simMatchup(command)

    //     // assert.equal(result.matchupHandedness.throws, Handedness.R)
    //     // assert.equal(result.matchupHandedness.hits, Handedness.R)
    //     assert.equal(result.pitchLog.count.balls, 1)
    //     assert.equal(result.pitchLog.count.pitches, 5)
    //     assert.equal(result.result, PlayResult.STRIKEOUT)
    //     assert.equal(result.officialPlayResult, OfficialPlayResult.STRIKEOUT)
    //     assert.equal(result.runner.result.end.out.length, 1)
    //     assert.equal(result.fielder, undefined)

    // })



  
    // it('should calculate a hitter game score', async () => {

    //     let result = service.calculateHitterGameScore({
    //         assists: 1,
    //         atBats: 8,
    //         bb: 2,
    //         cs: 1,
    //         doubles: 3,
    //         triples: 1,
    //         homeRuns: 2,
    //         e: 1,
    //         flyBalls: 0,
    //         pa: 11,
    //         hits: 7,
    //         singles: 1,
    //         runs: 2,
    //         rbi: 3,
    //         sb: 1,
    //         hbp: 2,
    //         so: 3,
    //         lob: 0,
    //         sacBunts: 0,
    //         sacFlys: 0,
    //         groundOuts: 0,
    //         flyOuts: 0,
    //         lineOuts: 0,
    //         groundBalls: 0,
    //         lineDrives: 0,
    //         gidp: 0,
    //         po: 0,
    //         gameScore: 0,
    //         teamWins: 0,
    //         teamLosses: 0,
    //         experience: 0,
    //         pitches: 0,
    //         balls: 0,
    //         strikes: 0,
    //         fouls: 0,
    //         swings: 0,
    //         swingAtBalls: 0,
    //         swingAtStrikes: 0,
    //         inZone: 0,
    //         outs: 0
    //     })
  
    //     assert.equal(result, 81.5)
  
    // })

    // it('should calculate a pitcher game score', async () => {

    //     let result = service.calculatePitcherGameScore({
    //         ip: '0.0',
    //         starts: 1,
    //         wins: 1,
    //         losses: 0,
    //         saves: 1,
    //         bs: 0,
    //         outs: 22,
    //         er: 4,
    //         so: 11,
    //         hits: 11,
    //         bb: 3,
    //         sho: 0,
    //         cg: 0,
    //         hbp: 3,
    //         singles: 4,
    //         doubles: 4,
    //         triples: 2,
    //         strikes: 0,
    //         balls: 0,
    //         battersFaced: 22,
    //         atBats: 0,
    //         pitches: 0,
    //         runs: 0,
    //         homeRuns: 1,
    //         groundOuts: 0,
    //         flyOuts: 0,
    //         lineOuts: 0,
    //         groundBalls: 0,
    //         lineDrives: 0,
    //         flyBalls: 0,
    //         gameScore: 0,
    //         teamWins: 0,
    //         teamLosses: 0,
    //         experience: 0,
    //         fouls: 0,
    //         swings: 0,
    //         swingAtBalls: 0,
    //         swingAtStrikes: 0,
    //         inZone: 0
    //     })

    //     assert.equal(result, -24.999999999999993)

    // })

})
