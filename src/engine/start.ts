import { getContainer, setConfig, setDiamondsAddress, setFees, setUniverse, setUniverseAddress } from "./inversify.config.js"
// import { DiscordService } from "../service/discord-service.js"

import { ProcessConfig } from "../process-config.js"

import { DeployService } from "../service/deploy-service.js"
import { DiamondService } from "../service/diamond-service.js"
import { UniverseService } from "../service/universe-service.js"
import { IPFSService } from "../service/ipfs-service.js"
import { Universe } from "../dto/universe.js"
import { LadderService } from "../service/ladder-service.js"
import dayjs from "dayjs"
import { UniverseIndexerService } from "../service/universe-indexer-service.js"
import { UniverseContractService } from "../service/universe-contract-service.js"
import { HuggingFaceService } from "../service/hugging-face-service.js"
import { ContractState } from "../dto/contract-state.js"
import { ProcessedEvent, ProcessedTransaction, ProcessedTransactionToken, ProcessedTransactionTrader } from "../dto/processed-transaction.js"
import { Owner } from "../dto/owner.js"
import { MintPassIndexerService } from "../service/mint-pass-indexer-service.js"
import { SchemaService } from "../service/schema-service.js"



let startEngine = async () => {

  const SIM_DATE = process.env.SIM_DATE ? dayjs(process.env.SIM_DATE).toDate() : new Date(new Date().toUTCString())
  const SECONDS_BETWEEN_SIMS = process.env.SECONDS_BETWEEN_SIMS ?  parseInt(process.env.SECONDS_BETWEEN_SIMS) : 60
  const SECONDS_BETWEEN_INDEXES = process.env.SECONDS_BETWEEN_INDEXES ?  parseInt(process.env.SECONDS_BETWEEN_INDEXES) : 30

  const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY
  
  //@ts-ignore
  const version = VERSION

  console.log(`
*******************************************
* EBL engine starting ${version}              *
* *****************************************
`)

  let config = await ProcessConfig.getConfig()

  let container = await getContainer()
 
  let schemaService: SchemaService = container.get(SchemaService)
  let deployService: DeployService = container.get(DeployService)
  let diamondService: DiamondService = container.get(DiamondService)
  let universeService: UniverseService = container.get(UniverseService)
  let universeContractService: UniverseContractService = container.get(UniverseContractService)
  let huggingFaceService: HuggingFaceService = container.get(HuggingFaceService)
  let mintPassIndexerService: MintPassIndexerService = container.get(MintPassIndexerService)

  let universeIndexerService: UniverseIndexerService = container.get(UniverseIndexerService)
  let ladderService: LadderService = container.get(LadderService)

  let ipfsService: IPFSService = container.get(IPFSService)

  let minterWalletAddress: string = container.get("minterWalletAddress")
  let adminWalletAddress:string = container.get("adminWalletAddress")

  // //Start and load schema
  // let discordService = container.get(DiscordService)
  // await discordService.init(config.web)

  await schemaService.load()

  console.log(`Loaded admin wallet ${adminWalletAddress} with minter wallet ${minterWalletAddress}`)
  
  if (config.clear) {

    console.time('Clearing processed transaction data...')

    ContractState.destroy({ where: {} })

    ProcessedTransactionToken.destroy({ where: {}})
    ProcessedTransactionTrader.destroy({ where: {} })
    ProcessedEvent.destroy({ where: {} })
    ProcessedTransaction.destroy({ where: {} })

    Owner.destroy({ where: {} })



    console.timeEnd('Clearing processed transaction data...')

  }

  const setupUniverse = async (configuredUniverse?:string) => {

    let universe: Universe

    let s = await container.get("sequelize")()
    await s.transaction(async (t1) => {
    
        let options = { transaction: t1 }

        await ipfsService.init()
    
        universe = new Universe()
        universe.currentDate = SIM_DATE

    
        //Make sure we have leagues/teams, etc.
        await universeService.setup(universe, config, options)
    

        if (configuredUniverse) {

          setUniverseAddress(config.universe)

          //We're connecting to a pre-existing universe so grab the IPFS cid from the contract.
          universe.ipfsCid = await universeContractService.getIpfsCid()

        } else {
          
          let cid = await universeService.syncMetadata(universe, config, options)
    
          universe.ipfsCid = cid.toString()
    
          config.universe = await deployService.deployUniverse(adminWalletAddress, minterWalletAddress, universe.ipfsCid)
          
          setUniverseAddress(config.universe)
          console.log(`Universe deployed: ${config.universe}`)
      
          config.diamonds = await universeContractService.getDiamondAddress()
          console.log(`Diamonds deployed: ${config.diamonds}`)

        }
    
        
    
        config.diamonds = await universeContractService.getDiamondAddress()
        setDiamondsAddress(config.diamonds)
            
        //Save universe to database
        universe._id = config.universe
        universe.name = "Ethereum Baseball League"
        universe.symbol = "EBL"
        universe.contractAddress = config.universe
        universe.diamondAddress = config.diamonds
        universe.adminAddress = adminWalletAddress
        universe.minterAddress = minterWalletAddress
    
        await universeService.put(universe, options)

    })

    return universe
    
  }

  if (!config.universe) {

    try {
      await setupUniverse()
    } catch (ex) {
      console.log(ex)
    }

  }

  let universe: Universe = await universeService.get(config.universe)

  if (!universe) {
    //Not deploying contract. Just insert universe info.
    universe = await setupUniverse(config.universe)
  }


  console.log(`Connecting to Diamonds: ${universe.diamondAddress}`)
  setDiamondsAddress(universe.diamondAddress)

  console.log(`Universe loaded: ${universe._id}`)


  console.log(`Connecting to Universe: ${config.universe}`)
  setUniverseAddress(config.universe)

  setConfig(config)

  setUniverse(universe)

  try {
    console.log(`Bot Diamond balance: ${await diamondService.getBalance(adminWalletAddress)}`)
  } catch(ex) {
    console.log(ex)
  }


  huggingFaceService.init(HUGGING_FACE_API_KEY)





  //Start discord bot
  // discordService.start()


  //Start a sync process. 
  await universeIndexerService.init(universeContractService.universeContract, diamondService.diamondsContract)
  
  
  const indexerLoop = async () => {

    //Process on-chain transactions
    await universeIndexerService.runUniverseIndexer()

    //Sign mint passes
    await mintPassIndexerService.processUnsignedMintPasses()

    console.log(`Indexer loop complete...waiting...`)

    setTimeout(async () => { await indexerLoop() }, SECONDS_BETWEEN_INDEXES*1000)
  }

  const gameLoop = async () => {

    //Simulate games 
    await ladderService.runGameRunner(universe._id)

    console.log(`Game loop complete...waiting...`)

    setTimeout(async () => { await gameLoop() }, SECONDS_BETWEEN_SIMS*1000)
  }

  
  await indexerLoop()
  await gameLoop()



  console.log(`
    *******************************************
    * EBL engine started ${version}             *
    * *****************************************`)

}


let createCar = async () => {

  let config = await ProcessConfig.getConfig()

  let container = await getContainer()

  
  let universeService: UniverseService = container.get(UniverseService)
  let schemaService: SchemaService = container.get(SchemaService)
  let ipfsService:IPFSService = container.get(IPFSService)

  await schemaService.load()
  await ipfsService.init()


  let universe:Universe = await universeService.get(config.universe)

  let cid = await universeService.syncMetadata(universe, config)

  console.log(cid)

}


export {
    startEngine, createCar
}