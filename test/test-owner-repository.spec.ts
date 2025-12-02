import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { OwnerRepository } from "../src/repository/owner-repository.js"
import { SchemaService } from "../src/service/data/schema-service.js"

import { Owner } from "../src/dto/owner.js"



describe('OwnerRepository', async () => {

    let repository:OwnerRepository
    let schemaService:SchemaService

    before("", async () => {

        let container = getContainer()
        
        repository = container.get("OwnerRepository")
        schemaService = container.get(SchemaService)

        await schemaService.load()
       
    })


    it("should create & get an owner", async () => {

        //Arrange
        let owner:Owner = new Owner()

        owner._id = "xyz"
        owner.diamondBalance = "0"
        owner.diamondBalanceDecimal = 0
        owner.offChainDiamondBalance = "0"
        owner.offChainDiamondBalanceDecimal = 0

        //Act
        await repository.put(owner)

        //Read via permalinkKey
        let fetched = await repository.get("xyz")

        assert.equal(fetched._id, "xyz")

    })


    it("should update an owner", async () => {

        //Arrange
        let owner:Owner = await repository.get("xyz")
        owner._id = "xyz"

        //Act
        await repository.put(owner)

        //Assert
        let fetched = await repository.get("xyz")

        assert.equal(fetched._id, "xyz")

    })

    // it("should get an owner by discord id ", async () => {

    //     //Arrange
    //     let owner:Owner = new Owner()

    //     owner._id = "yza"
    //     owner.userId = "blah"

    //     //Act
    //     await repository.put(owner)

    //     //Read via permalinkKey
    //     let fetched = await repository.getByUserId("blah")

    //     assert.equal(fetched._id, "yza")

    // })


    // it("should fail to get owner by invalid discord id ", async () => {

    //     //Read via permalinkKey
    //     let fetched = await repository.getByUserId("dddd")

    //     assert.equal(fetched, undefined)

    // })




    after("After", async () => {
    })


})

