import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { SchemaService } from "../src/service/data/schema-service.js"


import { ConnectLinkRepository } from "../src/repository/connect-link-repository.js"
import { ConnectLink } from "../src/dto/connect-link.js"

let container = getContainer()

let id1

describe('ConnectLinkRepository', async () => {

    let repository:ConnectLinkRepository
    let schemaService:SchemaService


    before("", async () => {
        
        repository = container.get("ConnectLinkRepository")
        schemaService = container.get(SchemaService)

        await schemaService.load()
       
    })


    it("should create & get a connect link", async () => {

        //Arrange
        let connectLink:ConnectLink = new ConnectLink()

        connectLink.discordId = "blah"
        connectLink.discordUsername = "blahs2"

        //Act
        await repository.put(connectLink)

        id1 = connectLink._id

        //Read via permalinkKey
        let fetched = await repository.get(id1)

        assert.equal(fetched._id, id1)

    })

    it("should get by discord id", async () => {
            
        //Read via permalinkKey
        let fetched = await repository.getByDiscordId("blah")
        assert.equal(fetched[0]._id, id1)
    })


    it("should delete a connect link", async () => {
            
        //Read via permalinkKey
        let fetched = await repository.get(id1)
        assert.equal(fetched._id, id1)

        await repository.delete(fetched)

        let fetched2 = await repository.get(id1)
        assert.equal(fetched2, undefined)

    })


    after("After", async () => {
    })


})

