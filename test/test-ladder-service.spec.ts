import assert, { fail } from "assert"


import { getContainer } from "./inversify.config.js"
import { SchemaService } from "../src/service/data/schema-service.js"
import { LadderService } from "../src/service/ladder-service.js"
import { UniverseService } from "../src/service/universe-service.js"
import { SeasonService } from "../src/service/data/season-service.js"
import { Season } from "../src/dto/season.js"
import { v4 as uuidv4 } from 'uuid';
import dayjs from "dayjs"
import { Universe } from "../src/dto/universe.js"


describe('LadderService', async () => {

    let service: LadderService
    let universeService:UniverseService
    let seasonService:SeasonService
    let schemaService:SchemaService

    before('Before', async () => {
        
        let container = getContainer()
        
        service = container.get(LadderService)     
        universeService = container.get(UniverseService)  
        seasonService = container.get(SeasonService) 
        schemaService = container.get(SchemaService)
        await schemaService.load()

    })

    it('should generate a schedule', async () => {

        //Save universe to database
        let universe:Universe = new Universe()
        universe._id = uuidv4()
        universe.name = "Ethereum Baseball League"
        universe.symbol = "EBL"
        universe.diamondAddress = "abc"
        universe.adminAddress = "blah"
        universe.minterAddress = "blah"

        universe.currentDate =  dayjs("2021-01-01").toDate()

        await universeService.put(universe)

        await universeService.setupCities()


              //Generate initial league.
        let season:Season = new Season()
        season._id = uuidv4()
        season.startDate = universe.currentDate
        season.isComplete = false
        season.isInitialized = false
        
        await seasonService.put(season)

        await universeService.runLeagueGenerator(universe, season, 1, "Apex League", 4)
        await universeService.runLeagueGenerator(universe, season, 2, "The Second League", 4)

        // await service.runGameRunner(universe._id, 0)



    })

})