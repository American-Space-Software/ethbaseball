
import { getContainer } from "./inversify.config.js"

import { SchemaService } from "../src/service/data/schema-service.js"

import assert from "assert"

import { ConnectService } from "../src/service/connect-service.js"
import { WalletService } from "../src/service/wallet-service.js"
import { SignatureTokenService } from "../src/service/data/signature-token-service.js"

import { Wallet } from "ethers"
import { OwnerService } from "../src/service/data/owner-service.js"
import { UserService } from "../src/service/data/user-service.js"
import { v4 as uuidv4 } from 'uuid';
import { User } from "../src/dto/user.js"

let container = getContainer()

describe('ConnectService', async () => {

    let service: ConnectService
    let walletService:WalletService
    let ownerService:OwnerService
    let signatureTokenService:SignatureTokenService
    let userService:UserService

    let schemaService: SchemaService

    before("", async () => {

        schemaService = container.get(SchemaService)
        service = container.get(ConnectService)
        walletService = container.get("WalletService")
        ownerService = container.get(OwnerService)
        signatureTokenService = container.get(SignatureTokenService)
        userService = container.get(UserService)

        await schemaService.load()

    })

    it("should fail to connect Discord with invalid signature", async () => {

        try {
            await service.connectAddressToUser("xyz", "abc", "123")
            assert.fail("Did not throw exception")
        } catch(ex) {
            assert.strictEqual(ex.message.indexOf("invalid BytesLike value") > -1, true)
        }

    })

    it("should connect discord to owner", async () => {

        // let connectLink:ConnectLink = await service.createConnectLink("xyz", "bill")

        let wallet = Wallet.createRandom()

        try {

            let user = new User()
            user._id = uuidv4()
            await userService.put(user)

            let signatureToken = await signatureTokenService.getOrCreate(wallet.address)

            let address = await service.connectAddressToUser(user._id, `@ ${signatureToken.token}`, await wallet.signMessage(`@ ${signatureToken.token}`))
            assert.strictEqual(address,  wallet.address)
        } catch(ex) {
            assert.fail(ex)
        }

    })

    // it("should update owner's discord id", async () => {

    //     // let connectLink:ConnectLink = await service.createConnectLink("abc", "bill")

    //     let wallet = Wallet.createRandom()

    //     let owner:Owner = await service.connectAddressToUser("abc", "themessage", await wallet.signMessage("themessage"))
    //     let owner2:Owner = await service.connectAddressToUser("def", "themessage", await wallet.signMessage("themessage"))

    //     let fetchOwner = await ownerService.get(wallet.address)
    //     assert.strictEqual(fetchOwner.userId, "def")

    // })



    // it("should disconnect discord from owner", async () => {

    //     let wallet = Wallet.createRandom()

    //     let owner:Owner = await service.connectUserToOwner("abc", "themessage", await wallet.signMessage("themessage"))

    //     await service.removeUserId(owner)

    //     let updated:Owner = await ownerService.get(wallet.address)

    //     assert.strictEqual(updated.userId, null) //null? weird right?


    // })
    



    after("After", async () => {
    })


})

