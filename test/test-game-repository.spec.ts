import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { GameRepository } from "../src/repository/game-repository.js"
import { SchemaService } from "../src/service/schema-service.js"

import { Game } from "../src/dto/game.js";
import { SeasonService } from "../src/service/season-service.js";
import { StadiumService } from "../src/service/stadium-service.js";
import { LeagueService } from "../src/service/league-service.js";
import { Season } from "../src/dto/season.js";
import { League } from "../src/dto/league.js";
import { Stadium } from "../src/dto/stadium.js";


let id1

let league
let season
let stadium

describe('GameRepository', async () => {

    let repository:GameRepository
    let schemaService:SchemaService
    let seasonService:SeasonService
    let leagueService:LeagueService
    let stadiumService:StadiumService

    before("", async () => {

        let container = getContainer()
        
        repository = container.get("GameRepository")
        schemaService = container.get(SchemaService)
        seasonService = container.get(SeasonService)
        leagueService = container.get(LeagueService)
        stadiumService = container.get(StadiumService)
        
        await schemaService.load()
       
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


    })


    it("should create & get a game", async () => {

        //Arrange
        let game:Game = Object.assign(new Game(), {
            "_id": "6e77b839-b55c-4c77-80f4-88ba5ce58619",
            "currentInning": 1,
            "isTopInning": true,
            "isComplete": false,
            "count": {
                "balls": 0,
                "strikes": 0,
                "outs": 0
            },
            "score": {
                "away": 0,
                "home": 0
            },
            "away": {
                "players": [
                    {
                        "player": {
                            "_id": "f1a3fa32-bb43-4d80-94da-725681ad4682",
                            "tokenId": 31,
                            "fullName": "Nathan Hills",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Taurus",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.17000000000000015,
                                "movementDelta": 0.53,
                                "powerDelta": -0.28,
                                "vsSameHandDelta": -0.64,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": -0.1
                                    },
                                    {
                                        "type": "Splitter",
                                        "ratingDelta": -0.46
                                    },
                                    {
                                        "type": "Slider",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Sinker",
                                        "ratingDelta": 0.26
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": 0.4,
                                "gapPowerDelta": 0.05,
                                "homerunPowerDelta": -0.02,
                                "plateDisciplineDelta": 0.32999999999999974,
                                "speedDelta": -0.72,
                                "defenseDelta": -0.51,
                                "vsSameHandDelta": 0.47
                            },
                            "pitchRatings": {
                                "control": 29,
                                "power": 18,
                                "movement": 38,
                                "vsSameHand": 9,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 23,
                                        "type": "Slurve"
                                    },
                                    {
                                        "rating": 14,
                                        "type": "Splitter"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Slider"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Sinker"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 18,
                                "gapPower": 13,
                                "homerunPower": 13,
                                "speed": 4,
                                "vsSameHand": 19,
                                "plateDiscipline": 17,
                                "defense": 6
                            },
                            "throws": "R",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.298Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.298Z",
                            "dateCreated": "2023-09-19T14:46:20.457Z"
                        },
                        "currentPosition": "P",
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        },
                        "lineupIndex": 8
                    },
                    {
                        "player": {
                            "_id": "f1a3fa32-bb43-4d80-94da-725681ad4682",
                            "tokenId": 31,
                            "fullName": "Nathan Hills",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Taurus",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.17000000000000015,
                                "movementDelta": 0.53,
                                "powerDelta": -0.28,
                                "vsSameHandDelta": -0.64,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": -0.1
                                    },
                                    {
                                        "type": "Splitter",
                                        "ratingDelta": -0.46
                                    },
                                    {
                                        "type": "Slider",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Sinker",
                                        "ratingDelta": 0.26
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": 0.4,
                                "gapPowerDelta": 0.05,
                                "homerunPowerDelta": -0.02,
                                "plateDisciplineDelta": 0.32999999999999974,
                                "speedDelta": -0.72,
                                "defenseDelta": -0.51,
                                "vsSameHandDelta": 0.47
                            },
                            "pitchRatings": {
                                "control": 29,
                                "power": 18,
                                "movement": 38,
                                "vsSameHand": 9,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 23,
                                        "type": "Slurve"
                                    },
                                    {
                                        "rating": 14,
                                        "type": "Splitter"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Slider"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Sinker"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 18,
                                "gapPower": 13,
                                "homerunPower": 13,
                                "speed": 4,
                                "vsSameHand": 19,
                                "plateDiscipline": 17,
                                "defense": 6
                            },
                            "throws": "R",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.298Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.298Z",
                            "dateCreated": "2023-09-19T14:46:20.457Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "f1a3fa32-bb43-4d80-94da-725681ad4682",
                            "tokenId": 31,
                            "fullName": "Nathan Hills",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Taurus",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.17000000000000015,
                                "movementDelta": 0.53,
                                "powerDelta": -0.28,
                                "vsSameHandDelta": -0.64,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": -0.1
                                    },
                                    {
                                        "type": "Splitter",
                                        "ratingDelta": -0.46
                                    },
                                    {
                                        "type": "Slider",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Sinker",
                                        "ratingDelta": 0.26
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": 0.4,
                                "gapPowerDelta": 0.05,
                                "homerunPowerDelta": -0.02,
                                "plateDisciplineDelta": 0.32999999999999974,
                                "speedDelta": -0.72,
                                "defenseDelta": -0.51,
                                "vsSameHandDelta": 0.47
                            },
                            "pitchRatings": {
                                "control": 29,
                                "power": 18,
                                "movement": 38,
                                "vsSameHand": 9,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 23,
                                        "type": "Slurve"
                                    },
                                    {
                                        "rating": 14,
                                        "type": "Splitter"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Slider"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Sinker"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 18,
                                "gapPower": 13,
                                "homerunPower": 13,
                                "speed": 4,
                                "vsSameHand": 19,
                                "plateDiscipline": 17,
                                "defense": 6
                            },
                            "throws": "R",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.298Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.298Z",
                            "dateCreated": "2023-09-19T14:46:20.457Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "f1a3fa32-bb43-4d80-94da-725681ad4682",
                            "tokenId": 31,
                            "fullName": "Nathan Hills",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Taurus",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.17000000000000015,
                                "movementDelta": 0.53,
                                "powerDelta": -0.28,
                                "vsSameHandDelta": -0.64,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": -0.1
                                    },
                                    {
                                        "type": "Splitter",
                                        "ratingDelta": -0.46
                                    },
                                    {
                                        "type": "Slider",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Sinker",
                                        "ratingDelta": 0.26
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": 0.4,
                                "gapPowerDelta": 0.05,
                                "homerunPowerDelta": -0.02,
                                "plateDisciplineDelta": 0.32999999999999974,
                                "speedDelta": -0.72,
                                "defenseDelta": -0.51,
                                "vsSameHandDelta": 0.47
                            },
                            "pitchRatings": {
                                "control": 29,
                                "power": 18,
                                "movement": 38,
                                "vsSameHand": 9,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 23,
                                        "type": "Slurve"
                                    },
                                    {
                                        "rating": 14,
                                        "type": "Splitter"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Slider"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Sinker"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 18,
                                "gapPower": 13,
                                "homerunPower": 13,
                                "speed": 4,
                                "vsSameHand": 19,
                                "plateDiscipline": 17,
                                "defense": 6
                            },
                            "throws": "R",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.298Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.298Z",
                            "dateCreated": "2023-09-19T14:46:20.457Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "f1a3fa32-bb43-4d80-94da-725681ad4682",
                            "tokenId": 31,
                            "fullName": "Nathan Hills",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Taurus",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.17000000000000015,
                                "movementDelta": 0.53,
                                "powerDelta": -0.28,
                                "vsSameHandDelta": -0.64,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": -0.1
                                    },
                                    {
                                        "type": "Splitter",
                                        "ratingDelta": -0.46
                                    },
                                    {
                                        "type": "Slider",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Sinker",
                                        "ratingDelta": 0.26
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": 0.4,
                                "gapPowerDelta": 0.05,
                                "homerunPowerDelta": -0.02,
                                "plateDisciplineDelta": 0.32999999999999974,
                                "speedDelta": -0.72,
                                "defenseDelta": -0.51,
                                "vsSameHandDelta": 0.47
                            },
                            "pitchRatings": {
                                "control": 29,
                                "power": 18,
                                "movement": 38,
                                "vsSameHand": 9,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 23,
                                        "type": "Slurve"
                                    },
                                    {
                                        "rating": 14,
                                        "type": "Splitter"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Slider"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Sinker"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 18,
                                "gapPower": 13,
                                "homerunPower": 13,
                                "speed": 4,
                                "vsSameHand": 19,
                                "plateDiscipline": 17,
                                "defense": 6
                            },
                            "throws": "R",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.298Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.298Z",
                            "dateCreated": "2023-09-19T14:46:20.457Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "f1a3fa32-bb43-4d80-94da-725681ad4682",
                            "tokenId": 31,
                            "fullName": "Nathan Hills",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Taurus",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.17000000000000015,
                                "movementDelta": 0.53,
                                "powerDelta": -0.28,
                                "vsSameHandDelta": -0.64,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": -0.1
                                    },
                                    {
                                        "type": "Splitter",
                                        "ratingDelta": -0.46
                                    },
                                    {
                                        "type": "Slider",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Sinker",
                                        "ratingDelta": 0.26
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": 0.4,
                                "gapPowerDelta": 0.05,
                                "homerunPowerDelta": -0.02,
                                "plateDisciplineDelta": 0.32999999999999974,
                                "speedDelta": -0.72,
                                "defenseDelta": -0.51,
                                "vsSameHandDelta": 0.47
                            },
                            "pitchRatings": {
                                "control": 29,
                                "power": 18,
                                "movement": 38,
                                "vsSameHand": 9,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 23,
                                        "type": "Slurve"
                                    },
                                    {
                                        "rating": 14,
                                        "type": "Splitter"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Slider"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Sinker"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 18,
                                "gapPower": 13,
                                "homerunPower": 13,
                                "speed": 4,
                                "vsSameHand": 19,
                                "plateDiscipline": 17,
                                "defense": 6
                            },
                            "throws": "R",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.298Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.298Z",
                            "dateCreated": "2023-09-19T14:46:20.457Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "f1a3fa32-bb43-4d80-94da-725681ad4682",
                            "tokenId": 31,
                            "fullName": "Nathan Hills",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Taurus",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.17000000000000015,
                                "movementDelta": 0.53,
                                "powerDelta": -0.28,
                                "vsSameHandDelta": -0.64,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": -0.1
                                    },
                                    {
                                        "type": "Splitter",
                                        "ratingDelta": -0.46
                                    },
                                    {
                                        "type": "Slider",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Sinker",
                                        "ratingDelta": 0.26
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": 0.4,
                                "gapPowerDelta": 0.05,
                                "homerunPowerDelta": -0.02,
                                "plateDisciplineDelta": 0.32999999999999974,
                                "speedDelta": -0.72,
                                "defenseDelta": -0.51,
                                "vsSameHandDelta": 0.47
                            },
                            "pitchRatings": {
                                "control": 29,
                                "power": 18,
                                "movement": 38,
                                "vsSameHand": 9,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 23,
                                        "type": "Slurve"
                                    },
                                    {
                                        "rating": 14,
                                        "type": "Splitter"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Slider"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Sinker"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 18,
                                "gapPower": 13,
                                "homerunPower": 13,
                                "speed": 4,
                                "vsSameHand": 19,
                                "plateDiscipline": 17,
                                "defense": 6
                            },
                            "throws": "R",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.298Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.298Z",
                            "dateCreated": "2023-09-19T14:46:20.457Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "f1a3fa32-bb43-4d80-94da-725681ad4682",
                            "tokenId": 31,
                            "fullName": "Nathan Hills",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Taurus",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.17000000000000015,
                                "movementDelta": 0.53,
                                "powerDelta": -0.28,
                                "vsSameHandDelta": -0.64,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": -0.1
                                    },
                                    {
                                        "type": "Splitter",
                                        "ratingDelta": -0.46
                                    },
                                    {
                                        "type": "Slider",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Sinker",
                                        "ratingDelta": 0.26
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": 0.4,
                                "gapPowerDelta": 0.05,
                                "homerunPowerDelta": -0.02,
                                "plateDisciplineDelta": 0.32999999999999974,
                                "speedDelta": -0.72,
                                "defenseDelta": -0.51,
                                "vsSameHandDelta": 0.47
                            },
                            "pitchRatings": {
                                "control": 29,
                                "power": 18,
                                "movement": 38,
                                "vsSameHand": 9,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 23,
                                        "type": "Slurve"
                                    },
                                    {
                                        "rating": 14,
                                        "type": "Splitter"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Slider"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Sinker"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 18,
                                "gapPower": 13,
                                "homerunPower": 13,
                                "speed": 4,
                                "vsSameHand": 19,
                                "plateDiscipline": 17,
                                "defense": 6
                            },
                            "throws": "R",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.298Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.298Z",
                            "dateCreated": "2023-09-19T14:46:20.457Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "f1a3fa32-bb43-4d80-94da-725681ad4682",
                            "tokenId": 31,
                            "fullName": "Nathan Hills",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Taurus",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.17000000000000015,
                                "movementDelta": 0.53,
                                "powerDelta": -0.28,
                                "vsSameHandDelta": -0.64,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": -0.1
                                    },
                                    {
                                        "type": "Splitter",
                                        "ratingDelta": -0.46
                                    },
                                    {
                                        "type": "Slider",
                                        "ratingDelta": 0.26
                                    },
                                    {
                                        "type": "Sinker",
                                        "ratingDelta": 0.26
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": 0.4,
                                "gapPowerDelta": 0.05,
                                "homerunPowerDelta": -0.02,
                                "plateDisciplineDelta": 0.32999999999999974,
                                "speedDelta": -0.72,
                                "defenseDelta": -0.51,
                                "vsSameHandDelta": 0.47
                            },
                            "pitchRatings": {
                                "control": 29,
                                "power": 18,
                                "movement": 38,
                                "vsSameHand": 9,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 23,
                                        "type": "Slurve"
                                    },
                                    {
                                        "rating": 14,
                                        "type": "Splitter"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Slider"
                                    },
                                    {
                                        "rating": 32,
                                        "type": "Sinker"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 18,
                                "gapPower": 13,
                                "homerunPower": 13,
                                "speed": 4,
                                "vsSameHand": 19,
                                "plateDiscipline": 17,
                                "defense": 6
                            },
                            "throws": "R",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.298Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.298Z",
                            "dateCreated": "2023-09-19T14:46:20.457Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    }
                ],
                "lineupIds": [
                    "f1a3fa32-bb43-4d80-94da-725681ad4682",
                    "f1a3fa32-bb43-4d80-94da-725681ad4682",
                    "f1a3fa32-bb43-4d80-94da-725681ad4682",
                    "f1a3fa32-bb43-4d80-94da-725681ad4682",
                    "f1a3fa32-bb43-4d80-94da-725681ad4682",
                    "f1a3fa32-bb43-4d80-94da-725681ad4682",
                    "f1a3fa32-bb43-4d80-94da-725681ad4682",
                    "f1a3fa32-bb43-4d80-94da-725681ad4682",
                    "f1a3fa32-bb43-4d80-94da-725681ad4682"
                ],
                "currentHitterIndex": 0,
                "currentPitcherId": "f1a3fa32-bb43-4d80-94da-725681ad4682"
            },
            "home": {
                "players": [
                    {
                        "player": {
                            "_id": "3c870345-3023-4a22-8124-a8828787954a",
                            "tokenId": 40,
                            "fullName": "Jordi Kirlin",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Aquarius",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.28,
                                "movementDelta": 0.28,
                                "powerDelta": -0.43999999999999995,
                                "vsSameHandDelta": -0.52,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.28
                                    },
                                    {
                                        "type": "Screwball",
                                        "ratingDelta": -0.12
                                    },
                                    {
                                        "type": "Curveball",
                                        "ratingDelta": 0.2
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": 0.04
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": -0.3,
                                "gapPowerDelta": -0.37,
                                "homerunPowerDelta": 0.19,
                                "plateDisciplineDelta": 0.19,
                                "speedDelta": 0.32999999999999974,
                                "defenseDelta": 0.19,
                                "vsSameHandDelta": -0.23000000000000015
                            },
                            "pitchRatings": {
                                "control": 32,
                                "power": 14,
                                "movement": 32,
                                "vsSameHand": 12,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 22,
                                        "type": "Screwball"
                                    },
                                    {
                                        "rating": 30,
                                        "type": "Curveball"
                                    },
                                    {
                                        "rating": 26,
                                        "type": "Slurve"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 9,
                                "gapPower": 8,
                                "homerunPower": 15,
                                "speed": 17,
                                "vsSameHand": 10,
                                "plateDiscipline": 15,
                                "defense": 15
                            },
                            "throws": "L",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.353Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.353Z",
                            "dateCreated": "2023-09-19T14:49:28.118Z"
                        },
                        "currentPosition": "P",
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        },
                        "lineupIndex": 8
                    },
                    {
                        "player": {
                            "_id": "3c870345-3023-4a22-8124-a8828787954a",
                            "tokenId": 40,
                            "fullName": "Jordi Kirlin",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Aquarius",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.28,
                                "movementDelta": 0.28,
                                "powerDelta": -0.43999999999999995,
                                "vsSameHandDelta": -0.52,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.28
                                    },
                                    {
                                        "type": "Screwball",
                                        "ratingDelta": -0.12
                                    },
                                    {
                                        "type": "Curveball",
                                        "ratingDelta": 0.2
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": 0.04
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": -0.3,
                                "gapPowerDelta": -0.37,
                                "homerunPowerDelta": 0.19,
                                "plateDisciplineDelta": 0.19,
                                "speedDelta": 0.32999999999999974,
                                "defenseDelta": 0.19,
                                "vsSameHandDelta": -0.23000000000000015
                            },
                            "pitchRatings": {
                                "control": 32,
                                "power": 14,
                                "movement": 32,
                                "vsSameHand": 12,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 22,
                                        "type": "Screwball"
                                    },
                                    {
                                        "rating": 30,
                                        "type": "Curveball"
                                    },
                                    {
                                        "rating": 26,
                                        "type": "Slurve"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 9,
                                "gapPower": 8,
                                "homerunPower": 15,
                                "speed": 17,
                                "vsSameHand": 10,
                                "plateDiscipline": 15,
                                "defense": 15
                            },
                            "throws": "L",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.353Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.353Z",
                            "dateCreated": "2023-09-19T14:49:28.118Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "3c870345-3023-4a22-8124-a8828787954a",
                            "tokenId": 40,
                            "fullName": "Jordi Kirlin",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Aquarius",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.28,
                                "movementDelta": 0.28,
                                "powerDelta": -0.43999999999999995,
                                "vsSameHandDelta": -0.52,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.28
                                    },
                                    {
                                        "type": "Screwball",
                                        "ratingDelta": -0.12
                                    },
                                    {
                                        "type": "Curveball",
                                        "ratingDelta": 0.2
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": 0.04
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": -0.3,
                                "gapPowerDelta": -0.37,
                                "homerunPowerDelta": 0.19,
                                "plateDisciplineDelta": 0.19,
                                "speedDelta": 0.32999999999999974,
                                "defenseDelta": 0.19,
                                "vsSameHandDelta": -0.23000000000000015
                            },
                            "pitchRatings": {
                                "control": 32,
                                "power": 14,
                                "movement": 32,
                                "vsSameHand": 12,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 22,
                                        "type": "Screwball"
                                    },
                                    {
                                        "rating": 30,
                                        "type": "Curveball"
                                    },
                                    {
                                        "rating": 26,
                                        "type": "Slurve"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 9,
                                "gapPower": 8,
                                "homerunPower": 15,
                                "speed": 17,
                                "vsSameHand": 10,
                                "plateDiscipline": 15,
                                "defense": 15
                            },
                            "throws": "L",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.353Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.353Z",
                            "dateCreated": "2023-09-19T14:49:28.118Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "3c870345-3023-4a22-8124-a8828787954a",
                            "tokenId": 40,
                            "fullName": "Jordi Kirlin",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Aquarius",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.28,
                                "movementDelta": 0.28,
                                "powerDelta": -0.43999999999999995,
                                "vsSameHandDelta": -0.52,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.28
                                    },
                                    {
                                        "type": "Screwball",
                                        "ratingDelta": -0.12
                                    },
                                    {
                                        "type": "Curveball",
                                        "ratingDelta": 0.2
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": 0.04
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": -0.3,
                                "gapPowerDelta": -0.37,
                                "homerunPowerDelta": 0.19,
                                "plateDisciplineDelta": 0.19,
                                "speedDelta": 0.32999999999999974,
                                "defenseDelta": 0.19,
                                "vsSameHandDelta": -0.23000000000000015
                            },
                            "pitchRatings": {
                                "control": 32,
                                "power": 14,
                                "movement": 32,
                                "vsSameHand": 12,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 22,
                                        "type": "Screwball"
                                    },
                                    {
                                        "rating": 30,
                                        "type": "Curveball"
                                    },
                                    {
                                        "rating": 26,
                                        "type": "Slurve"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 9,
                                "gapPower": 8,
                                "homerunPower": 15,
                                "speed": 17,
                                "vsSameHand": 10,
                                "plateDiscipline": 15,
                                "defense": 15
                            },
                            "throws": "L",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.353Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.353Z",
                            "dateCreated": "2023-09-19T14:49:28.118Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "3c870345-3023-4a22-8124-a8828787954a",
                            "tokenId": 40,
                            "fullName": "Jordi Kirlin",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Aquarius",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.28,
                                "movementDelta": 0.28,
                                "powerDelta": -0.43999999999999995,
                                "vsSameHandDelta": -0.52,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.28
                                    },
                                    {
                                        "type": "Screwball",
                                        "ratingDelta": -0.12
                                    },
                                    {
                                        "type": "Curveball",
                                        "ratingDelta": 0.2
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": 0.04
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": -0.3,
                                "gapPowerDelta": -0.37,
                                "homerunPowerDelta": 0.19,
                                "plateDisciplineDelta": 0.19,
                                "speedDelta": 0.32999999999999974,
                                "defenseDelta": 0.19,
                                "vsSameHandDelta": -0.23000000000000015
                            },
                            "pitchRatings": {
                                "control": 32,
                                "power": 14,
                                "movement": 32,
                                "vsSameHand": 12,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 22,
                                        "type": "Screwball"
                                    },
                                    {
                                        "rating": 30,
                                        "type": "Curveball"
                                    },
                                    {
                                        "rating": 26,
                                        "type": "Slurve"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 9,
                                "gapPower": 8,
                                "homerunPower": 15,
                                "speed": 17,
                                "vsSameHand": 10,
                                "plateDiscipline": 15,
                                "defense": 15
                            },
                            "throws": "L",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.353Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.353Z",
                            "dateCreated": "2023-09-19T14:49:28.118Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "3c870345-3023-4a22-8124-a8828787954a",
                            "tokenId": 40,
                            "fullName": "Jordi Kirlin",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Aquarius",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.28,
                                "movementDelta": 0.28,
                                "powerDelta": -0.43999999999999995,
                                "vsSameHandDelta": -0.52,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.28
                                    },
                                    {
                                        "type": "Screwball",
                                        "ratingDelta": -0.12
                                    },
                                    {
                                        "type": "Curveball",
                                        "ratingDelta": 0.2
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": 0.04
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": -0.3,
                                "gapPowerDelta": -0.37,
                                "homerunPowerDelta": 0.19,
                                "plateDisciplineDelta": 0.19,
                                "speedDelta": 0.32999999999999974,
                                "defenseDelta": 0.19,
                                "vsSameHandDelta": -0.23000000000000015
                            },
                            "pitchRatings": {
                                "control": 32,
                                "power": 14,
                                "movement": 32,
                                "vsSameHand": 12,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 22,
                                        "type": "Screwball"
                                    },
                                    {
                                        "rating": 30,
                                        "type": "Curveball"
                                    },
                                    {
                                        "rating": 26,
                                        "type": "Slurve"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 9,
                                "gapPower": 8,
                                "homerunPower": 15,
                                "speed": 17,
                                "vsSameHand": 10,
                                "plateDiscipline": 15,
                                "defense": 15
                            },
                            "throws": "L",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.353Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.353Z",
                            "dateCreated": "2023-09-19T14:49:28.118Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "3c870345-3023-4a22-8124-a8828787954a",
                            "tokenId": 40,
                            "fullName": "Jordi Kirlin",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Aquarius",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.28,
                                "movementDelta": 0.28,
                                "powerDelta": -0.43999999999999995,
                                "vsSameHandDelta": -0.52,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.28
                                    },
                                    {
                                        "type": "Screwball",
                                        "ratingDelta": -0.12
                                    },
                                    {
                                        "type": "Curveball",
                                        "ratingDelta": 0.2
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": 0.04
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": -0.3,
                                "gapPowerDelta": -0.37,
                                "homerunPowerDelta": 0.19,
                                "plateDisciplineDelta": 0.19,
                                "speedDelta": 0.32999999999999974,
                                "defenseDelta": 0.19,
                                "vsSameHandDelta": -0.23000000000000015
                            },
                            "pitchRatings": {
                                "control": 32,
                                "power": 14,
                                "movement": 32,
                                "vsSameHand": 12,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 22,
                                        "type": "Screwball"
                                    },
                                    {
                                        "rating": 30,
                                        "type": "Curveball"
                                    },
                                    {
                                        "rating": 26,
                                        "type": "Slurve"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 9,
                                "gapPower": 8,
                                "homerunPower": 15,
                                "speed": 17,
                                "vsSameHand": 10,
                                "plateDiscipline": 15,
                                "defense": 15
                            },
                            "throws": "L",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.353Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.353Z",
                            "dateCreated": "2023-09-19T14:49:28.118Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "3c870345-3023-4a22-8124-a8828787954a",
                            "tokenId": 40,
                            "fullName": "Jordi Kirlin",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Aquarius",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.28,
                                "movementDelta": 0.28,
                                "powerDelta": -0.43999999999999995,
                                "vsSameHandDelta": -0.52,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.28
                                    },
                                    {
                                        "type": "Screwball",
                                        "ratingDelta": -0.12
                                    },
                                    {
                                        "type": "Curveball",
                                        "ratingDelta": 0.2
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": 0.04
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": -0.3,
                                "gapPowerDelta": -0.37,
                                "homerunPowerDelta": 0.19,
                                "plateDisciplineDelta": 0.19,
                                "speedDelta": 0.32999999999999974,
                                "defenseDelta": 0.19,
                                "vsSameHandDelta": -0.23000000000000015
                            },
                            "pitchRatings": {
                                "control": 32,
                                "power": 14,
                                "movement": 32,
                                "vsSameHand": 12,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 22,
                                        "type": "Screwball"
                                    },
                                    {
                                        "rating": 30,
                                        "type": "Curveball"
                                    },
                                    {
                                        "rating": 26,
                                        "type": "Slurve"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 9,
                                "gapPower": 8,
                                "homerunPower": 15,
                                "speed": 17,
                                "vsSameHand": 10,
                                "plateDiscipline": 15,
                                "defense": 15
                            },
                            "throws": "L",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.353Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.353Z",
                            "dateCreated": "2023-09-19T14:49:28.118Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    },
                    {
                        "player": {
                            "_id": "3c870345-3023-4a22-8124-a8828787954a",
                            "tokenId": 40,
                            "fullName": "Jordi Kirlin",
                            "rating": 1500,
                            "level": 1,
                            "primaryPosition": "P",
                            "age": 17,
                            "zodiacSign": "Aquarius",
                            "ownerId": "abc",
                            "pitchingProfile": {
                                "controlDelta": 0.28,
                                "movementDelta": 0.28,
                                "powerDelta": -0.43999999999999995,
                                "vsSameHandDelta": -0.52,
                                "pitches": [
                                    {
                                        "type": "Four-Seam Fastball",
                                        "ratingDelta": 0.28
                                    },
                                    {
                                        "type": "Screwball",
                                        "ratingDelta": -0.12
                                    },
                                    {
                                        "type": "Curveball",
                                        "ratingDelta": 0.2
                                    },
                                    {
                                        "type": "Slurve",
                                        "ratingDelta": 0.04
                                    }
                                ]
                            },
                            "hittingProfile": {
                                "contactDelta": -0.3,
                                "gapPowerDelta": -0.37,
                                "homerunPowerDelta": 0.19,
                                "plateDisciplineDelta": 0.19,
                                "speedDelta": 0.32999999999999974,
                                "defenseDelta": 0.19,
                                "vsSameHandDelta": -0.23000000000000015
                            },
                            "pitchRatings": {
                                "control": 32,
                                "power": 14,
                                "movement": 32,
                                "vsSameHand": 12,
                                "pitches": [
                                    {
                                        "rating": 32,
                                        "type": "Four-Seam Fastball"
                                    },
                                    {
                                        "rating": 22,
                                        "type": "Screwball"
                                    },
                                    {
                                        "rating": 30,
                                        "type": "Curveball"
                                    },
                                    {
                                        "rating": 26,
                                        "type": "Slurve"
                                    }
                                ]
                            },
                            "hittingRatings": {
                                "contact": 9,
                                "gapPower": 8,
                                "homerunPower": 15,
                                "speed": 17,
                                "vsSameHand": 10,
                                "plateDiscipline": 15,
                                "defense": 15
                            },
                            "throws": "L",
                            "hits": "R",
                            "cooldowns": {
                                "cooldownsSinceReset": 0,
                                "gamesSinceReset": 0,
                                "dateLastGamePlayed": "2023-09-19T15:05:38.353Z"
                            },
                            "lastUpdated": "2023-09-19T15:05:38.353Z",
                            "dateCreated": "2023-09-19T14:49:28.118Z"
                        },
                        "hitResult": {
                            "pa": 0,
                            "atBats": 0,
                            "hits": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "homeRuns": 0,
                            "runs": 0,
                            "rbi": 0,
                            "bb": 0,
                            "sb": 0,
                            "cs": 0,
                            "hbp": 0,
                            "so": 0,
                            "lob": 0,
                            "sacBunts": 0,
                            "sacFlys": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0,
                            "gidp": 0,
                            "po": 0,
                            "assists": 0,
                            "e": 0
                        },
                        "pitchResult": {
                            "outs": 0,
                            "er": 0,
                            "so": 0,
                            "hits": 0,
                            "bb": 0,
                            "hbp": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "strikes": 0,
                            "balls": 0,
                            "runs": 0,
                            "homeRuns": 0,
                            "games": 0,
                            "starts": 0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "bs": 0,
                            "sho": 0,
                            "cg": 0,
                            "pc": 0,
                            "battersFaced": 0,
                            "atBats": 0,
                            "pitches": 0,
                            "groundOuts": 0,
                            "flyOuts": 0,
                            "lineOuts": 0,
                            "groundBalls": 0,
                            "lineDrives": 0,
                            "flyBalls": 0
                        }
                    }
                ],
                "lineupIds": [
                    "3c870345-3023-4a22-8124-a8828787954a",
                    "3c870345-3023-4a22-8124-a8828787954a",
                    "3c870345-3023-4a22-8124-a8828787954a",
                    "3c870345-3023-4a22-8124-a8828787954a",
                    "3c870345-3023-4a22-8124-a8828787954a",
                    "3c870345-3023-4a22-8124-a8828787954a",
                    "3c870345-3023-4a22-8124-a8828787954a",
                    "3c870345-3023-4a22-8124-a8828787954a",
                    "3c870345-3023-4a22-8124-a8828787954a"
                ],
                "currentHitterIndex": 0,
                "currentPitcherId": "3c870345-3023-4a22-8124-a8828787954a"
            },
            "halfInnings": [],
            "playIndex": 0,
            "leagueAverages": {}
        })

        game.seasonId = season._id
        game.leagueId = league._id
        game.stadiumId = stadium._id

        //Act
        await repository.put(game)

        id1 = game._id

        //Read via permalinkKey
        let fetched = await repository.get(id1)

        assert.equal(fetched._id, id1)

    })


    it("should update a game", async () => {

        //Arrange
        let game:Game = await repository.get(id1)

        //Act
        await repository.put(game)

        //Assert
        let fetched = await repository.get(id1)

        assert.equal(fetched._id, id1)

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

