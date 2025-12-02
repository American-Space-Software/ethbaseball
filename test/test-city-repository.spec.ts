import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { CityRepository } from "../src/repository/city-repository.js"
import { SchemaService } from "../src/service/data/schema-service.js"

import { v4 as uuidv4 } from 'uuid';
import { City } from "../src/dto/city.js"


let id1

describe('CityRepository', async () => {

    let repository:CityRepository
    let schemaService:SchemaService

    before("", async () => {

        let container = getContainer()
        
        repository = container.get("CityRepository")
        schemaService = container.get(SchemaService)

        await schemaService.load()
       
    })


    it("should create & get a city", async () => {

        //Arrange
        let city:City = Object.assign(new City(), {
            _id: uuidv4(),
            name: "Bob",
            state: "PA",
            population: 2
        })

        //Act
        await repository.put(city)

        id1 = city._id

        //Read via permalinkKey
        let fetched = await repository.get(id1)

        assert.equal(fetched.name, "Bob")
        assert.equal(fetched._id, id1)

    })


    it("should update a city", async () => {

        //Arrange
        let city:City = await repository.get(id1)
        city.name = "Updated name"

        //Act
        await repository.put(city)

        //Assert
        let fetched = await repository.get(id1)

        assert.equal(fetched.name, "Updated name")
        assert.equal(fetched._id, id1)

    })




    after("After", async () => {
    })


})


