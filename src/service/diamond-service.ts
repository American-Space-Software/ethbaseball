import { inject, injectable } from "inversify";
import { DiamondsContract, WalletService } from "./wallet-service.js";


@injectable()
class DiamondService {

    contract

    constructor(
        @inject("WalletService") private walletService: WalletService,
        @inject("getDiamondsAddress") private diamonds: Function,
    ) { }

    public get diamondsContract() {
        if (this.contract) return this.contract
        this.contract = this.walletService.getDiamondsContract(this.diamonds())
        return this.contract

    }

    async getBalance(address: string): Promise<bigint> {
        if (!address) return BigInt('0')

        return this.diamondsContract.balanceOf(address)
    }

    async hasRole(role: string, address: string) {
        return this.diamondsContract.hasRole(role, address)
    }

    async grantRole(role: string, address: string) {
        return this.diamondsContract.grantRole(role, address)
    }


    async withdraw(to: string, mintPassId: number, amount: string, tokenId: number, expires: number, v: number, r: string, s: string) {
        return this.diamondsContract.withdraw(to, mintPassId, amount, tokenId, expires, v, r, s)
    }

    async deposit(from: string, amount: string, tokenId: number) {
        return this.diamondsContract.deposit(from, amount, tokenId)
    }

    async mint(to: string, mintPassId: number, amount: string, expires: number, v: number, r: string, s: string) {
        return this.diamondsContract.mint(to, mintPassId, amount, expires, v, r, s)
    }





}



export {
    DiamondService
}