import { Wallet, ethers } from "ethers"
import { inject, injectable } from "inversify"
import { Universe } from "../dto/universe.js"
import { UniverseService } from "./universe-service.js"
import { WalletService } from "./wallet-service.js"
import { UniverseContractService } from "./universe-contract-service.js"


@injectable()
class DeployService {

    constructor(
        @inject("WalletService") private walletService: WalletService,
        private universeContractService:UniverseContractService,
        @inject("contracts") private contracts,
    ) { }

    async deployUniverse(defaultAdminAddress:string, minterAddress:string, ipfsCid:string) {

        let receipt = await this._deployUniverse(defaultAdminAddress, minterAddress, ipfsCid)

        //Update address locally
        return receipt.contractAddress
        
    }

    async deployDiamonds(universeAddress:string, defaultAdminAddress:string, minterAddress:string) {

        //Deploy contract
        let receipt = await this._deployDiamonds(universeAddress, defaultAdminAddress, minterAddress)

        //Update address locally
        return receipt.contractAddress
        
    }


    async updateContract(universe:Universe) {

        if (!universe.ipfsCid) {
            throw new Error("Not published to IPFS")
        }
    
        //Deploy contract        
        await this.update(universe.ipfsCid)


    }



    private async _deployUniverse(defaultAdminAddress:string, minterAddress:string, ipfsCid:string) {

        let wallet = this.walletService.wallet
        if (!wallet) throw new Error("No wallet!")

        const c = this.contracts['Universe']

        const factory = new ethers.ContractFactory(c.abi, c.bytecode, wallet)
        
        let contract = await factory.deploy( defaultAdminAddress, minterAddress, ipfsCid )
        
        return contract.deploymentTransaction().wait()
    }
    
    private async _deployDiamonds(universeAddress:string, defaultAdminAddress: string, minterAddress:string) {

        if (!defaultAdminAddress ) throw new Error("Missing inputs to deploy")

        let wallet = this.walletService.wallet
        if (!wallet) throw new Error("No wallet!")

        const c = this.contracts['Diamonds']

        const factory = new ethers.ContractFactory(c.abi, c.bytecode, wallet)
        
        let contract = await factory.deploy( universeAddress, defaultAdminAddress, minterAddress )
        
        return contract.deploymentTransaction().wait()
    }
    



    private async update(ipfsCid: string) {

        if (!ipfsCid) throw new Error("Missing inputs to deploy")

        let wallet = this.walletService.wallet
        if (!wallet) throw new Error("No wallet!")

        let contract = await this.universeContractService.universeContract

        await contract.update(ipfsCid)


    }



}



export {
    DeployService
}