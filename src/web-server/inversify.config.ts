import "regenerator-runtime/runtime"
import "reflect-metadata"

import { v4 as uuidv4 } from 'uuid';

import { Eta } from "eta"

import { createHelia } from 'helia'
import { FsBlockstore } from 'blockstore-fs'
import { FsDatastore } from 'datastore-fs'

import passport from 'passport';
import { Scope, Strategy } from 'passport-discord-auth';
import refresh from 'passport-oauth2-refresh';
    
import { Sequelize } from 'sequelize-typescript'
import { Container } from "inversify";

import { GameService } from "../service/data/game-service.js";
import { RollService } from "../service/roll-service.js";
import { PlayerService } from "../service/data/player-service.js";
import { PlayerRepositoryNodeImpl } from "../repository/node/player-repository-impl.js";
import { Player } from "../dto/player.js";
import { DiamondMintPass, Team } from "../dto/team.js";
import { Game, GamePlayer, GameTeam } from "../dto/game.js";
import { RollChartService } from "../service/roll-chart-service.js";
import { SchemaService } from "../service/data/schema-service.js";

import { Owner } from "../dto/owner.js";
import { OwnerService } from "../service/data/owner-service.js";
import { OwnerRepositoryNodeImpl } from "../repository/node/owner-repository-impl.js";
import { SeedRepositoryNodeImpl } from "../repository/node/seed-repository-impl.js";
import { Seed } from "../dto/seed.js";
import { SeedService } from "../service/data/seed-service.js";



import { GameRepositoryNodeImpl } from "../repository/node/game-repository-impl.js";

import { StatService } from "../service/stat-service.js";
import { Animation } from "../dto/animation.js";
import { Image } from "../dto/image.js";
import { AnimationRepositoryNodeImpl } from "../repository/node/animation-repository-impl.js";
import { ImageRepositoryNodeImpl } from "../repository/node/image-repository-impl.js";
import { ImageService } from "../service/data/image-service.js";

import { UniverseRepositoryNodeImpl } from "../repository/node/universe-repository-impl.js"
import { UniverseService } from "../service/universe-service.js"
import { Universe } from "../dto/universe.js"

import { ConnectLink } from "../dto/connect-link.js"
import { ConnectLinkRepositoryNodeImpl } from "../repository/node/connect-link-repository-impl.js"
import { ConnectService } from "../service/connect-service.js"

import { DeployService } from "../service/deploy-service.js"

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
import { ContractStateService } from "../service/data/contract-state-service.js"
import { ProcessedTransactionService } from "../service/data/processed-transaction-service.js"
import { TransactionService } from "../service/transaction-service.js"
import { BlockRepositoryNodeImpl } from "../repository/node/block-repository-impl.js"
import { ContractStateRepositoryNodeImpl } from "../repository/node/contract-state-repository-impl.js"
import { ProcessedTransactionRepositoryNodeImpl } from "../repository/node/processed-transaction-repository-impl.js"
import { TransactionRepositoryNodeImpl } from "../repository/node/transaction-repository-impl.js"

import dayjs from "dayjs"
import relativeTime from 'dayjs/plugin/relativeTime.js'
dayjs.extend(relativeTime)

import localizedFormat from 'dayjs/plugin/localizedFormat.js'
dayjs.extend(localizedFormat)

import utc from "dayjs/plugin/utc.js"
import timezone from "dayjs/plugin/timezone.js"

dayjs.extend(utc)
dayjs.extend(timezone)


import { League } from "../dto/league.js"
import { TeamMintPass } from "../dto/team-mint-pass.js"

import { NodeWalletServiceImpl } from "../service/node-wallet-service.js"
import { PlayerViewService } from "../service/player-view-service.js"
import { User } from "../dto/user.js";
import { UserService } from "../service/data/user-service.js";
import { UserRepositoryNodeImpl } from "../repository/node/user-repository-impl.js";
import { StadiumRepositoryNodeImpl } from "../repository/node/stadium-repository-impl.js";
import { Stadium } from "../dto/stadium.js";
import { CityRepositoryNodeImpl } from "../repository/node/city-repository-impl.js";
import { City } from "../dto/city.js";
import { CityService } from "../service/data/city-service.js";
import { TeamService } from "../service/data/team-service.js";
import { TeamRepositoryNodeImpl } from "../repository/node/team-repository-impl.js";
import { UniverseContractService } from "../service/universe-contract-service.js";
import { LadderChallenge } from "../dto/ladder-challenge.js";
import { GameTeamRepositoryNodeImpl } from "../repository/node/game-team-repository-impl.js";
import { CacheService } from "../service/cache-service.js";
import { SignatureTokenRepositoryNodeImpl } from "../repository/node/signature-token-repository-impl.js";
import { SignatureToken } from "../dto/signature-token.js";
import { SignatureTokenService } from "../service/data/signature-token-service.js";
import { StadiumService } from "../service/data/stadium-service.js";
import { HuggingFaceService } from "../service/hugging-face-service.js";
import { LeagueService } from "../service/data/league-service.js";
import { LeagueRepositoryNodeImpl } from "../repository/node/league-repository-impl.js";
import { LadderService } from "../service/ladder-service.js";
import { LineupService } from "../service/lineup-service.js";
import { Fees } from "../dto/fees.js";
import { Season } from "../dto/season.js";
import { SeasonRepositoryNodeImpl } from "../repository/node/season-repository-impl.js";
import { SeasonService } from "../service/data/season-service.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { FinanceService } from "../service/finance-service.js";
import { TeamLeagueSeason } from "../dto/team-league-season.js";
import { TeamLeagueSeasonService } from "../service/data/team-league-season-service.js";
import { TeamLeagueSeasonRepositoryNodeImpl } from "../repository/node/team-league-season-repository-impl.js";
import { PlayerLeagueSeasonRepositoryNodeImpl } from "../repository/node/player-league-season-repository-impl.js";
import { PlayerLeagueSeasonService } from "../service/data/player-league-season-service.js";
import { PlayerLeagueSeason } from "../dto/player-league-season.js";
import { GamePlayerRepositoryNodeImpl } from "../repository/node/game-player-repository-impl.js";
import { DiamondMintPassService } from "../service/data/diamond-mint-pass-service.js";
import { DiamondMintPassRepositoryNodeImpl } from "../repository/node/diamond-mint-pass-repository-impl.js";
import { ChatGPTService } from "../service/chatgpt-service.js";
import { OffchainEvent } from "../dto/offchain-event.js";
import { OffchainEventService } from "../service/data/offchain-event-service.js";
import { OffchainEventRepositoryNodeImpl } from "../repository/node/offchain-event-repository-impl.js";
import { GamePitchResult } from "../dto/game-pitch-result.js";
import { GameHitResult } from "../dto/game-hit-result.js";
import { GameHitResultRepositoryNodeImpl } from "../repository/node/game-hit-result-repository-impl.js";
import { GamePitchResultRepositoryNodeImpl } from "../repository/node/game-pitch-result-repository-impl.js";
import { Post } from "../dto/post.js";
import { PostService } from "../service/data/post-service.js";
import { PostRepositoryNodeImpl } from "../repository/node/post-repository-impl.js";
import { AirdropService } from "../service/airdrop-service.js";
import { TeamMintPassRepositoryNodeImpl } from "../repository/node/team-mint-pass-repository-impl.js";
import { TeamMintPassService } from "../service/data/team-mint-pass-service.js";
import { SocketService } from "../service/socket-service.js";
import { TeamQueue } from "../dto/team-queue.js";
import { TeamQueueRepositoryNodeImpl } from "../repository/node/team-queue-repository-impl.js";
import { TeamQueueService } from "../service/data/team-queue-service.js";


let _diamondsAddress:string
let _universeAddress:string
let _universe:Universe
let _config:any
let _scheduleHour:number
let _fees:Fees


let container
// let rlp


const setDiamondsAddress = (diamonds) => {
    _diamondsAddress = diamonds
}

const setUniverseAddress = (universeAddress) => {
    _universeAddress = universeAddress
}

const setConfig = (config) => {
    _config = config
}

const setUniverse = (universe) => {
    _universe = universe
}

const setScheduleHour = (scheduleHour) => {
    _scheduleHour = scheduleHour
}

const setFees = (fees:Fees) => {
    _fees = fees
}

async function getContainer(command?:GetContainerCommand) {

    if (container) return container 

    container  = new Container()

    
    container.bind("alchemy").toConstantValue({})



    let eta
  
    if (!eta) {
        eta = new Eta({ autoEscape: false })
    }

    container.bind("eta").toConstantValue(eta)
    container.bind("chatGPTAPI").toConstantValue({})
    container.bind("openai").toConstantValue({})


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

                    console.log(`Database authenticated.`)
    
                } catch(ex) {
        
                    console.log(`Database is not available. ${ex.message}. Retrying...`)
    
                    //Sleep and try again
                    await new Promise(r => setTimeout(r, 5000))
                }
    
            }
        }

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
               models: [TeamQueue, TeamMintPass, Post, GamePitchResult, GameHitResult, OffchainEvent, Season, Player, Team, Game, GameTeam, GamePlayer, Owner, Seed, League, User, Stadium, City, SignatureToken, TeamLeagueSeason, DiamondMintPass,
                 Universe, Animation, Image, ConnectLink, PlayerLeagueSeason,
                Block, ContractState, ProcessedTransaction, ProcessedEvent, ProcessedTransactionToken, ProcessedTransactionTrader, Transaction, LadderChallenge
                ]
            } 
        )

        await authenticateConnection(sequelize)

        return sequelize

    })

    container.bind('discord').toConstantValue({})

    container.bind("helia").toConstantValue( async () => {

        const blockstore = new FsBlockstore('./data/ipfs/blockstore')
        const datastore = new FsDatastore('./data/ipfs/datastore')

        await datastore.open()
        await blockstore.open()

        const helia = await createHelia({
            blockstore: blockstore,
            datastore: datastore
        })
        
        await helia.libp2p.stop()
    
        console.log("IPFS initialized")

        return helia
    
    })


    
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


    container.bind("dayjs").toConstantValue(dayjs)

    container.bind("config").toConstantValue(() => {
        return _config
    })

    container.bind(DiamondMintPassService).toSelf().inSingletonScope()
    container.bind(SocketService).toSelf().inSingletonScope()

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
    container.bind(DeployService).toSelf().inSingletonScope()
    container.bind(DiamondService).toSelf().inSingletonScope()
    container.bind(GameService).toSelf().inSingletonScope()
    container.bind(IPFSService).toSelf().inSingletonScope()
    container.bind(BlockService).toSelf().inSingletonScope()
    container.bind(ContractStateService).toSelf().inSingletonScope()
    container.bind(ProcessedTransactionService).toSelf().inSingletonScope()
    container.bind(TransactionService).toSelf().inSingletonScope()
    container.bind("WalletService").to(NodeWalletServiceImpl).inSingletonScope()
    container.bind(PlayerViewService).toSelf().inSingletonScope()
    container.bind(UserService).toSelf().inSingletonScope()
    container.bind(CityService).toSelf().inSingletonScope()
    container.bind(TeamService).toSelf().inSingletonScope()
    container.bind(UniverseContractService).toSelf().inSingletonScope()
    container.bind(CacheService).toSelf().inSingletonScope()
    container.bind(SignatureTokenService).toSelf().inSingletonScope()
    container.bind(StadiumService).toSelf().inSingletonScope()
    container.bind(HuggingFaceService).toSelf().inSingletonScope()
    container.bind(LeagueService).toSelf().inSingletonScope()
    container.bind(LadderService).toSelf().inSingletonScope()
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
    container.bind(TeamQueueService).toSelf().inSingletonScope()

    container.bind("PlayerRepository").to(PlayerRepositoryNodeImpl).inSingletonScope()
    container.bind("OwnerRepository").to(OwnerRepositoryNodeImpl).inSingletonScope()
    container.bind("SeedRepository").to(SeedRepositoryNodeImpl).inSingletonScope()
    container.bind("GameRepository").to(GameRepositoryNodeImpl).inSingletonScope()
    container.bind("AnimationRepository").to(AnimationRepositoryNodeImpl).inSingletonScope()
    container.bind("ImageRepository").to(ImageRepositoryNodeImpl).inSingletonScope()
    container.bind("UniverseRepository").to(UniverseRepositoryNodeImpl).inSingletonScope()
    container.bind("ConnectLinkRepository").to(ConnectLinkRepositoryNodeImpl).inSingletonScope()
    container.bind("StadiumRepository").to(StadiumRepositoryNodeImpl).inSingletonScope()
    container.bind("CityRepository").to(CityRepositoryNodeImpl).inSingletonScope()
    container.bind("TeamRepository").to(TeamRepositoryNodeImpl).inSingletonScope()
    container.bind("UserRepository").to(UserRepositoryNodeImpl).inSingletonScope()
    container.bind("LeagueRepository").to(LeagueRepositoryNodeImpl).inSingletonScope()

    container.bind("BlockRepository").to(BlockRepositoryNodeImpl).inSingletonScope()
    container.bind("ContractStateRepository").to(ContractStateRepositoryNodeImpl).inSingletonScope()
    container.bind("ProcessedTransactionRepository").to(ProcessedTransactionRepositoryNodeImpl).inSingletonScope()
    container.bind("TransactionRepository").to(TransactionRepositoryNodeImpl).inSingletonScope()
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
    container.bind("TeamQueueRepository").to(TeamQueueRepositoryNodeImpl).inSingletonScope()


    container.bind("provider").toConstantValue({})
    container.bind("wallet").toConstantValue({})

    
    let adminWalletAddress:string = process.env.ADMIN_ADDRESS 

    if (!adminWalletAddress && process.env.ENV_NAME == "development") {
        adminWalletAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    }


    let discordStrategy = new Strategy({
        clientId: process.env.DISCORD_OAUTH_CLIENT_ID,
        clientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET,
        callbackUrl: `${process.env.WEB}/auth/discord/callback`,
        scope: ['identify'],
        },
        // Do something with the profile
        async (accessToken, refreshToken, profile, done) => {
            
            try {
            
                let s = container.get("sequelize")
                let sequelize = await s()

                let teamService:TeamService = container.get(TeamService)
                let userService:UserService = container.get(UserService)
                let leagueService:LeagueService = container.get(LeagueService)
                let seasonService:SeasonService = container.get(SeasonService)
                let financeService:FinanceService = container.get(FinanceService)


                let existingUser:User

                await sequelize.transaction(async (t1) => {

                    let options = { transaction: t1 }

                    existingUser = await userService.getByDiscordId(profile.id, options)
            
                    if (!existingUser) {
                        existingUser = new User()
                        existingUser._id = uuidv4()
                        existingUser.discordId = profile.id   
                    }
        
                    existingUser.discordAccessToken = accessToken
                    existingUser.discordRefreshToken = refreshToken
                    existingUser.discordProfile = profile
        
                    await userService.put(existingUser, options)


                    let teams:Team[] = await teamService.getByUser(existingUser, options)


                    if (teams?.length == 0) {

                        let season:Season = await seasonService.getMostRecent(options)
                        let league:League = await leagueService.getByRank(1, options)

                        let financeSeason = financeService.getDefaultFinanceSeason()

                        let teamResult = await teamService.createForUser(existingUser, league, season, financeSeason, options)

                        await teamService.fillAndValidateRoster(teamResult.tls, [], season, undefined, true, options)

                    }

                })

    
                done(undefined, existingUser)
            } catch(ex) {
                console.log(ex)
                done(ex, undefined)
            }
        }
    )
    

    passport.serializeUser((user, cb) => {
        cb(null, user._id)
    })
    
    passport.deserializeUser((id, cb) => {
    
        try {
    
            let user = User.findOne({ 
                where: {
                    _id: id
                }
            })
    
            cb(null, user)
        } catch(ex) {
            cb(ex, null)
        }
    
    })
    
    passport.use(discordStrategy)
    refresh.use('discord', discordStrategy)
    
    // let connectService:ConnectService = container.get(ConnectService)
    // let userService:UserService = container.get(UserService)


    // class EthereumStrategy extends passport.Strategy {
    //     name?: string;
      
    //     async authenticate(
    //       this: passport.StrategyCreated<this, this & passport.StrategyCreatedStatic>,
    //       _req: Request,
    //       _options?: any,
    //     ) {
    
    //       let body:any = _req.body
    
    //       try {
            
    //         let recoveredAddress = await connectService.validateSignature(body.message, body.signature)
            
    //         let user:User = await userService.getByAddress(recoveredAddress)

    //         if (!user) {
    //             user = new User()
    //             user._id = uuidv4()
    //             user.address = recoveredAddress
    //             await user.save()
    //         }

    //         this.success(user)

    //       } catch(ex) {

    //         this.fail('Invalid login.')

    //       }

    //     }
    // }


    // let ethereumStrategy = new EthereumStrategy()
    // ethereumStrategy.name = "ethereum"
    // passport.use(ethereumStrategy)




    return container
}

interface GetContainerCommand {
    alchemy:string
}







export {
    getContainer, container, GetContainerCommand, setDiamondsAddress, setUniverseAddress, setConfig, setUniverse, setScheduleHour, setFees
}