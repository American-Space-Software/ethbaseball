import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { SeedRepository } from "../src/repository/seed-repository.js"
import { SchemaService } from "../src/service/schema-service.js"

import { Seed } from "../src/dto/seed.js"



describe('SeedRepository', async () => {

    let repository:SeedRepository
    let schemaService:SchemaService

    before("", async () => {

        let container = getContainer()
        
        repository = container.get("SeedRepository")
        schemaService = container.get(SchemaService)

        await schemaService.load()
       
    })


    it("should create & get a Seed", async () => {

        //Arrange
        let seed:Seed = new Seed()

        seed._id = "xyz"
        seed.seed = 4

        //Act
        await repository.put(seed)

        //Read via permalinkKey
        let fetched = await repository.get("xyz")

        assert.equal(fetched._id, "xyz")

    })


    it("should update a Seed", async () => {

        //Arrange
        let seed:Seed = await repository.get("xyz")
        seed._id = "xyz"

        //Act
        await repository.put(seed)

        //Assert
        let fetched = await repository.get("xyz")

        assert.equal(fetched._id, "xyz")

    })




    after("After", async () => {
    })


})

