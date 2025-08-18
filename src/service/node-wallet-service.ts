import { inject, injectable } from "inversify"
import { getAddress, Contract, ethers, Wallet, Provider } from "ethers"
import { DiamondsContract, UniverseContract, WalletService } from "./wallet-service.js"


@injectable()
class NodeWalletServiceImpl implements WalletService {

  public address: any

  constructor(
    @inject("contracts") private contracts:Function,
    @inject("provider") public provider,
    @inject("wallet") public wallet:Wallet
  ) {}
  correctNetwork: boolean
  initProvider() {
    throw new Error("Method not implemented.")
  }
  switchNetwork() {
    throw new Error("Method not implemented.")
  }
  
  connect() {
    throw new Error("Method not implemented.")
  }

  async getAddress() {
      if (!this.provider) return
      return this.wallet.address
  }

  async getWallet() {
    return this.wallet
  }

  getUniverseContract(address:string) : UniverseContract {

    //Initialize and return
    let c = this.contracts["Universe"]
    return new ethers.Contract(address, c.abi, this.wallet) as unknown as UniverseContract

  }

  getDiamondsContract(address:string) : DiamondsContract  {

    //Initialize and return
    let c = this.contracts["Diamonds"]
    return new ethers.Contract(address, c.abi, this.wallet) as unknown as DiamondsContract

  }

  truncateEthAddress(address) : string {
    if (!address) return
    // Captures 0x + 4 characters, then the last 4 characters.
    const truncateRegex = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/
    const match = address.match(truncateRegex)
    if (!match) return address
    return `${match[1]}…${match[2]}`
  }

}





export {
  NodeWalletServiceImpl
}

