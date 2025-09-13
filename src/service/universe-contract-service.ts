import { inject, injectable } from "inversify";
import { UniverseContract, WalletService } from "./wallet-service.js";

@injectable()
class UniverseContractService {

    contract

    constructor(
        @inject("WalletService") private walletService: WalletService,
        @inject("getUniverseAddress") private universeAddress:Function
    ) {}

    public get universeContract() {
        if (this.contract) return this.contract
        this.contract = this.walletService.getUniverseContract(this.universeAddress())
        return this.contract
    }

    // async mintDiamonds(to:string, amount:string) : Promise<void> {
    //     return this.universeContract.mintDiamonds(to, amount )
    // }

    // async burnDiamonds(from:string, amount:string) {
    //     return this.universeContract.burnDiamonds(from, amount )
    // }

    async getDiamondAddress() : Promise<string> {
        return this.universeContract.getDiamondAddress()
    }

    async getIpfsCid() : Promise<string> {
        return this.universeContract.getIpfsCid()
    }

    async getBalance(address:string) : Promise<bigint> {
        if (!address) return BigInt('0')
        return this.universeContract.balanceOf(address)
    }

    async mint(to:string, tokenId:number, ethCost:string, expires:number, v:number, r:string, s:string, options?:any) {
        return this.universeContract.mint(to,tokenId, ethCost, expires, v, r, s, options)
    }

    async mintWithDiamonds(to:string, tokenId:number, amount:string, expires:number, v:number, r:string, s:string) {
        return this.universeContract.mintWithDiamonds(to,tokenId, amount, expires, v, r, s)
    }

    async withdraw() {
        return this.universeContract.withdraw()
    }

    async update(ifpsCid:string) {
        return this.universeContract.update(ifpsCid)
    }

    async getContractBalance() {
        if (this.walletService.provider) {
            return this.walletService.provider.getBalance(this.universeAddress())
        }

    }

}



export {
    UniverseContractService
}