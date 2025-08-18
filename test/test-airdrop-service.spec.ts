import assert, { fail } from "assert"


import { getContainer } from "./inversify.config.js"

import { AirdropService } from "../src/service/airdrop-service.js"


describe('AirdropService', async () => {

    let service: AirdropService

    before('Before', async () => {
        
        let container = getContainer()
        
        service = container.get(AirdropService)     

    })

    // it('should get a list of owners of baseball projects on Ethereum', async () => {

    //     let res = await service.getAirdropList(BigInt(50000))

    //     console.log(res)


    // })

})