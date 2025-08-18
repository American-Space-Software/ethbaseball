import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { SchemaService } from "../src/service/schema-service.js"

import { v4 as uuidv4 } from 'uuid';
import { GameTransactionRepository } from "../src/repository/game-transaction-repository.js";
import { GameTransaction } from "../src/dto/game-transaction.js";
import { Season } from "../src/dto/season.js";
import { SeasonService } from "../src/service/season-service.js";


let id1

describe('GameTransactionRepository', async () => {

    let repository:GameTransactionRepository
    let schemaService:SchemaService
    let seasonService:SeasonService

    
    let season:Season
    before("", async () => {

        let container = getContainer()
        
        repository = container.get("GameTransactionRepository")
        schemaService = container.get(SchemaService)
        seasonService = container.get(SeasonService)

        await schemaService.load()

        season = new Season()
        season._id = uuidv4()
        season.startDate = new Date()
        await seasonService.put(season)

    })


    it("should create & get a game transaction", async () => {

        //Arrange
        let gt:GameTransaction = new GameTransaction()
        gt._id = uuidv4()
        gt.seasonId = season._id
        gt.isFinalized = true
        gt.date = new Date()
        gt.events = [{ 
            team: { _id: "abc", tokenId: 1 },
            signing: {
                isWaiver: false, 
                playerId: "abc",
                contract: { isRookie: false, years: [] }
            }
        }]

        gt.links = {
            teamTokenIds: [],
            playerTokenIds: [],
            leagueRanks: []
        }


        //Act
        await repository.put(gt)

        id1 = gt._id

        //Read via permalinkKey
        let fetched = await repository.get(id1)

        assert.equal(fetched.events[0].team._id, "abc")
        assert.equal(fetched._id, id1)

    })



    after("After", async () => {
    })


})


