import { inject, injectable } from "inversify"
import { getAddress, Contract, ethers } from "ethers"
import { UniverseWebService } from "../web/service/universe-web-service.js"


@injectable()
class WalletServiceImpl implements WalletService {

  public initialized = false
  public connected = false

  public wallet: any
  public address: any
  public ethersContracts:any = {}

  public currentNetwork
  public correctNetwork = false

  public provider 

  constructor(
    @inject("contracts") private contracts:Function,
    @inject("provider") private getProvider:Function,
    @inject("eventTarget") private eventTarget:EventTarget,
    @inject("env") private env:any
  ) {}

  async initProvider() {

    this.provider = await this.getProvider()

    if (this.provider) {
      this.currentNetwork = await this.provider.getNetwork()
    }

    //Are we connected to the right network?
    this.correctNetwork = false

    if (this.currentNetwork) {

      if (BigInt(this.env().PROVIDER_CHAIN_ID) == this.currentNetwork.chainId) {
        this.correctNetwork = true
      }

    }

    globalThis.ethereum?.on('chainChanged', (newNetwork, oldNetwork) => {
      window.location.reload()
    })

    this.initialized = true

  }

  async switchNetwork() {

    // let chainId = ethers.hexlify(env.PROVIDER_CHAIN_ID)
    let chainId = `0x${Number(this.env().PROVIDER_CHAIN_ID).toString(16)}`


    //First just try switching to the right network.
    try {


      await this.provider.send("wallet_switchEthereumChain", [{ chainId: chainId }])

    } catch(ex) {

      if (ex.error.code == 4902) {

        //Add the network.
        await this.provider.send("wallet_addEthereumChain", [{
          chainId:chainId,
          chainName: this.env().PROVIDER_CHAIN_NAME,
          nativeCurrency: {
            name: "ETH",
            symbol: "ETH",
            decimals: 18
          },
          rpcUrls: [this.env().PROVIDER_CHAIN_RPC_URL],
          blockExplorerUrls: [this.env().PROVIDER_CHAIN_BLOCK_EXPLORER]
        }])


      }


    }







  }

  async initWallet() {

    if (this.initialized) return

    this.initialized = true

    console.log('Init wallet')

    delete this.address

    if (!this.provider) {
      await this.initProvider()
    }
    
    //@ts-ignore
    let accounts = await this.provider.send("eth_accounts", [])

    if (accounts?.length > 0) {
      // this.address = accounts[0]
      return this.connect()
    }
    
    console.log("Init wallet complete") 

  }

  async connect() {
    
    console.log("Connect wallet")

    await this.provider.send("eth_requestAccounts", []);

    this.wallet = await this.provider.getSigner()
    this.address = await this.getAddress()
    
    this.eventTarget.dispatchEvent(new CustomEvent('connect', { 
      detail: { 
        address: this.address 
      }  
    }))


    console.log(`Wallet ${this.address} connected`) 

  }

  async getAddress() {

      if (!this.provider) return

      let accounts = await this.provider.send("eth_accounts", []);

      if (accounts?.length > 0) {
        return accounts[0] 
      }

  }

  async getWallet() {
    return this.provider.getSigner()
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

interface WalletService {
  correctNetwork:boolean
  wallet
  address:string
  provider:any
  getWallet() : Promise<any>
  getAddress() : Promise<string>
  truncateEthAddress(address) : string
  getUniverseContract(address:string) : UniverseContract
  getDiamondsContract(address:string) : DiamondsContract
  connect()
  initProvider()
  switchNetwork()
}



interface UniverseContract {
  mint(to:string, tokenId:number, ethCost:string, expires:number, v:number, r:string, s:string, options?:any) : Promise<any>
  mintWithDiamonds(to:string, tokenId:number, amount:string, expires:number, v:number, r:string, s:string, options?:any) : Promise<any>
  ownerOf(tokenId:number)  : Promise<string>
  tokenURI(tokenId:number)  : Promise<string>
  balanceOf(address) : Promise<bigint>
  getDiamondAddress() : Promise<string>
  getIpfsCid() : Promise<string>
  totalMinted() : Promise<bigint>
  totalSupply() : Promise<bigint>
  owner() : Promise<string>
  update(ipfsCid:string, mintFee:bigint): Promise<any>
  withdraw()
  address:string
  on(filter, listener): Promise<any>
  queryFilter(event, fromBlock, toBlock): Promise<any>
}



interface DiamondsContract {
  balanceOf(address:string) : Promise<bigint>
  grantRole(role:string, address:string): Promise<any>
  hasRole(role:string, address:string): Promise<boolean>
  withdraw(to:string, mintPassId:number, amount:string, tokenId:number, expires:number, v:number, r:string, s:string) : Promise<any>
  deposit(from:string, amount:bigint, teamId:number) : Promise<any>
}

export {
  WalletServiceImpl, WalletService, UniverseContract, DiamondsContract
}


