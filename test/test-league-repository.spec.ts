import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { LeagueRepository } from "../src/repository/league-repository.js"
import { SchemaService } from "../src/service/data/schema-service.js"

import { v4 as uuidv4 } from 'uuid';
import { League } from "../src/dto/league.js"


let id1

describe('LeagueRepository', async () => {

    let repository:LeagueRepository
    let schemaService:SchemaService

    before("", async () => {

        let container = getContainer()
        
        repository = container.get("LeagueRepository")
        schemaService = container.get(SchemaService)

        await schemaService.load()
       
    })


    it("should create & get a league", async () => {

        //Arrange
        let league:League = Object.assign(new League(), {
            _id: uuidv4(),
            name: "Bob"
        })

        //Act
        await repository.put(league)

        id1 = league._id

        //Read via permalinkKey
        let fetched = await repository.get(id1)

        assert.equal(fetched.name, "Bob")
        assert.equal(fetched._id, id1)

    })


    it("should update a league", async () => {

        //Arrange
        let league:League = await repository.get(id1)
        league.name = "Updated name"

        //Act
        await repository.put(league)

        //Assert
        let fetched = await repository.get(id1)

        assert.equal(fetched.name, "Updated name")
        assert.equal(fetched._id, id1)

    })




    after("After", async () => {
    })


})


