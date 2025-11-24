import "regenerator-runtime/runtime"
import "reflect-metadata"


import { Eta } from "eta"

import { createHelia } from 'helia'
import { FsBlockstore } from 'blockstore-fs'
import { FsDatastore } from 'datastore-fs'


import { JsonRpcProvider, Network, Wallet, ethers } from "ethers"

import { Sequelize } from 'sequelize-typescript'
import { Container } from "inversify";
import readline from 'readline-promise'

import { GameService } from "../service/data/game-service.js";
import { RollService } from "../service/roll-service.js";
import { PlayerService } from "../service/data/player-service.js";
import { PlayerRepositoryNodeImpl } from "../repository/node/player-repository-impl.js";
import { Player } from "../dto/player.js";
import { DiamondMintPass, Team } from "../dto/team.js";
import { Game, GamePlayer, GameTeam } from "../dto/game.js";
import { RollChartService } from "../service/roll-chart-service.js";
import { SchemaService } from "../service/data/schema-service.js";
import { TeamMintPass } from "../dto/team-mint-pass.js";

import { Owner } from "../dto/owner.js";
import { OwnerService } from "../service/data/owner-service.js";
import { OwnerRepositoryNodeImpl } from "../repository/node/owner-repository-impl.js";
import { SeedRepositoryNodeImpl } from "../repository/node/seed-repository-impl.js";
import { Seed } from "../dto/seed.js";
import { SeedService } from "../service/data/seed-service.js";

import { GameTeamRepositoryNodeImpl } from "../repository/node/game-team-repository-impl.js"
import { GamePlayerRepositoryNodeImpl } from "../repository/node/game-player-repository-impl.js"

import { GameRepositoryNodeImpl } from "../repository/node/game-repository-impl.js";
import { StatService } from "../service/stat-service.js";
import { Animation } from "../dto/animation.js";
import { Image } from "../dto/image.js";
import { AnimationRepositoryNodeImpl } from "../repository/node/animation-repository-impl.js";
import { ImageRepositoryNodeImpl } from "../repository/node/image-repository-impl.js";
import { ImageService } from "../service/data/image-service.js";

import { Client, IntentsBitField } from 'discord.js';
import { DiscordService } from "../service/discord-service.js"
import { UniverseRepositoryNodeImpl } from "../repository/node/universe-repository-impl.js"
import { UniverseService } from "../service/universe-service.js"
import { Universe } from "../dto/universe.js"

import { ConnectLink } from "../dto/connect-link.js"
import { ConnectLinkRepositoryNodeImpl } from "../repository/node/connect-link-repository-impl.js"
import { ConnectService } from "../service/connect-service.js"

import { ASCIIService } from "../service/ascii-service.js"
import { DeployService } from "../service/deploy-service.js"

import { PostService } from "../service/data/post-service.js";
import { PostRepositoryNodeImpl } from "../repository/node/post-repository-impl.js";


import fs from "fs"

const contractsPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../contracts.json'
  )
const c = JSON.parse(fs.readFileSync(contractsPath, 'utf8'))


import { DiamondService } from "../service/diamond-service.js"



import { IPFSService } from "../service/ipfs-service.js"
import { ProcessedEvent, ProcessedTransaction, ProcessedTransactionToken, ProcessedTransactionTrader } from "../dto/processed-transaction.js"
import { ContractState } from "../dto/contract-state.js"
import { Block } from "../dto/block.js"
import { Transaction } from "../dto/transaction.js"
import { BlockService } from "../service/data/block-service.js"
import { ContractStateService } from "../service/contract-state-service.js"
import { ProcessedTransactionService } from "../service/data/processed-transaction-service.js"
import { TransactionService } from "../service/transaction-service.js"
import { BlockRepositoryNodeImpl } from "../repository/node/block-repository-impl.js"
import { ContractStateRepositoryNodeImpl } from "../repository/node/contract-state-repository-impl.js"
import { ProcessedTransactionRepositoryNodeImpl } from "../repository/node/processed-transaction-repository-impl.js"
import { TransactionRepositoryNodeImpl } from "../repository/node/transaction-repository-impl.js"

import dayjs from "dayjs"
import localizedFormat from 'dayjs/plugin/localizedFormat.js'

import relativeTime from 'dayjs/plugin/relativeTime.js'
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

import { Fees } from "../dto/fees.js"
import { NodeWalletServiceImpl } from "../service/node-wallet-service.js"
import { UniverseContractService } from "../service/universe-contract-service.js";
import { LeagueRepositoryNodeImpl } from "../repository/node/league-repository-impl.js";
import { League } from "../dto/league.js";
import { LeagueService } from "../service/data/league-service.js";
import { User } from "../dto/user.js";
import { UserService } from "../service/user-service.js";
import { UserRepositoryNodeImpl } from "../repository/node/user-repository-impl.js";
import { StadiumRepositoryNodeImpl } from "../repository/node/stadium-repository-impl.js";
import { Stadium } from "../dto/stadium.js";
import { CityRepositoryNodeImpl } from "../repository/node/city-repository-impl.js";
import { City } from "../dto/city.js";
import { LadderService } from "../service/ladder-service.js";
import { LadderChallengeRepositoryNodeImpl } from "../repository/node/ladder-challenge-repository-impl .js";
import { LadderChallenge } from "../dto/ladder-challenge.js";
import { TeamService } from "../service/data/team-service.js";
import { CityService } from "../service/data/city-service.js";
import { TeamRepositoryNodeImpl } from "../repository/node/team-repository-impl.js";
import { SignatureTokenRepositoryNodeImpl } from "../repository/node/signature-token-repository-impl.js"
import { UniverseIndexerService } from "../service/universe-indexer-service.js"
import { StadiumService } from "../service/data/stadium-service.js"
import { LogEventService } from "../service/log-event-service.js"

import { HuggingFaceService } from "../service/hugging-face-service.js"
import { LineupService } from "../service/lineup-service.js"
import { Season } from "../dto/season.js"
import { SeasonRepositoryNodeImpl } from "../repository/node/season-repository-impl.js"
import { SeasonService } from "../service/data/season-service.js"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { FinanceService } from "../service/finance-service.js"
import { TeamLeagueSeason } from "../dto/team-league-season.js"
import { TeamLeagueSeasonService } from "../service/data/team-league-season-service.js"
import { TeamLeagueSeasonRepositoryNodeImpl } from "../repository/node/team-league-season-repository-impl.js"
import { PlayerLeagueSeasonRepositoryNodeImpl } from "../repository/node/player-league-season-repository-impl.js"
import { PlayerLeagueSeasonService } from "../service/data/player-league-season-service.js"
import { PlayerLeagueSeason } from "../dto/player-league-season.js"
import { DiamondMintPassService } from "../service/data/diamond-mint-pass-service.js"
import { DiamondMintPassRepositoryNodeImpl } from "../repository/node/diamond-mint-pass-repository-impl.js"
import { ChatGPTService } from "../service/chatgpt-service.js"
import { ChatGPTAPI } from 'chatgpt'
import { OpenAI } from 'openai'
import { OffchainEvent } from "../dto/offchain-event.js"
import { OffchainEventRepositoryNodeImpl } from "../repository/node/offchain-event-repository-impl.js"
import { OffchainEventService } from "../service/offchain-event-service.js"
import { GameHitResultRepositoryNodeImpl } from "../repository/node/game-hit-result-repository-impl.js"
import { GamePitchResultRepositoryNodeImpl } from "../repository/node/game-pitch-result-repository-impl.js"
import { GameHitResult } from "../dto/game-hit-result.js"
import { GamePitchResult } from "../dto/game-pitch-result.js"
import { Post } from "../dto/post.js"
import { AirdropService } from "../service/airdrop-service.js"

import { Alchemy } from 'alchemy-sdk'
import { AbiPayloadService } from "../service/abi-payload-service.js"
import { MintPassIndexerService } from "../service/mint-pass-indexer-service.js"
import { TeamMintPassRepositoryNodeImpl } from "../repository/node/team-mint-pass-repository-impl.js"
import { TeamMintPassService } from "../service/data/team-mint-pass-service.js"


const client = new Client({ intents: [
    IntentsBitField.Flags.Guilds, 
    // IntentsBitField.Flags.GuildMembers, 
    IntentsBitField.Flags.GuildMessages,
    // IntentsBitField.Flags.MessageContent
    ] 
})


let rng

let container
let rlp

let _config:any
let _diamondsAddress:string
let _universeAddress:string
let _fees:Fees
let _universe:Universe

async function getContainer() {

    if (container) return container 

    container  = new Container()

    const chatGPTAPI = new ChatGPTAPI({
        apiKey: process.env.OPENAI_API_KEY
    })

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    })

    const alchemy = new Alchemy({
          apiKey: process.env.ALCHEMY_API_KEY
    })



    rlp = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    })

    container.bind("alchemy").toConstantValue(alchemy)

    let sequelize

    container.bind('sequelize').toConstantValue(async () => {

        if (sequelize) {
            return sequelize
        }

        let database = process.env.MYSQL_DATABASE_NAME || "ebldev"
        let host = process.env.MYSQL_HOST || "127.0.0.1"
        let port = parseInt(process.env.MYSQL_TCP_PORT) || 3306
        let user = "root"
        let password = process.env.MYSQL_ROOT_PASSWORD || ""


        const authenticateConnection = async (s) => {

            let authenticated = false

            while (!authenticated) {
    
                try {
    
                    await s.authenticate()
                    authenticated = true
                    // console.log(`Database authenticated.`)

    
                } catch(ex) {
    
                    console.log(`Database is not available. ${ex.message}. Retrying...`)
    
                    //Sleep and try again
                    await new Promise(r => setTimeout(r, 5000))
                }
    
            }
        }

        //Connect without referencing DB in case it doesn't exist
        const tempSequelize = new Sequelize("", user, password, {
            host: host,
            port: port,
            logging: false,
            dialect: 'mysql',
            dialectOptions: {
             decimalNumbers: true,
             connectTimeout: process.env.MYSQL_TIMEOUT,
             multipleStatements: true        
            }
        })

        await authenticateConnection(tempSequelize)

        await tempSequelize.query(`CREATE DATABASE IF NOT EXISTS ${database};`)
        await tempSequelize.close()


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
               models: [TeamMintPass, Post, GamePitchResult, GameHitResult, OffchainEvent, Season, Player, Team, Game, GameTeam, GamePlayer, Owner, Seed, League, User, Stadium, City, TeamLeagueSeason,
                 DiamondMintPass, Universe, Animation, Image, ConnectLink, PlayerLeagueSeason,
                Block, ContractState, ProcessedTransaction, ProcessedEvent, ProcessedTransactionToken, ProcessedTransactionTrader, Transaction, LadderChallenge
                ],
                pool: {
                    max: 10,
                    min: 0,
                    acquire: 30000, // how long to try getting a connection (ms)
                    idle: 10000     // how long a connection can be idle before being released
                }
            } 
        )

        await authenticateConnection(sequelize)



        return sequelize

    })

    container.bind('rlp').toConstantValue(rlp)
    container.bind('discord').toConstantValue(client)

    container.bind("chatGPTAPI").toConstantValue(chatGPTAPI)
    container.bind("openai").toConstantValue(openai)

    container.bind("helia").toConstantValue( async () => {

        const blockstore = new FsBlockstore('./data/ipfs/blockstore')
        const datastore = new FsDatastore('./data/ipfs/datastore')

        await datastore.open()
        await blockstore.open()

        const helia = await createHelia({
            blockstore: blockstore,
            datastore: datastore
        })
        
        // await helia.libp2p.stop()
    
        console.log("IPFS initialized")

        return helia
    
    })

    let eta
  
    if (!eta) {
        eta = new Eta({ autoEscape: false })
    }

    container.bind("eta").toConstantValue(eta)

    

    function contracts() {
        // const c = require('../../contracts.json')
        return c
    }
    
    container.bind("contracts").toConstantValue(contracts())

    container.bind("getDiamondsAddress").toConstantValue(() => {
        return _diamondsAddress
    })

    container.bind("getUniverseAddress").toConstantValue(() => {
        return _universeAddress
    })

    container.bind("universe").toConstantValue(() => {
        return _universe
    })

    container.bind("getFees").toConstantValue(() => {
        return _fees
    })

    container.bind("config").toConstantValue(() => {
        return _config
    })

    container.bind("dayjs").toConstantValue(dayjs)


    container.bind(LogEventService).toSelf().inSingletonScope()

    container.bind(DiscordService).toSelf().inSingletonScope()

    // container.bind(GameQueueService).toSelf().inSingletonScope()
    container.bind(DiamondMintPassService).toSelf().inSingletonScope()
    container.bind(AbiPayloadService).toSelf().inSingletonScope()
    container.bind(MintPassIndexerService).toSelf().inSingletonScope()
    container.bind(TeamMintPassService).toSelf().inSingletonScope()

    container.bind(PlayerService).toSelf().inSingletonScope()
    container.bind(RollService).toSelf().inSingletonScope()
    container.bind(RollChartService).toSelf().inSingletonScope()
    container.bind(SchemaService).toSelf().inSingletonScope()
    container.bind(OwnerService).toSelf().inSingletonScope()
    container.bind(SeedService).toSelf().inSingletonScope()
    container.bind(StatService).toSelf().inSingletonScope()
    container.bind(ImageService).toSelf().inSingletonScope()
    container.bind(UniverseService).toSelf().inSingletonScope()
    container.bind(ConnectService).toSelf().inSingletonScope()
    container.bind(ASCIIService).toSelf().inSingletonScope()
    container.bind(DeployService).toSelf().inSingletonScope()
    container.bind(DiamondService).toSelf().inSingletonScope()
    container.bind(GameService).toSelf().inSingletonScope()
    container.bind("WalletService").to(NodeWalletServiceImpl).inSingletonScope()
    container.bind(IPFSService).toSelf().inSingletonScope()
    container.bind(BlockService).toSelf().inSingletonScope()
    container.bind(ContractStateService).toSelf().inSingletonScope()
    container.bind(ProcessedTransactionService).toSelf().inSingletonScope()
    container.bind(UniverseIndexerService).toSelf().inSingletonScope()
    container.bind(StadiumService).toSelf().inSingletonScope()
    container.bind(HuggingFaceService).toSelf().inSingletonScope()

    container.bind(TransactionService).toSelf().inSingletonScope()
    container.bind(UniverseContractService).toSelf().inSingletonScope()
    container.bind(LeagueService).toSelf().inSingletonScope()
    container.bind(UserService).toSelf().inSingletonScope()
    container.bind(LadderService).toSelf().inSingletonScope()
    container.bind(TeamService).toSelf().inSingletonScope()
    container.bind(CityService).toSelf().inSingletonScope()
    container.bind(LineupService).toSelf().inSingletonScope()
    container.bind(SeasonService).toSelf().inSingletonScope()
    container.bind(FinanceService).toSelf().inSingletonScope()
    container.bind(TeamLeagueSeasonService).toSelf().inSingletonScope()
    container.bind(PlayerLeagueSeasonService).toSelf().inSingletonScope()

    container.bind(ChatGPTService).toSelf().inSingletonScope()
    container.bind(OffchainEventService).toSelf().inSingletonScope()
    container.bind(PostService).toSelf().inSingletonScope()
    container.bind(AirdropService).toSelf().inSingletonScope()
    container.bind(TeamMintPassService).toSelf().inSingletonScope()

    container.bind("TeamRepository").to(TeamRepositoryNodeImpl).inSingletonScope()
    container.bind("PlayerRepository").to(PlayerRepositoryNodeImpl).inSingletonScope()
    container.bind("OwnerRepository").to(OwnerRepositoryNodeImpl).inSingletonScope()
    container.bind("SeedRepository").to(SeedRepositoryNodeImpl).inSingletonScope()
    container.bind("GameRepository").to(GameRepositoryNodeImpl).inSingletonScope()
    container.bind("AnimationRepository").to(AnimationRepositoryNodeImpl).inSingletonScope()
    container.bind("ImageRepository").to(ImageRepositoryNodeImpl).inSingletonScope()
    container.bind("UniverseRepository").to(UniverseRepositoryNodeImpl).inSingletonScope()
    container.bind("ConnectLinkRepository").to(ConnectLinkRepositoryNodeImpl).inSingletonScope()
    container.bind("LeagueRepository").to(LeagueRepositoryNodeImpl).inSingletonScope()

    container.bind("BlockRepository").to(BlockRepositoryNodeImpl).inSingletonScope()
    container.bind("ContractStateRepository").to(ContractStateRepositoryNodeImpl).inSingletonScope()
    container.bind("ProcessedTransactionRepository").to(ProcessedTransactionRepositoryNodeImpl).inSingletonScope()
    container.bind("TransactionRepository").to(TransactionRepositoryNodeImpl).inSingletonScope()

    container.bind("UserRepository").to(UserRepositoryNodeImpl).inSingletonScope()
    container.bind("StadiumRepository").to(StadiumRepositoryNodeImpl).inSingletonScope()
    container.bind("CityRepository").to(CityRepositoryNodeImpl).inSingletonScope()
    container.bind("LadderChallengeRepository").to(LadderChallengeRepositoryNodeImpl).inSingletonScope()
    container.bind("GameTeamRepository").to(GameTeamRepositoryNodeImpl).inSingletonScope()
    container.bind("GamePlayerRepository").to(GamePlayerRepositoryNodeImpl).inSingletonScope()

    container.bind("SignatureTokenRepository").to(SignatureTokenRepositoryNodeImpl).inSingletonScope()
    container.bind("SeasonRepository").to(SeasonRepositoryNodeImpl).inSingletonScope()
    container.bind("TeamLeagueSeasonRepository").to(TeamLeagueSeasonRepositoryNodeImpl).inSingletonScope()
    container.bind("PlayerLeagueSeasonRepository").to(PlayerLeagueSeasonRepositoryNodeImpl).inSingletonScope()

    container.bind("DiamondMintPassRepository").to(DiamondMintPassRepositoryNodeImpl).inSingletonScope()
    container.bind("TeamMintPassRepository").to(TeamMintPassRepositoryNodeImpl).inSingletonScope()

    container.bind("OffchainEventRepository").to(OffchainEventRepositoryNodeImpl).inSingletonScope()

    container.bind("GameHitResultRepository").to(GameHitResultRepositoryNodeImpl).inSingletonScope()
    container.bind("GamePitchResultRepository").to(GamePitchResultRepositoryNodeImpl).inSingletonScope()
    container.bind("PostRepository").to(PostRepositoryNodeImpl).inSingletonScope()




    let provider:JsonRpcProvider

    if (process.env.PROVIDER_LINK?.length > 0) {
      let chainId = parseInt(process.env.PROVIDER_CHAIN_ID) || 1
      provider = new ethers.JsonRpcProvider(process.env.PROVIDER_LINK, Network.from(chainId), { staticNetwork: Network.from(chainId) })
    } else {
      provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545")
    }

    
    let adminWalletAddress:string = process.env.ADMIN_ADDRESS 

    if (!adminWalletAddress && process.env.ENV_NAME == "development") {
        adminWalletAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    }


    let minterWallet:Wallet
    let minterWalletAddress:string

    //Load wallet
    if (process.env.MINTER_WALLET_KEY?.length > 0) {
        minterWallet = new Wallet(process.env.MINTER_WALLET_KEY, provider)
    } else {

        if (process.env.ENV_NAME == "development") {
            //Load wallet
            minterWallet = new Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider)
            //0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
            console.log(`Using default minter test wallet: ${minterWallet.address}`)
        } 
    
    }

    minterWalletAddress = minterWallet.address

    if (!minterWalletAddress) {
        throw new Error("Minter wallet not configured.")
    }


    container.bind("provider").toConstantValue(provider)
    container.bind("adminWalletAddress").toConstantValue(adminWalletAddress)

    container.bind("wallet").toConstantValue(minterWallet)
    container.bind("minterWalletAddress").toConstantValue(minterWalletAddress)

    return container
}

const setDiamondsAddress = (diamonds) => {
    _diamondsAddress = diamonds
}

const setUniverseAddress = (universeAddress) => {
    _universeAddress = universeAddress
}

const setUniverse = (universe) => {
    _universe = universe
}

const setFees = (fees:Fees) => {
    _fees = fees
}

const setConfig = (config:any) => {
    _config = config
}





export {
    getContainer, container, setDiamondsAddress, setUniverseAddress, setFees, setUniverse, setConfig
}