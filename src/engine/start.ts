import { getContainer, setConfig, setDiamondsAddress, setFees, setUniverse } from "./inversify.config.js"
// import { DiscordService } from "../service/discord-service.js"

import { ProcessConfig } from "../process-config.js"

import { DeployService } from "../service/deploy-service.js"
import { DiamondService } from "../service/diamond-service.js"
import { UniverseService } from "../service/universe-service.js"
import { IPFSService } from "../service/ipfs-service.js"
import { Universe } from "../dto/universe.js"
import dayjs from "dayjs"
import { ERCIndexResult, UniverseIndexerService } from "../service/universe-indexer-service.js"
import { ContractState } from "../dto/contract-state.js"
import { ProcessedEvent, ProcessedTransaction, ProcessedTransactionToken, ProcessedTransactionTrader } from "../dto/processed-transaction.js"
import { Owner } from "../dto/owner.js"
import { MintPassIndexerService } from "../service/mint-pass-indexer-service.js"
import { SchemaService } from "../service/data/schema-service.js"


import { v4 as uuidv4 } from 'uuid';



let startEngine = async () => {

  const SIM_DATE = process.env.SIM_DATE ? dayjs(process.env.SIM_DATE).toDate() : new Date(new Date().toUTCString())
  const SECONDS_BETWEEN_INDEXES = process.env.SECONDS_BETWEEN_INDEXES ?  parseInt(process.env.SECONDS_BETWEEN_INDEXES) : 30
  const SECONDS_BETWEEN_MINT_PASS_SIGNINGS = process.env.SECONDS_BETWEEN_MINT_PASS_SIGNINGS  ? parseInt(process.env.SECONDS_BETWEEN_MINT_PASS_SIGNINGS) : 5
  const BLOCK_CONFIRMATIONS = process.env.BLOCK_CONFIRMATIONS  ? parseInt(process.env.BLOCK_CONFIRMATIONS) : 35
  
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
  let mintPassIndexerService: MintPassIndexerService = container.get(MintPassIndexerService)
  let universeIndexerService: UniverseIndexerService = container.get(UniverseIndexerService)
  let minterWalletAddress: string = container.get("minterWalletAddress")
  let adminWalletAddress:string = container.get("adminWalletAddress")
  let sequelize = container.get("sequelize")

  let s = await sequelize()

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


  //First load the universe.
  let universe: Universe

  await s.transaction(async (t1) => {
  
      let options = { transaction: t1 }

        universe = await universeService.getActive(options)

        if (!universe) {

          universe = new Universe()

          universe._id = uuidv4()
          universe.name = "Ethereum Baseball League"
          universe.symbol = "EBLD"

          universe.currentDate = SIM_DATE
          universe.adminAddress = adminWalletAddress
          universe.minterAddress = minterWalletAddress

          //Make sure we have leagues/teams, etc.
          await universeService.setup(universe, config, options)

          await universeService.put(universe, options)

        }


  })

  if (!universe) throw new Error("Unable to load or create universe.")

  console.log(`Universe loaded: ${universe._id}`)


  //If config.diamonds is passed in always use that. Also for now we assume it exists.
  if (config.diamonds) {
    universe.diamondAddress = config.diamonds
  }

  //If we still don't have an address then deploy a new contract.
  if (!universe.diamondAddress) {
    universe.diamondAddress = await deployService.deployDiamonds(adminWalletAddress, minterWalletAddress)
    console.log(`Diamonds deployed at ${universe.diamondAddress}`)

  }

  console.log(`Connecting to Diamonds: ${universe.diamondAddress}`)
  setDiamondsAddress(universe.diamondAddress)

  //Make sure the universe row has the latest for all these
  universe.adminAddress = adminWalletAddress
  universe.minterAddress = minterWalletAddress

  await universeService.put(universe)


  setConfig(config)

  setUniverse(universe)

  try {
    console.log(`Bot Diamond balance: ${await diamondService.getBalance(adminWalletAddress)}`)
  } catch(ex) {
    console.log(ex)
  }


  //Start discord bot
  // discordService.start()


  //Start a sync process. 
  await universeIndexerService.init(diamondService.diamondsContract, BLOCK_CONFIRMATIONS)
  

  const mintPassLoop = async () => {

    //Sign mint passes
    await mintPassIndexerService.processUnsignedMintPasses()

    console.log(`Mint pass loop complete...waiting...`)

    setTimeout(async () => { await mintPassLoop() }, SECONDS_BETWEEN_MINT_PASS_SIGNINGS*1000)

  }
  
  const indexerLoop = async () => {

    let indexResult:ERCIndexResult

    do {
      indexResult = await universeIndexerService.runUniverseIndexer()
    } while(indexResult.blockNumber && indexResult.blockNumber != indexResult.endBlock);


    console.log(`Indexer loop complete...waiting...`)

    setTimeout(async () => { await indexerLoop() }, SECONDS_BETWEEN_INDEXES*1000)
  }


  // const gameSummaryLoop = async () => {

  //   //Generate game summaries 
  //   let games:Game[]

  //   do {

  //     games = await gameService.getNoSummary({ limit: 25, offset: 0 })

  //     for (let game of games) {

  //         if (!game.isComplete) continue

  //         let playByPlay = gameService.getPlayByPlay(game).filter( p => p.play?.result != undefined)
        
  //         //Add metadata
  //         for (let play of playByPlay) {
  //           let metadata = gameService.getPlayMetadata(game, play.play )
  //           play.meta = metadata
  //         }

  //         let descriptions = JSON.parse(JSON.stringify(playByPlay)).reverse().map ( p => { return { description: p.descriptions.find( d => d.type == "RESULT")?.text, meta: p.meta}})

  //         let linescore = gameService.getLineScore(game)

  //         let linescoreVM = {
  //           away: {
  //             name: linescore.away.shift(),
  //             errors: linescore.away.pop(),
  //             hits: linescore.away.pop(),
  //             runs: linescore.away.pop(),
  //             innings: linescore.away
  //           },

  //           home: {
  //             name: linescore.home.shift(),
  //             errors: linescore.home.pop(),
  //             hits: linescore.home.pop(),
  //             runs: linescore.home.pop(),
  //             innings: linescore.home
  //           }
  //         }


  //         console.log(`Generating game summary for game ${game._id}`)
  //         game.summary = await chatGPTService.generateGameRecapDelta(descriptions, linescoreVM, dayjs(game.gameDate).format("YYYY-MM-DD"))
        
  //         game.changed("summary", true)

  //         await gameService.put(game)


  //     }

  //   } while(games.length < 1);


  //   console.log(`Game summary loop complete...waiting...`)

  //   setTimeout(async () => { await gameSummaryLoop() }, SECONDS_BETWEEN_INDEXES*1000)

  // }


  const startupTasks = async () => {

    //Make sure that players have percentile ratings. 
    // await playerService.updateAllPercentileRatings()

    // console.log(`Updated player percentile ratings`)

    //Make sure owner off-chain balances are up to date
    // await ownerService.syncOffChainBalances()

    // console.log(`Sync offchain diamond balances`)

  }

  
  await startupTasks()
  // await gameSummaryLoop()
  await indexerLoop()
  await mintPassLoop()

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