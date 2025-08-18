import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { TeamRepository } from "../src/repository/team-repository.js"
import { SchemaService } from "../src/service/schema-service.js"

import { v4 as uuidv4 } from 'uuid';
import { Team } from "../src/dto/team.js"
import { League } from "../src/dto/league.js";
import { LeagueService } from "../src/service/league-service.js";


let id1

describe('TeamRepository', async () => {

    let repository:TeamRepository
    let leagueService:LeagueService
    let schemaService:SchemaService

    before("", async () => {

        let container = getContainer()
        
        repository = container.get("TeamRepository")
        leagueService = container.get(LeagueService)
        schemaService = container.get(SchemaService)

        await schemaService.load()
       
    })


    it("should create & get a team", async () => {

        let league:League = new League()
        await leagueService.put(league)

        //Arrange
        let franchise:Team = Object.assign(new Team(), {
            _id: uuidv4(),
            name: "Bob",
            ownerId: "xyz",
            rating: { rating: 1500 },
            isGhost: false,
            leagueId: league._id,
            overallRecord: {
                wins: 0,
                losses: 0
            },
            finances: {},
            colors: {},
            diamondBalance: "0",
            longTermRating: 1500,
            seasonRating: 1500,
            tokenId: 1
        })

        //Act
        await repository.put(franchise)

        id1 = franchise._id

        //Read via permalinkKey
        let fetched = await repository.get(id1)

        assert.equal(fetched.name, "Bob")
        assert.equal(fetched._id, id1)

    })


    it("should update a franchise", async () => {

        //Arrange
        let team:Team = await repository.get(id1)
        team.name = "Updated name"

        //Act
        await repository.put(team)

        //Assert
        let fetched = await repository.get(id1)

        assert.equal(fetched.name, "Updated name")
        assert.equal(fetched._id, id1)

    })




    after("After", async () => {
    })


})

