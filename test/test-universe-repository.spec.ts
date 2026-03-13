import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { UniverseRepository } from "../src/repository/universe-repository.js"
import { SchemaService } from "../src/service/data/schema-service.js"

import { Universe } from "../src/dto/universe.js"



describe('UniverseRepository', async () => {

    let repository:UniverseRepository
    let schemaService:SchemaService

    before("", async () => {

        let container = getContainer()
        
        repository = container.get("UniverseRepository")
        schemaService = container.get(SchemaService)

        await schemaService.load()
       
    })


    it("should create & get a universe", async () => {

        //Arrange
        let universe:Universe = new Universe()

        universe._id = "xyz"
        universe.name = "blah"
        universe.symbol = "BLAH"
        universe.minterAddress = "asdfsdf"
        universe.diamondAddress = "eee"
        universe.adminAddress = "asdf"

        //Act
        await repository.put(universe)

        //Read via permalinkKey
        let fetched = await repository.get("xyz")

        assert.equal(fetched._id, "xyz")

    })


    it("should update a universe", async () => {

        //Arrange
        let universe:Universe = await repository.get("xyz")
        universe._id = "xyz"

        //Act
        await repository.put(universe)

        //Assert
        let fetched = await repository.get("xyz")

        assert.equal(fetched._id, "xyz")

    })

    after("After", async () => {
    })


})

