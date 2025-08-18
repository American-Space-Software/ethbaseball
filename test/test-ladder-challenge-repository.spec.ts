// import assert from "assert"

// import { getContainer } from "./inversify.config.js"

// import { LeagueRepository } from "../src/repository/league-repository.js"
// import { SchemaService } from "../src/service/schema-service.js"

// import { v4 as uuidv4 } from 'uuid';
// import { League } from "../src/dto/league.js"
// import { LadderChallengeRepository } from "../src/repository/ladder-challenge-repository.js";
// import { LadderChallenge } from "../src/dto/ladder-challenge.js";
// import { CityService } from "../src/service/city-service.js";
// import { City } from "../src/dto/city.js";
// import { Team } from "../src/dto/team.js";
// import { TeamService } from "../src/service/team-service.js";
// import { GameService } from "../src/service/game-service.js";
// import { Game } from "../src/dto/game.js";


// let id1

// describe('LadderChallengeRepository', async () => {

//     let repository:LadderChallengeRepository
//     let schemaService:SchemaService
//     let cityService:CityService
//     let teamService:TeamService
//     let gameService:GameService
    

//     let fromTeam
//     let toTeam 

//     let game

//     before("", async () => {

//         let container = getContainer()
        
//         repository = container.get("LadderChallengeRepository")
//         schemaService = container.get(SchemaService)
//         cityService = container.get(CityService)
//         teamService = container.get(TeamService)
//         gameService = container.get(GameService)

//         await schemaService.load()

//         let city = new City()
//         city.name = "Blah"
//         city.state = "PA"
//         city.population = 3
//         await cityService.put(city)

//         fromTeam = new Team()
//         fromTeam.ownerId = "xyz"
//         fromTeam.cityId = city._id
//         fromTeam.name = "Team1"
//         fromTeam.rating = { rating: 1500, ratingDeviation: 0, volatility: 0 }

//         toTeam = new Team()
//         toTeam.ownerId = "xyz"
//         toTeam.cityId = city._id
//         toTeam.name = "Team2"
//         toTeam.rating = { rating: 1500, ratingDeviation: 0, volatility: 0 }


//         await teamService.put(toTeam)
//         await teamService.put(fromTeam)



//     })


//     it("should create & get a ladder challenge", async () => {


//         //Arrange
//         let lc:LadderChallenge = new LadderChallenge()

//         lc._id = uuidv4()
//         lc.toId = toTeam._id
//         lc.fromId = fromTeam._id
        

//         //Act
//         await repository.put(lc)

//         id1 = lc._id

//         //Read via permalinkKey
//         let fetched = await repository.get(id1)

//         assert.equal(fetched._id, id1)

//     })



//     after("After", async () => {
//     })


// })


