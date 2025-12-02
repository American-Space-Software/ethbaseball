
import { getContainer } from "./inversify.config.js"

import { SchemaService } from "../src/service/data/schema-service.js"

import { HuggingFaceService } from "../src/service/hugging-face-service.js"



let container = getContainer()
let simDate = new Date(new Date().toUTCString())


describe('HuggingFaceService', async () => {

    let service:HuggingFaceService
    let schemaService:SchemaService


    before("", async () => {
       
        service = container.get(HuggingFaceService)
        schemaService = container.get(SchemaService)

        await service.init(process.env.HUGGING_FACE_API_KEY)

        await schemaService.load()
       
    })

    // it('should generate a team name', async () => {
     
    //   try {
    //     let name = await service.generateTeamName("Pittsburgh")
      
    //     console.log(name)
    //   } catch(ex) {
    //     console.log(ex)
    //   }



    // })
  


    after("After", async () => {
    })


})



// it("should fail to create invalid author", async () => {
        
//     try {
//         await service.put(new Author())
//         assert.fail("Did not throw exception")
//     } catch(ex) {
//         assert.strictEqual(ex.errors.length, 1)
//     }

// })

// it("should fail to create valid object if it's not the right class", async () => {
    
//     try {
//         await service.put({
//             walletAddress: user0,
//             name: "Bob",
//             description: "Really is bob",
//             url: "https://bobshouse.com",
//             coverPhotoId: "6"
//         })
//         assert.fail("Did not throw exception")
//     } catch(ex) {
//         assert.strictEqual(ex.errors.length, 1)
//     }

// })

