import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { StadiumRepository } from "../src/repository/stadium-repository.js"
import { SchemaService } from "../src/service/data/schema-service.js"

import { Stadium } from "../src/dto/stadium.js"


let id1

describe('StadiumRepository', async () => {

    let repository:StadiumRepository
    let schemaService:SchemaService

    before("", async () => {

        let container = getContainer()
        
        repository = container.get("StadiumRepository")
        schemaService = container.get(SchemaService)

        await schemaService.load()
       
    })


    it("should create & get a Stadium", async () => {

        //Arrange
        let stadium:Stadium = Object.assign(new Stadium(), {
            _id: 1,
            name: "Bob",
            capacity: 40
        })

        //Act
        await repository.put(stadium)

        id1 = stadium._id

        //Read via permalinkKey
        let fetched = await repository.get(id1)

        assert.equal(fetched.name, "Bob")
        assert.equal(fetched._id, id1)

    })


    it("should update a stadium", async () => {

        //Arrange
        let stadium:Stadium = await repository.get(id1)
        stadium.name = "Updated name"

        //Act
        await repository.put(stadium)

        //Assert
        let fetched = await repository.get(id1)

        assert.equal(fetched.name, "Updated name")
        assert.equal(fetched._id, id1)

    })




    after("After", async () => {
    })


})


