// import "core-js/stable"
import "regenerator-runtime/runtime"
import "reflect-metadata"

import fs from "fs"
import seedrandom from "seedrandom"
import glicko2 from "glicko2"

import { Container } from "inversify";


import { Network, ethers } from "ethers"
import readline from 'readline-promise'
import mysql from 'mysql2/promise.js'

import { OllamaService } from '../src/service/ollama-service.js';

import { DiamondService } from '../src/service/diamond-service.js';
import { LevelService } from '../src/service/level-service.js';
import { OwnerService } from "../src/service/owner-service.js";
import { CityService } from "../src/service/city-service.js";

import { SchemaService } from "../src/service/schema-service.js";
import { GameService } from "../src/service/game-service.js";
import { RollService } from "../src/service/roll-service.js";
import { RollChartService } from "../src/service/roll-chart-service.js";
import { SeedService } from "../src/service/seed-service.js";
import { LineupService } from "../src/service/lineup-service.js";
import { AirdropService } from "../src/service/airdrop-service.js";

import { PlayerRepository } from "../src/repository/player-repository.js";
import { PlayerRepositoryNodeImpl } from "../src/repository/node/player-repository-impl.js";

import { TeamRepository } from "../src/repository/team-repository.js";
import { TeamRepositoryNodeImpl } from "../src/repository/node/team-repository-impl.js";

import { LeagueRepository } from "../src/repository/league-repository.js";
import { LeagueRepositoryNodeImpl } from "../src/repository/node/league-repository-impl.js";

import { GameRepository } from "../src/repository/game-repository.js";
import { GameRepositoryNodeImpl } from "../src/repository/node/game-repository-impl.js";
import { OwnerRepositoryNodeImpl } from "../src/repository/node/owner-repository-impl.js";
import { SeedRepositoryNodeImpl } from "../src/repository/node/seed-repository-impl.js";

import { TeamLeagueSeason } from "../src/dto/team-league-season.js";
import { TeamMintPass } from "../src/dto/team-mint-pass.js";

import { Player } from "../src/dto/player.js";
import { DiamondMintPass, Team } from "../src/dto/team.js";

import { GameHitResult } from "../src/dto/game-hit-result.js";
import { GamePitchResult } from "../src/dto/game-pitch-result.js";


import { Sequelize } from 'sequelize-typescript'
import { Game, GamePlayer, GameTeam } from "../src/dto/game.js";
import { ConnectLink } from "../src/dto/connect-link.js";

import { PlayerService } from "../src/service/player-service.js";
import { OwnerRepository } from "../src/repository/owner-repository.js";
import { Owner } from "../src/dto/owner.js";
import { SeedRepository } from "../src/repository/seed-repository.js";
import { Seed } from "../src/dto/seed.js";
import { Animation } from "../src/dto/animation.js";
import { Image } from "../src/dto/image.js";


import { PostService } from "../src/service/post-service.js";
import { PostRepository } from "../src/repository/post-repository.js";
import { PostRepositoryNodeImpl } from "../src/repository/node/post-repository-impl.js";

import { UniverseService } from "../src/service/universe-service.js";
import { ConnectService } from "../src/service/connect-service.js";
import { IPFSService } from "../src/service/ipfs-service.js";
import { ProcessedTransactionService } from "../src/service/processed-transaction-service.js";
import { UniverseIndexerService } from "../src/service/universe-indexer-service.js"


import { ConnectLinkRepository } from "../src/repository/connect-link-repository.js";
import { ConnectLinkRepositoryNodeImpl } from "../src/repository/node/connect-link-repository-impl.js";


import { UserIOService } from "../src/service/userio-service.js";

import { UniverseRepositoryNodeImpl } from "../src/repository/node/universe-repository-impl.js";

import { UserRepositoryNodeImpl } from "../src/repository/node/user-repository-impl.js";
import { UserRepository } from "../src/repository/user-repository.js";

import { TeamMintPassRepositoryNodeImpl } from "../src/repository/node/team-mint-pass-repository-impl.js";
import { TeamMintPassRepository } from "../src/repository/team-mint-pass-repository.js";
import { TeamMintPassService } from "../src/service/team-mint-pass-service.js";

import { DiamondMintPassRepositoryNodeImpl } from "../src/repository/node/diamond-mint-pass-repository-impl.js";
import { DiamondMintPassRepository } from "../src/repository/diamond-mint-pass-repository.js";
import { DiamondMintPassService } from "../src/service/diamond-mint-pass-service.js";

import { StatService } from "../src/service/stat-service.js";
import { ASCIIService } from "../src/service/ascii-service.js";
import { BlockService } from "../src/service/block-service.js";
import { ContractStateService } from "../src/service/contract-state-service.js";

import { UniverseRepository } from "../src/repository/universe-repository.js";
import { Universe } from "../src/dto/universe.js";
import { Season } from "../src/dto/season.js";

import { Block } from "../src/dto/block.js";
import { ContractState } from "../src/dto/contract-state.js";
import { ProcessedEvent, ProcessedTransaction, ProcessedTransactionToken, ProcessedTransactionTrader } from "../src/dto/processed-transaction.js";
import { Transaction } from "../src/dto/transaction.js";
import { Stadium } from "../src/dto/stadium.js";

import { TransactionService } from "../src/service/transaction-service.js"


const contractsPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../contracts.json'
);
const c = JSON.parse(fs.readFileSync(contractsPath, 'utf8'))




import { BlockRepository } from "../src/repository/block-repository.js";
import { BlockRepositoryNodeImpl } from "../src/repository/node/block-repository-impl.js"
import { ContractStateRepositoryNodeImpl } from "../src/repository/node/contract-state-repository-impl.js"
import { ContractStateRepository } from "../src/repository/contract-state-repository.js";

import { ProcessedTransactionRepositoryNodeImpl } from "../src/repository/node/processed-transaction-repository-impl.js"
import { TransactionRepositoryNodeImpl } from "../src/repository/node/transaction-repository-impl.js"
import { ProcessedTransactionRepository } from "../src/repository/processed-transaction-repository.js";
import { TransactionRepository } from "../src/repository/transaction-repository.js";
import { NodeWalletServiceImpl } from "../src/service/node-wallet-service.js";
import { AnimationService } from "../src/service/animation-service.js";

import { AnimationRepositoryNodeImpl } from "../src/repository/node/animation-repository-impl.js"

import { LadderChallenge } from "../src/dto/ladder-challenge.js";
import { LadderChallengeRepository } from "../src/repository/ladder-challenge-repository.js";
import { LadderChallengeRepositoryNodeImpl } from "../src/repository/node/ladder-challenge-repository-impl .js"

import { ImageRepository } from "../src/repository/image-repository.js";
import { ImageRepositoryNodeImpl } from "../src/repository/node/image-repository-impl.js"

import { GameTeamRepository } from "../src/repository/game-team-repository.js";
import { GameTeamRepositoryNodeImpl } from "../src/repository/node/game-team-repository-impl.js"

import { GamePlayerRepository } from "../src/repository/game-player-repository.js";
import { GamePlayerRepositoryNodeImpl } from "../src/repository/node/game-player-repository-impl.js"

import { StadiumRepository } from "../src/repository/stadium-repository.js";
import { StadiumRepositoryNodeImpl } from "../src/repository/node/stadium-repository-impl.js"

import { CityRepository } from "../src/repository/city-repository.js";
import { CityRepositoryNodeImpl } from "../src/repository/node/city-repository-impl.js"

import { SeasonRepository} from "../src/repository/season-repository.js";
import { SeasonRepositoryNodeImpl } from "../src/repository/node/season-repository-impl.js"

import { AnimationRepository } from "../src/repository/animation-repository.js";
import { ImageService } from "../src/service/image-service.js";
import { LeagueService } from "../src/service/league-service.js";
import { UserService } from "../src/service/user-service.js";
import { TeamService } from "../src/service/team-service.js";
import { StadiumService } from "../src/service/stadium-service.js";

import { createHelia } from 'helia'

import { FsBlockstore } from 'blockstore-fs'
import { FsDatastore } from 'datastore-fs'

import { Eta } from "eta"
import { UniverseContractService } from "../src/service/universe-contract-service.js"
import { League } from "../src/dto/league.js"
import { City } from "../src/dto/city.js"

import dayjs from "dayjs"
import localizedFormat from 'dayjs/plugin/localizedFormat.js'

import relativeTime from 'dayjs/plugin/relativeTime.js'

import { GameTransactionRepository } from "../src/repository/game-transaction-repository.js"
import { GameTransactionRepositoryNodeImpl } from "../src/repository/node/game-transaction-repository-impl.js"

import { GameHitResultRepository } from "../src/repository/game-hit-result-repository.js"
import { GameHitResultRepositoryNodeImpl } from "../src/repository/node/game-hit-result-repository-impl.js"

import { GamePitchResultRepository } from "../src/repository/game-pitch-result-repository.js"
import { GamePitchResultRepositoryNodeImpl } from "../src/repository/node/game-pitch-result-repository-impl.js"

import { GameTransactionService } from "../src/service/game-transaction-service.js"
import { ChatGPTService } from "../src/service/chatgpt-service.js"
import { OffchainEvent } from "../src/dto/offchain-event.js"
import { OffchainEventService } from "../src/service/offchain-event-service.js"

import { OffchainEventRepository } from "../src/repository/offchain-event-repository.js"
import { OffchainEventRepositoryNodeImpl } from "../src/repository/node/offchain-event-repository-impl.js"

import { User } from "../src/dto/user.js"
import { SignatureTokenRepository } from "../src/repository/signature-token-repository.js"
import { SignatureTokenRepositoryNodeImpl } from "../src/repository/node/signature-token-repository-impl.js"

import { TeamLeagueSeasonRepository } from "../src/repository/team-league-season-repository.js"
import { TeamLeagueSeasonRepositoryNodeImpl } from "../src/repository/node/team-league-season-repository-impl.js"

import { PlayerLeagueSeasonRepository } from "../src/repository/player-league-season-repository.js"
import { PlayerLeagueSeasonRepositoryNodeImpl } from "../src/repository/node/player-league-season-repository-impl.js"

import { SignatureToken } from "../src/dto/signature-token.js"
import { SignatureTokenService } from "../src/service/signature-token-service.js"
import { HuggingFaceService } from "../src/service/hugging-face-service.js"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { FinanceService } from "../src/service/finance-service.js"
import { SeasonService } from "../src/service/season-service.js"

import { TeamLeagueSeasonService } from "../src/service/team-league-season-service.js"
import { PlayerLeagueSeasonService } from "../src/service/player-league-season-service.js"
import { LadderService } from "../src/service/ladder-service.js"
import { PlayerLeagueSeason } from "../src/dto/player-league-season.js"
import { GameTransaction } from "../src/dto/game-transaction.js"
import { ChatGPTAPI } from 'chatgpt'
import { OpenAI } from 'openai'
import { Post } from "../src/dto/post.js"
import { Alchemy } from "alchemy-sdk";
import { AbiPayloadService } from "../src/service/abi-payload-service.js"

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

let rng
let container: Container

function getContainer(command?: GetContainerCommand) {

  // if (container) return container 

  container = new Container()

  const chatGPTAPI = new ChatGPTAPI({
    apiKey: process.env.OPENAI_API_KEY || ""
  })

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  const alchemy = new Alchemy({
      apiKey: process.env.ALCHEMY_API_KEY
  })  

  container.bind("alchemy").toConstantValue(alchemy)

  container.bind("provider").toConstantValue(() => {

    if (command?.alchemy) {
      return new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${command.alchemy}`, Network.from(1), { staticNetwork: Network.from(1) })
    }

  })

  let sequelize:any

  container.bind('sequelize').toConstantValue(async () => {

    if (sequelize) {
      return sequelize
    }

    let database = "ebl_test"
    let host = "127.0.0.1"
    let user = "root"
    let port = 3306
    let password = ''

    // create db if it doesn't already exist
    const connection = await mysql.createConnection({ host, port, user, password })
    await connection.query(`DROP DATABASE \`${database}\`;`)
    await connection.query(`CREATE DATABASE \`${database}\`;`)


    sequelize = new Sequelize(
      database,
      user,
      password,
      {
         logging: false,
         host: host,
         port: port,
         dialect: 'mysql',
         dialectOptions: {
          decimalNumbers: true,
          connectTimeout: process.env.MYSQL_TIMEOUT,
          multipleStatements: true        
         },
         models: [ TeamMintPass, Post, GameHitResult, GamePitchResult, OffchainEvent, GameTransaction, Season, Player, Team, Game, GameTeam, GamePlayer, Owner, Seed, League, User, Stadium, City, SignatureToken,TeamLeagueSeason,PlayerLeagueSeason,
          DiamondMintPass, Universe, Animation, Image, ConnectLink,
          Block, ContractState, ProcessedTransaction, ProcessedEvent, ProcessedTransactionToken, ProcessedTransactionTrader, Transaction, LadderChallenge
          ]
      } 

    )


    // await sequelize.sync({ force: true })



    // await sequelize.authenticate()
    // console.log('Connection has been established successfully.')


    return sequelize

  })

  container.bind('rlp').toConstantValue(async () => {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    })
  })

  function contracts() {
    return c
  }
  container.bind("chatGPTAPI").toConstantValue(chatGPTAPI)
  container.bind("openai").toConstantValue(openai)

  container.bind("contracts").toConstantValue(contracts())
  container.bind("framework7").toConstantValue({})
  container.bind("wallet").toConstantValue({})

  container.bind("getDiamondsAddress").toConstantValue(() => {
  })

  container.bind("getUniverseAddress").toConstantValue(() => {
  })

  container.bind("getFees").toConstantValue(() => {
  })

  container.bind("config").toConstantValue(() => {
    return {
      publicPath: `${process.env.INIT_CWD }/test/public`
    }
  })

  container.bind("helia").toConstantValue(async () => {

    const blockstore = new FsBlockstore('./data/ipfs/blockstore')
    const datastore = new FsDatastore('./data/ipfs/datastore')

    await datastore.open()
    await blockstore.open()

    const helia = await createHelia({
      blockstore: blockstore,
      datastore: datastore
    })

    //Don't do networking in browser
    await helia.libp2p.stop()

    console.log("IPFS initialized")

    return helia

  })

  container.bind("dayjs").toConstantValue(dayjs)


  let universe:Universe

  container.bind("universe").toConstantValue(() => {

    if (universe) return universe

    universe = new Universe()
    universe._id = "test"

    return universe
  })


  let eta

  if (!eta) {
      eta = new Eta()
  }

  container.bind("eta").toConstantValue(eta)
  container.bind('discord').toConstantValue({})


  container.bind<PlayerRepository>("PlayerRepository").to(PlayerRepositoryNodeImpl).inSingletonScope()
  container.bind<TeamRepository>("TeamRepository").to(TeamRepositoryNodeImpl).inSingletonScope()
  container.bind<LeagueRepository>("LeagueRepository").to(LeagueRepositoryNodeImpl).inSingletonScope()

  container.bind<GameRepository>("GameRepository").to(GameRepositoryNodeImpl).inSingletonScope()
  container.bind<OwnerRepository>("OwnerRepository").to(OwnerRepositoryNodeImpl).inSingletonScope()
  container.bind<SeedRepository>("SeedRepository").to(SeedRepositoryNodeImpl).inSingletonScope()
  container.bind<GameTeamRepository>("GameTeamRepository").to(GameTeamRepositoryNodeImpl).inSingletonScope()
  container.bind<GamePlayerRepository>("GamePlayerRepository").to(GamePlayerRepositoryNodeImpl).inSingletonScope()

  container.bind<AnimationRepository>("AnimationRepository").to(AnimationRepositoryNodeImpl).inSingletonScope()
  container.bind<ImageRepository>("ImageRepository").to(ImageRepositoryNodeImpl).inSingletonScope()
  container.bind<StadiumRepository>("StadiumRepository").to(StadiumRepositoryNodeImpl).inSingletonScope()
  container.bind<PostRepository>("PostRepository").to(PostRepositoryNodeImpl).inSingletonScope()


  container.bind<UniverseRepository>("UniverseRepository").to(UniverseRepositoryNodeImpl).inSingletonScope()
  container.bind<ConnectLinkRepository>("ConnectLinkRepository").to(ConnectLinkRepositoryNodeImpl).inSingletonScope()

  container.bind<BlockRepository>("BlockRepository").to(BlockRepositoryNodeImpl).inSingletonScope()
  container.bind<ContractStateRepository>("ContractStateRepository").to(ContractStateRepositoryNodeImpl).inSingletonScope()
  container.bind<ProcessedTransactionRepository>("ProcessedTransactionRepository").to(ProcessedTransactionRepositoryNodeImpl).inSingletonScope()
  container.bind<TransactionRepository>("TransactionRepository").to(TransactionRepositoryNodeImpl).inSingletonScope()
  container.bind<UserRepository>("UserRepository").to(UserRepositoryNodeImpl).inSingletonScope()
  container.bind<CityRepository>("CityRepository").to(CityRepositoryNodeImpl).inSingletonScope()
  container.bind<LadderChallengeRepository>("LadderChallengeRepository").to(LadderChallengeRepositoryNodeImpl).inSingletonScope()
  container.bind<SignatureTokenRepository>("SignatureTokenRepository").to(SignatureTokenRepositoryNodeImpl).inSingletonScope()
  container.bind<SeasonRepository>("SeasonRepository").to(SeasonRepositoryNodeImpl).inSingletonScope()

  container.bind<TeamLeagueSeasonRepository>("TeamLeagueSeasonRepository").to(TeamLeagueSeasonRepositoryNodeImpl).inSingletonScope()
  container.bind<PlayerLeagueSeasonRepository>("PlayerLeagueSeasonRepository").to(PlayerLeagueSeasonRepositoryNodeImpl).inSingletonScope()
  container.bind<GameTransactionRepository>("GameTransactionRepository").to(GameTransactionRepositoryNodeImpl).inSingletonScope()
  container.bind<DiamondMintPassRepository>("DiamondMintPassRepository").to(DiamondMintPassRepositoryNodeImpl).inSingletonScope()
  container.bind<TeamMintPassRepository>("TeamMintPassRepository").to(TeamMintPassRepositoryNodeImpl).inSingletonScope()

  container.bind<OffchainEventRepository>("OffchainEventRepository").to(OffchainEventRepositoryNodeImpl).inSingletonScope()

  container.bind<GameHitResultRepository>("GameHitResultRepository").to(GameHitResultRepositoryNodeImpl).inSingletonScope()
  container.bind<GamePitchResultRepository>("GamePitchResultRepository").to(GamePitchResultRepositoryNodeImpl).inSingletonScope()

  container.bind(DiamondService).toSelf().inSingletonScope()
  container.bind(AbiPayloadService).toSelf().inSingletonScope()

  container.bind(UserService).toSelf().inSingletonScope()

  container.bind(RollChartService).toSelf().inSingletonScope()

  container.bind("WalletService").to(NodeWalletServiceImpl).inSingletonScope()
  container.bind(LeagueService).toSelf().inSingletonScope()
  container.bind(SignatureTokenService).toSelf().inSingletonScope()
  container.bind(ChatGPTService).toSelf().inSingletonScope()
  container.bind(TeamMintPassService).toSelf().inSingletonScope()

  container.bind(DiamondService).toSelf().inSingletonScope()
  container.bind(RollService).toSelf().inSingletonScope()
  container.bind(GameService).toSelf().inSingletonScope()
  container.bind(PlayerService).toSelf().inSingletonScope()
  container.bind(LevelService).toSelf().inSingletonScope()
  container.bind(OwnerService).toSelf().inSingletonScope()
  container.bind(SeedService).toSelf().inSingletonScope()
  container.bind(UserIOService).toSelf().inSingletonScope()
  container.bind(StatService).toSelf().inSingletonScope()
  container.bind(UniverseService).toSelf().inSingletonScope()
  container.bind(ConnectService).toSelf().inSingletonScope()
  container.bind(ASCIIService).toSelf().inSingletonScope()
  container.bind(IPFSService).toSelf().inSingletonScope()
  container.bind(SchemaService).toSelf().inSingletonScope()
  container.bind(BlockService).toSelf().inSingletonScope()
  container.bind(ContractStateService).toSelf().inSingletonScope()
  container.bind(ProcessedTransactionService).toSelf().inSingletonScope()
  container.bind(UniverseIndexerService).toSelf().inSingletonScope()
  container.bind(TransactionService).toSelf().inSingletonScope()
  container.bind(AnimationService).toSelf().inSingletonScope()
  container.bind(ImageService).toSelf().inSingletonScope()
  container.bind(UniverseContractService).toSelf().inSingletonScope()
  container.bind(CityService).toSelf().inSingletonScope()
  container.bind(TeamService).toSelf().inSingletonScope()
  container.bind(StadiumService).toSelf().inSingletonScope()
  container.bind(HuggingFaceService).toSelf().inSingletonScope()
  container.bind(LineupService).toSelf().inSingletonScope()
  container.bind(FinanceService).toSelf().inSingletonScope()
  container.bind(SeasonService).toSelf().inSingletonScope()
  container.bind(TeamLeagueSeasonService).toSelf().inSingletonScope()
  container.bind(PlayerLeagueSeasonService).toSelf().inSingletonScope()
  container.bind(LadderService).toSelf().inSingletonScope()
  container.bind(GameTransactionService).toSelf().inSingletonScope()
  container.bind(OffchainEventService).toSelf().inSingletonScope()
  container.bind(OllamaService).toSelf().inSingletonScope()
  container.bind(DiamondMintPassService).toSelf().inSingletonScope()
  container.bind(PostService).toSelf().inSingletonScope()
  container.bind(AirdropService).toSelf().inSingletonScope()

  //Override the RNG
  let seedService: SeedService = container.get(SeedService)

  //@ts-ignore
  let rng = new seedrandom(4)

  seedService.getRNG = async () => {
    return rng
  }

  if (!fs.existsSync(`${process.env.INIT_CWD }/test/public/animations`)) {
    fs.mkdirSync(`${process.env.INIT_CWD }/test/public/animations`, { recursive: true })
  }

  if (!fs.existsSync(`${process.env.INIT_CWD }/test/public/images`)) {
    fs.mkdirSync(`${process.env.INIT_CWD }/test/public/images`, { recursive: true })
  }

  if (!fs.existsSync(`${process.env.INIT_CWD }/test/public/metadata`)) {
    fs.mkdirSync(`${process.env.INIT_CWD }/test/public/metadata`, { recursive: true })
  }

  return container
}




interface GetContainerCommand {
  customContainer: Container
  alchemy: string
}

export {
  getContainer, container
}