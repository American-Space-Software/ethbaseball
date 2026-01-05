
import passport from 'passport'

import { getContainer, setConfig, setDiamondsAddress, setUniverse, setUniverseAddress } from "./inversify.config.js"

import { ProcessConfig } from "../process-config.js"

import express from "express"
import compression from "compression"

import { RequestHandler } from 'express'
import session from "express-session"

import bodyParser from 'body-parser';
import { ConnectService } from "../service/connect-service.js"
import { Owner } from "../dto/owner.js"
import { PlayerService } from "../service/data/player-service.js"
import { Player } from "../dto/player.js"
import { Image } from "../dto/image.js"

import { PlayerViewService } from "../service/player-view-service.js"
import { OwnerService } from "../service/data/owner-service.js"

import connectSessionSequelize from "connect-session-sequelize"
import { UserService } from "../service/data/user-service.js"
import { User } from "../dto/user.js"
import { DiamondMintPass, RotationPitcher, Team } from "../dto/team.js"
import { TeamService } from "../service/data/team-service.js"
import { GameService } from "../service/data/game-service.js"
import { UniverseService } from "../service/universe-service.js"
import { Universe } from "../dto/universe.js"
import dayjs from "dayjs"
import { ImageService } from '../service/data/image-service.js'
import { CacheService, ENV_TAG, IMAGES, OWNERS, PLAYERS, TEAMS } from '../service/cache-service.js'
import { SignatureTokenService } from '../service/data/signature-token-service.js'
import { ethers } from 'ethers'
import { LeagueService } from '../service/data/league-service.js'
import { League } from '../dto/league.js'
import { SeasonService } from '../service/data/season-service.js'
import { Season } from '../dto/season.js'
import { PlayerLeagueSeason } from '../dto/player-league-season.js'
import { PlayerLeagueSeasonService } from '../service/data/player-league-season-service.js'
import { TeamLeagueSeasonService } from '../service/data/team-league-season-service.js'

import { OffchainEventService } from '../service/data/offchain-event-service.js'
import { ContractType, HitterPitcher, OwnerSorts, PLAYER_STATS_SORT_EXPRESSION, Position, TeamCost } from '../service/enums.js'
import { TeamLeagueSeason } from '../dto/team-league-season.js'
import { ProcessedTransactionService } from '../service/data/processed-transaction-service.js'
import { DiamondMintPassService } from '../service/data/diamond-mint-pass-service.js'
import { TeamMintPassService } from '../service/data/team-mint-pass-service.js'

import { Eta } from "eta"
import { CityService } from '../service/data/city-service.js'
import { Game, GamePlayer } from '../dto/game.js'

import http from 'http'
import { SocketService } from '../service/socket-service.js'
import { LadderService } from '../service/ladder-service.js'

const SECONDS_BETWEEN_GAME_UPDATES = 30



const TWITTER = "@ethbaseball"


const app = express()

const server = http.createServer(app)



let startWebServer = async () => {

  //@ts-ignore
  const version = VERSION

  console.log(`
***********************************
* Web server starting ${version}  *
* *********************************
`)

  const eta = new Eta({
    views: "./src/web-server/views"
  })

  const SECONDS_BETWEEN_SIMS = process.env.SECONDS_BETWEEN_SIMS ?  parseInt(process.env.SECONDS_BETWEEN_SIMS) : 15

  const PROVIDER_CHAIN_ID = process.env.PROVIDER_CHAIN_ID ? parseInt(process.env.PROVIDER_CHAIN_ID) : 1337
  const PROVIDER_CHAIN_NAME = process.env.PROVIDER_CHAIN_NAME ? process.env.PROVIDER_CHAIN_NAME : "localhost"
  const PROVIDER_CHAIN_RPC_URL = process.env.PROVIDER_CHAIN_RPC_URL ? process.env.PROVIDER_CHAIN_RPC_URL : "http://127.0.0.1:8545/"
  const PROVIDER_CHAIN_BLOCK_EXPLORER = process.env.PROVIDER_CHAIN_BLOCK_EXPLORER
  const FOOTER_ROUTES:{ link:string, content:string, linkText:string}[] = process.env.FOOTER_ROUTES ? JSON.parse(process.env.FOOTER_ROUTES) : []
  const FOOTER_SCRIPT:string = process.env.FOOTER_SCRIPT

  const OPENSEA_COLLECTION_URL = process.env.OPENSEA_COLLECTION_URL



  app.use(compression())
  app.use(bodyParser.json()) // add a middleware (so that express can parse request.body's json)

  let config = await ProcessConfig.getConfig()

  let container = await getContainer()

  let connectService: ConnectService = container.get(ConnectService)

  let imageService: ImageService = container.get(ImageService)

  let playerService: PlayerService = container.get(PlayerService)
  let playerViewService: PlayerViewService = container.get(PlayerViewService)
  let ownerService: OwnerService = container.get(OwnerService)
  let userService: UserService = container.get(UserService)
  let teamService: TeamService = container.get(TeamService)
  let gameService: GameService = container.get(GameService)
  let universeService: UniverseService = container.get(UniverseService)
  let cacheService: CacheService = container.get(CacheService)
  let signatureTokenService: SignatureTokenService = container.get(SignatureTokenService)
  let leagueService: LeagueService = container.get(LeagueService)
  let seasonService: SeasonService = container.get(SeasonService)
  let cityService:CityService = container.get(CityService)
  let teamLeagueSeasonService:TeamLeagueSeasonService = container.get(TeamLeagueSeasonService)
  let playerLeagueSeasonService:PlayerLeagueSeasonService = container.get(PlayerLeagueSeasonService)
  let diamondMintPassService:DiamondMintPassService = container.get(DiamondMintPassService)
  let teamMintPassService:TeamMintPassService = container.get(TeamMintPassService)
  let socketService:SocketService = container.get(SocketService)
  let ladderService:LadderService = container.get(LadderService)

  let offchainEventService:OffchainEventService = container.get(OffchainEventService)
  let processedTransactionService:ProcessedTransactionService = container.get(ProcessedTransactionService)

  
  let s = container.get("sequelize")
  let sequelize = await s()


  let universe: Universe

  while (!universe) {

    let universeList = await universeService.list(1, 0)

    if (universeList.length > 0) {

      universe = universeList[0]

    } else {

      console.log("Universe is not configured. Retrying...")

      //Sleep and try again
      await new Promise(r => setTimeout(r, 3000))

    }

  }



  // initalize sequelize with session store
  const SequelizeStore = connectSessionSequelize(session.Store)

  const SESSION_EXPIRES = 365 * 24 * 60 * 60 * 1000

  const sessionMiddleware = session({
      secret: process.env.SESSION_SECRET,
      store: new SequelizeStore({
        db: sequelize,
        checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds.
        expiration: SESSION_EXPIRES,
        //@ts-ignore
        disableTouch: true
      }),
      cookie: {
        maxAge: SESSION_EXPIRES
      },
      resave: false, // we support the touch method so per the express-session docs this should be set to false
      proxy: true, // if you do SSL outside of node.
      saveUninitialized: false
   })


  app.use(sessionMiddleware)

  console.log(`Connecting to Diamonds: ${universe.diamondAddress}`)
  setDiamondsAddress(universe.diamondAddress)

  console.log(`Universe loaded: ${universe._id}`)

  console.log(`Connecting to Universe: ${universe.contractAddress}`)
  setUniverseAddress(universe.contractAddress)

  setConfig(config)

  setUniverse(universe)


  await cacheService.init()
  await cacheService.manageTags() //starts a loop


  let leagues:League[] = await leagueService.listByRankAsc()

  const refreshUniverse = async () => {
    universe = await universeService.get(universe._id)
  }

  const parseIntWithException = (theStr) => {

    let result = parseInt(theStr)

    if (isNaN(result)) throw new Error("Error parsing integer.")

    return result

  }

  const getEnv = async () => {

    let season = await seasonService.getMostRecent()
    await refreshUniverse()

    return {
      'WEB': process.env.WEB,
      'WEB_SOCKET': process.env.WEB_SOCKET,
      'LEAGUES': leagues,
      'CURRENT_DATE': universe.currentDate,
      'START_DATE': dayjs(season.startDate).format("YYYY-MM-DD"),
      //@ts-ignore
      'VERSION': VERSION,
      'PROVIDER_CHAIN_ID': PROVIDER_CHAIN_ID,
      'PROVIDER_CHAIN_NAME': PROVIDER_CHAIN_NAME,
      'PROVIDER_CHAIN_RPC_URL': PROVIDER_CHAIN_RPC_URL,
      'PROVIDER_CHAIN_BLOCK_EXPLORER': PROVIDER_CHAIN_BLOCK_EXPLORER,
      'DIAMONDS_ADDRESS': universe.diamondAddress,
      'UNIVERSE_ADDRESS': universe.contractAddress,
      'ADMIN_ADDRESS': universe.adminAddress,
      'IPFS_CID': universe.ipfsCid,
      'OPENSEA_COLLECTION_URL': OPENSEA_COLLECTION_URL
    }

  }


  //Passport middleware
  app.use(passport.initialize())
  app.use(passport.session() as RequestHandler)

  const renderIndex = async (res, props) => {

      const renderedTemplate = eta.render("index.ejs", { 
        route: props.route,
        title: props.title,
        description: props.description,
        image: props.image ? props.image : '',
        url: `${process.env.WEB}${props.url}`,
        twitter: TWITTER,
        VERSION: version,
        FOOTER_ROUTES: FOOTER_ROUTES,
        FOOTER_SCRIPT: FOOTER_SCRIPT,
        ENV: await getEnv()
      })

      res.status(200).send(renderedTemplate)

  }



  app.get('/health', (_req, res) => {
    return res.status(200).send('ok')
  })

  app.get('/env', cacheService.cacheResponse({ tag: ENV_TAG }), async function (req, res) {
    return res.json(getEnv())

  })


  /** We need one of these for each client-side route. Maybe there's a better way to automate it. 
   * If a user navigates to a page in the client and then hits refresh in the browser we need to return
   * the index page that loads the javascript, etc. Also it needs twitter/og meta tags because if a user shares
   * a link it reads those.
   *  
  */

  for (let footerRoute of FOOTER_ROUTES.filter( r => r.link.startsWith("/"))) {

      app.get(`${footerRoute.link}`, async function (req, res) {

          try {

            await renderIndex(res,{ 
              twitter: TWITTER,
              title: footerRoute.linkText,
              VERSION: version,
              image: `${process.env.WEB}/ebl-512.png`,
              url: req.originalUrl
            })

          } catch (ex) {
            res.sendStatus(500)
          }

      })

  }




  app.get("/", async function (req, res) {

      try {

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: "Ethereum Baseball League - Step Into the Owner’s Box. The League Awaits.",
          description: "Ethereum Baseball League (EBL) is a competitive PvP baseball ownership and business simulator. Build a winning team, manage your finances, and outmaneuver real opponents in a player-driven economy where teams and Diamonds are bought, sold, and earned. ",
          VERSION: version,
          image: `${process.env.WEB}/ebl-512.png`,
          url: req.originalUrl
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/t/create/index", async function (req, res) {

      try {



        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `Create Team - Ethereum Baseball League`,
          description: `Create team in Ethereum Baseball League.`,
          VERSION: version,
          image: `${process.env.WEB}/ebl-512.png`,
          url: req.originalUrl

        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })



  app.get("/t/index/:teamId", async function (req, res) {

      try {

        let team: Team = await teamService.get(req.params.teamId)
        let season:Season = await seasonService.getMostRecent()
        let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })


        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `${tlsPlain.city?.name ? tlsPlain.city.name : ''} ${tlsPlain.team.name} - Ethereum Baseball League`,
          description: `${tlsPlain.city?.name ? tlsPlain.city.name : ''} ${tlsPlain.team.name} is a franchise in Ethereum Baseball League.`,
          VERSION: version,
          image: `${process.env.WEB}/image/thumbnail/1024/${tlsPlain.logoId}`,
          url: req.originalUrl

        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/t/results/:teamId", async function (req, res) {

      try {

        let team: Team = await teamService.get(req.params.teamId)
        let season:Season = await seasonService.getMostRecent()
        let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })


        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `${tlsPlain.city?.name ? tlsPlain.city.name : ''} ${tlsPlain.team.name} Schedule - Ethereum Baseball League`,
          description: `View the schedule for ${tlsPlain.city?.name ? tlsPlain.city.name : ''} ${tlsPlain.team.name} in Ethereum Baseball League.`,
          VERSION: version,
          image: `${process.env.WEB}/image/thumbnail/1024/${tlsPlain.logoId}`,
          url: req.originalUrl

        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/t/activity/index/:teamId", async function (req, res) {

      try {

        let team: Team = await teamService.get(req.params.teamId)
        let season:Season = await seasonService.getMostRecent()
        let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `${tlsPlain.city?.name ? tlsPlain.city.name : ''} ${tlsPlain.team.name} Activity - Ethereum Baseball League`,
          description: `View the activity for ${tlsPlain.city?.name ? tlsPlain.city.name : ''} ${tlsPlain.team.name} in Ethereum Baseball League.`,
          VERSION: version,
          image: `${process.env.WEB}/image/thumbnail/1024/${tlsPlain.logoId}`,
          url: req.originalUrl

        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/t/activity/off/:teamId", async function (req, res) {

      try {

        let team: Team = await teamService.get(req.params.teamId)
        let season:Season = await seasonService.getMostRecent()
        let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `${tlsPlain.city?.name ? tlsPlain.city.name : ''} ${tlsPlain.team.name} Activity - Ethereum Baseball League`,
          description: `View the activity for ${tlsPlain.city?.name ? tlsPlain.city.name : ''} ${tlsPlain.team.name} in Ethereum Baseball League.`,
          VERSION: version,
          image: `${process.env.WEB}/image/thumbnail/1024/${tlsPlain.logoId}`,
          url: req.originalUrl

        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/t/activity/game/:teamId", async function (req, res) {

      try {

        let team: Team = await teamService.get(req.params.teamId)
        let season:Season = await seasonService.getMostRecent()
        let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `${tlsPlain.city.name} ${tlsPlain.team.name} Activity - Ethereum Baseball League`,
          description: `View the activity for ${tlsPlain.city.name} ${tlsPlain.team.name} in Ethereum Baseball League.`,
          VERSION: version,
          image: `${process.env.WEB}/image/thumbnail/1024/${tlsPlain.logoId}`,
          url: req.originalUrl

        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  // app.get("/t/mint/:tokenId", async function (req, res) {

  //     try {

  //       let team: Team = await teamService.getByTokenId(parseIntWithException(req.params.tokenId))
  //       let season:Season = await seasonService.getMostRecent()
  //       let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

  //       let tlsPlain = tls.get({ plain: true })

  //       await renderIndex(res,{ 
  //         twitter: TWITTER,
  //         title: `Mint ${tlsPlain.city.name} ${tlsPlain.team.name} - Ethereum Baseball League`,
  //         description: `Mint the ${tlsPlain.city.name} ${tlsPlain.team.name} in Ethereum Baseball League.`,
  //         VERSION: version,
  //         image: `${process.env.WEB}/image/thumbnail/1024/${tlsPlain.logoId}`,
  //         url: req.originalUrl

  //       })

  //     } catch (ex) {
  //       res.sendStatus(500)
  //     }

  // })


  app.get("/l/list/:leagueRank", async function (req, res) {

      try {

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `Leagues - Ethereum Baseball League`,
          description: `View league list in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/l/standings/:leagueRank/:page", async function (req, res) {

      try {

        let rank = req.params.leagueRank ? parseIntWithException(req.params.leagueRank) : 1

        let league: League = await leagueService.getByRank(rank)

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `${league.name} Standings - Ethereum Baseball League`,
          description: `View ${league.name} standings in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`

        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/games", async function (req, res) {

      try {

        let gameDate = req.query.gameDate ? dayjs(req.query.gameDate?.toString()) : universe.currentDate

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `Scores for ${dayjs(gameDate).format("YYYY-MM-DD")} - Ethereum Baseball League`,
          description: `View scores for ${dayjs(gameDate).format("YYYY-MM-DD")} in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/g/:id", async function (req, res) {

      try {

        let gameId = req.params.id

        let game = await gameService.get(gameId)



        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `${game.away.cityName ? game.away.cityName : ''} ${game.away.name} @ ${game.home.cityName ? game.home.cityName : ''} ${game.home.name} on ${dayjs(game.gameDate).format("YYYY-MM-DD")}- Ethereum Baseball League`,
          description: `${game.away.cityName ? game.away.cityName : ''} ${game.away.name} @ ${game.home.cityName ? game.home.cityName : ''} ${game.home.name} on ${dayjs(game.gameDate).format("YYYY-MM-DD")}`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/g/:id/gamelog", async function (req, res) {

      try {

        let gameId = req.params.id

        let game = await gameService.get(gameId)

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `${game.away.cityName ? game.away.cityName : ''} ${game.away.name} @ ${game.home.cityName ? game.home.cityName : ''} ${game.home.name} on ${dayjs(game.gameDate).format("YYYY-MM-DD")} Game Log - Ethereum Baseball League`,
          description: `${game.away.cityName ? game.away.cityName : ''} ${game.away.name} @ ${game.home.cityName ? game.home.cityName : ''} ${game.home.name} on ${dayjs(game.gameDate).format("YYYY-MM-DD")} - Game Log`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })


  app.get("/players/", async function (req, res) {

      try {

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `Players - Ethereum Baseball League`,
          description: `View players in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/p/:id", async function (req, res) {

      try {

        let playerId:string = req.params.id

        let player = await playerService.get(playerId)

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `${player.fullName} - Ethereum Baseball League`,
          description: `View ${player.fullName} in Ethereum Baseball League.`,
          image: `${process.env.WEB}/player/image/${player._id}`,
          VERSION: version,
          url: req.originalUrl

        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/activity", async function (req, res) {

      try {

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `Activity - Ethereum Baseball League`,
          description: `Activity in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/activity/off", async function (req, res) {

      try {

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `Activity (Off-chain) - Ethereum Baseball League`,
          description: `Activity (Off-chain) in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/activity/game", async function (req, res) {

      try {

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `Activity (Player Moves) - Ethereum Baseball League`,
          description: `Activity (Player Moves) in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })


  app.get("/u/owners", async function (req, res) {

      try {

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `Owners - Ethereum Baseball League`,
          description: `Owners in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/about", async function (req, res) {

      try {

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `About - Ethereum Baseball League`,
          description: `About Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/u/activity", async function (req, res) {

      try {

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `Activity - Ethereum Baseball League`,
          description: `Activity in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })




  app.get('/image/:id', cacheService.cacheResponse({ tag: IMAGES }), async function (req, res) {

    try {

      let id = req.params.id

      let image:Image = await imageService.get(id)

      if (image.svg) {

        res.writeHead(200, {
          'Content-Type': 'image/svg+xml',
          'Content-Length': image.svg.length
        })

        res.end(image.svg)

      } else {

        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': image.dataFull.length
        })

        res.end(image.dataFull)

      }


    } catch (ex) {
      res.sendStatus(404)
    }

  })

  app.get('/image/thumbnail/:id', cacheService.cacheResponse({ tag: IMAGES }), async function (req, res) {

    try {

      let id = req.params.id

      let image:Image = await imageService.get(id)

      if (image.svg) {

        res.writeHead(200, {
          'Content-Type': 'image/svg+xml',
          'Content-Length': image.svg.length
        })

        res.end(image.svg)

      } else {
        
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': image.data60x60.length
        })

        res.end(image.data60x60)

      }


    } catch (ex) {
      res.sendStatus(404)
    }

  })

  app.get('/image/thumbnail/100/:id', cacheService.cacheResponse({ tag: IMAGES }), async function (req, res) {

    try {

      let id = req.params.id

      let image:Image = await imageService.get(id)

      if (image.svg) {

        res.writeHead(200, {
          'Content-Type': 'image/svg+xml',
          'Content-Length': image.svg.length
        })

        res.end(image.svg)

      } else {
        
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': image.data100x100.length
        })

        res.end(image.data100x100)

      }


    } catch (ex) {
      res.sendStatus(404)
    }

  })

  app.get('/image/thumbnail/1024/:id', cacheService.cacheResponse({ tag: IMAGES }), async function (req, res) {

    try {

      let id = req.params.id

      let image:Image = await imageService.get(id)

      if (image.svg) {

        res.writeHead(200, {
          'Content-Type': 'image/svg+xml',
          'Content-Length': image.svg.length
        })

        res.end(image.svg)

      } else {
        
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': image.data1024x1024.length
        })

        res.end(image.data1024x1024)

      }


    } catch (ex) {
      res.sendStatus(404)
    }

  })


  /** END SERVED PAGES */


  app.get('/api/home/:startDate', async function (req, res) {

    try {

      let startDate = dayjs(req.params.startDate).toDate()
      let season: Season = await seasonService.getByDate(startDate)

      let vm = {}

      //@ts-ignore
      let userId = req.session?.passport?.user

      if (!userId) {
        return res.json(vm)
      }

      let user: User = await userService.get(userId)
      let userVm = await userService.getViewModel(user, season)

      return res.json(Object.assign(vm, userVm))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

    return


  })


/**
 * Players
 */

  app.get('/player/image/:playerId', cacheService.cacheResponse({ tag: PLAYERS }), async function (req, res) {

    try {

      let id = req.params.playerId

      let svg = imageService.getSVG(id)

      res.writeHead(200, {
        'Content-Type': 'image/svg+xml',
        'Content-Length': svg.length
      })

      res.end(svg)

    } catch (ex) {
      res.sendStatus(404)
    }

  })

  app.get('/api/player/:playerId/:startDate', cacheService.cacheResponse({ tag: PLAYERS }), async function (req, res) {

    try {

      let startDate

      startDate = dayjs(req.params.startDate).toDate()

      let season: Season = await seasonService.getByDate(startDate)

      //We need the current date so refresh the universe.      
      // await refreshUniverse()

      return res.json(await playerViewService.getPlayerViewModel(req.params.playerId, season))
    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })

  app.get('/api/player/list/:rank/:startDate/:page', async function (req, res) {

    try {
      let startDate = dayjs(req.params.startDate).toDate()
      let rank = parseIntWithException(req.params.rank)

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }


      let league:League
      if (rank > 0) {
        league = await leagueService.getByRank(rank)
      }

      let sortColumn = req.query.sortColumn ? req.query.sortColumn.toString() : 'displayRating'
      let sortDirection = req.query.sortDirection ? req.query.sortDirection.toString() : 'DESC'
      let playerPosition = req.query.position ? req.query.position.toString() : HitterPitcher.HITTER


      if (sortDirection != 'ASC' && sortDirection != 'DESC') {
        throw new Error("Invalid sort direction.")
      }

      if (!PLAYER_STATS_SORT_EXPRESSION[sortColumn]) {
        throw new Error("Invalid sort column.")
      }

      if (playerPosition != Position.CATCHER && playerPosition != Position.FIRST_BASE && playerPosition != Position.SECOND_BASE &&
        playerPosition != Position.THIRD_BASE && playerPosition != Position.SHORTSTOP && playerPosition != Position.LEFT_FIELD &&
        playerPosition != Position.CENTER_FIELD && playerPosition != Position.RIGHT_FIELD && playerPosition != Position.PITCHER && playerPosition != HitterPitcher.HITTER) {
        throw new Error("Invalid position.")
      }

      let positions:Position[] = []

      if (playerPosition == HitterPitcher.HITTER) {
        positions = [ Position.CATCHER, Position.FIRST_BASE, Position.SECOND_BASE,
          Position.THIRD_BASE, Position.SHORTSTOP, Position.LEFT_FIELD,
          Position.CENTER_FIELD, Position.RIGHT_FIELD ]
      } else {
        positions = [playerPosition as Position]
      }

      return res.json(await playerService.getPlayerViewModels(startDate, league, positions, sortColumn, sortDirection, options))
    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

    return
  })

  app.post('/api/player/drop/:playerId', async function (req, res) {

    try {

      let playerId = req.params.playerId

      //@ts-ignore
      let userId = req.session?.passport?.user
      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }

      let user: User = await userService.get(userId)

      //Make sure this user owns this player
      let player:Player = await playerService.get(playerId)
      let season:Season = await seasonService.getMostRecent()
      
      let pls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)
      
      if (!pls.teamId) {
        throw new Error("Player is not rostered.")
      }
      
      let team:Team = await teamService.get(pls.teamId)
      
      //Must be team owner
      if (user._id != team.userId) {
        res.status(401)
        return res.send("Not authorized.")
      }

      await refreshUniverse()

      await teamService.dropPlayer(pls, player, team, season, universe.currentDate)

      //Clear cache 
      await cacheService.clearPlayersTag()
      await cacheService.clearTeamsTag()

      res.send("success")

    } catch (ex) {
      res.status(500)
      res.send(ex.message);
    }

  })

/**
 * End Players
 */


/**
 * Owners
 */

  app.get('/api/owner/list/:sort/:page', cacheService.cacheResponse({ tag: OWNERS }), async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: page * perPage }

      if (req.params.sort != OwnerSorts.TEAM_COUNT && req.params.sort != OwnerSorts.REWARDS && req.params.sort != OwnerSorts.DIAMONDS) {
        throw new Error("Invalid sort")
      }

      let owners:Owner[]

      switch (req.params.sort) {
        
        case OwnerSorts.TEAM_COUNT:
          owners = await ownerService.listByCount(options)
          break

        case OwnerSorts.DIAMONDS:
          owners = await ownerService.listByDiamonds(options)
          break
        
        case OwnerSorts.REWARDS:
          owners = await ownerService.listByOffChainDiamonds(options)
          break

      }

      return res.json(owners)
    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })



/**
 * Owners
 */




/** Game transactions */


  app.get('/api/game-transaction/on-chain/:page', async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }

      return res.json(await processedTransactionService.listWithEvents(options))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })

  app.get('/api/game-transaction/off-chain/:page', async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }

      let season:Season = await seasonService.getMostRecent()

      let events = await offchainEventService.list(ContractType.DIAMONDS, options)

      return res.json(await offchainEventService.getOffChainEventViewModels(events, season))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })

  app.get('/api/game-transaction/team/on-chain/:teamId/:page', async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }
      let teamId = req.params.teamId

      return res.json(/**await processedTransactionService.listWithEventsByToken(teamId, options)**/)

    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })

  app.get('/api/game-transaction/team/off-chain/:teamId/:page', async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }
      let teamId = req.params.teamId

      let season:Season = await seasonService.getMostRecent()
      let events = await offchainEventService.getByTeamId(ContractType.DIAMONDS, teamId, options)

      return res.json(await offchainEventService.getOffChainEventViewModels(events, season))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })

  app.get('/api/game-transaction/owner/:address/:page', async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }
      let address = req.params.address

      let owner:Owner = await ownerService.get(address)

      if (!owner) {
              return res.json({
                owner: { _id: address },
                offChainEvents: [],
                onChainEvents: []
              })
      }

      

      let season:Season = await seasonService.getMostRecent()


      let offChainEvents = await offchainEventService.getByOwner(ContractType.DIAMONDS, owner, options) //await offchainEventService.getByTokenId(ContractType.DIAMONDS, tokenId, options)      
      let offChainEventsVm = await offchainEventService.getOffChainEventViewModels(offChainEvents, season)
      let onChainEvents = await processedTransactionService.listWithEventsByAddress(address, options)

      return res.json({
        owner: owner,
        offChainEvents: offChainEventsVm,
        onChainEvents: onChainEvents
      })

    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })



  /** End game transactions */





  app.get('/api/team/date/:teamId/:startDate', async function (req, res) {

    try {

      let teamId = req.params.teamId

      let team: Team = await teamService.get(teamId)

      let startDate = dayjs(req.params.startDate).toDate()

      let season: Season = await seasonService.getByDate(startDate)

      let user:User 

      if (team.userId) {
          user = await userService.get(team.userId)
      }

      return res.json(await teamService.getTeamViewModel(team, season, universe.currentDate, user))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })


  app.get('/api/team/games/:teamId/:start', async function (req, res) {

    try {

      let teamId = req.params.teamId

      let team: Team = await teamService.get(teamId)

      let start = dayjs(req.params.start).startOf('month').toDate()
      let end = dayjs(req.params.start).endOf('month').toDate()

      return res.json(await teamService.getTeamGameLogViewModels(team, start, end))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })


  app.get('/api/team/lineup/:teamId', async function (req, res) {

    try {

      let teamId = req.params.teamId
      let team: Team = await teamService.get(teamId)

      const getTeamBundle = async (theTeam) => {
        
        let tls:TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(theTeam, season)
        let tlsPlain:TeamLeagueSeason = tls.get( { plain: true })

        let pls: PlayerLeagueSeason[] = await playerLeagueSeasonService.getMostRecentByTeam(theTeam)
        let plsPlain = pls.map( pls => pls.get({ plain: true}))

        let startingPitcher: RotationPitcher = teamService.getStartingPitcherFromPLS(tls.lineups[0].rotation, plsPlain, universe.currentDate)

        return {
          tls: tls,
          tlsPlain: tlsPlain,
          plss: pls,
          plssPlain: plsPlain,
          startingPitcher: startingPitcher,
          team: theTeam
        }

      }

      let season:Season = await seasonService.getMostRecent()

      let teamBundle = await getTeamBundle(team)

      
      teamService.validateLineup(team, teamBundle.tls.lineups[0], teamBundle.plssPlain, teamBundle.startingPitcher, universe.currentDate)

      const lineup = teamBundle.tls.lineups[0].order
        .map(p => {

          let pls 

          if (p.position == Position.PITCHER) {
            pls = teamBundle.plss.find(x => x.playerId === teamBundle.startingPitcher._id)!
          } else {
            pls = teamBundle.plss.find(x => x.playerId === p._id)!
          }
          
          const pl = pls.get({ plain: true })
          return {
            _id: pl.playerId,
            displayRating: pl.player.displayRating,
            fullName: `${pl.player.firstName} ${pl.player.lastName}`,
            firstName: pl.player.firstName,
            lastName: pl.player.lastName,
            primaryPosition: pl.primaryPosition,
            throws: pl.player.throws,
            hits: pl.player.hits,
            lastGamePlayed: pl.player.lastGamePlayed,
            lastGamePitched: pl.player.lastGamePitched
          }
        })


      res.json({
        lineup: lineup,
        startingPitcher: teamBundle.startingPitcher
      })

      return 
      

    } catch (ex) {
        res.status(500)
        res.send(ex.message)
    }

  })

  

  app.post('/api/team/roster/:teamId', async function (req, res) {

    try {

      //@ts-ignore
      let loggedInUser = req.session?.passport?.user

      if (!loggedInUser) {
        return res.sendStatus(401)
      }

      let user: User = await userService.get(loggedInUser)
      // let owner: Owner = await ownerService.get(user.address)
      let team: Team = await teamService.get(req.params.teamId)

      if (team == undefined || user._id != team.userId) {
        return res.sendStatus(401)
      }

      let roster = req.body

      if (!Array.isArray(roster.lineups)) {
        throw new Error("Invalid lineup.")
      }

      await sequelize.transaction(async (t1) => {
        let options = { transaction: t1 }
        await teamService.updateRoster(roster.lineups, team, options)
      })

      return res.json("success")

    } catch (ex) {
      console.log(ex)
      return res.status(403).send(ex.message)
    }

  })

  app.get('/api/team/withdraw/:teamId', async function (req, res) {

    try {

      //@ts-ignore
      let loggedInUser = req.session?.passport?.user

      if (!loggedInUser) {
        return res.sendStatus(401)
      }

      let user: User = await userService.get(loggedInUser)
      // let owner: Owner = await ownerService.get(user.address)
      let team: Team = await teamService.get(req.params.teamId)
      let season:Season = await seasonService.getMostRecent()

      if (team == undefined || user._id != team.userId) {
        return res.sendStatus(401)
      }

      let balance = await offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)

      if (BigInt(balance) <= BigInt(0)) {
        return res.sendStatus(400)
      }

      let mintPass:DiamondMintPass

      //Generate a mint pass
      await sequelize.transaction(async (t1) => {
        
        let options = { transaction: t1 }

        mintPass = await diamondMintPassService.generateWithdrawPass(team.userId, team._id, BigInt(balance).toString(), options)

        await offchainEventService.createTeamBurnEvent(team._id, `-${balance}`, options)

        //Refetch tls so it's part of this transaction
        let tls = await teamLeagueSeasonService.getByTeamSeason(team, season, options)

        //Reset cash balance on season finance for team
        tls.financeSeason.diamondBalance = "0"

        tls.changed("financeSeason", true)

        await teamLeagueSeasonService.put(tls, options)

      })

      return res.json(mintPass)

    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })


  app.get('/api/team/team-mint-pass/:teamId', async function (req, res) {

    try {

      //@ts-ignore
      let loggedInUser = req.session?.passport?.user

      if (!loggedInUser) {
        return res.sendStatus(401)
      }

      let teamId = req.params.teamId

      let user: User = await userService.get(loggedInUser)

      if (!user.address) {
        return res.sendStatus(401)
      }

      let teamMintPasses = await teamMintPassService.getByAddressAndTeamId(user.address, teamId)

      let diamondPass = teamMintPasses.find( mp => mp.totalDiamonds != undefined)
      let ethPass = teamMintPasses.find( mp => mp.ethCost != undefined)

      return res.json({
        eth: ethPass,
        diamond: diamondPass
      })


    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })

  app.get('/api/league/list', cacheService.cacheResponse({ tag: TEAMS }), async function (req, res) {

    try {

      let leagues: League[] = await leagueService.listByRankAsc()

      return res.json(leagues.map( l => { 
        return {
          _id: l._id,
          name: l.name,
          rank: l.rank
        }
      }))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

    return
  })

  app.get('/api/league/standings/:leagueRank/:page/:startDate', cacheService.cacheResponse({ tag: TEAMS }), async function (req, res) {

    try {

      let rank = req.params.leagueRank ? parseIntWithException(req.params.leagueRank) : 1

      let leagues:League[] = await leagueService.listByRankAsc()
      let league: League = leagues.find( l => l.rank == rank)

      let seasons: Season[] = await seasonService.list(100, 0)

      let startDate = req.params.startDate

      let season

      if (startDate) {
        season = seasons.find(s => dayjs(s.startDate).format("YYYY-MM-DD") == startDate)
      } else {
        season = seasons[0]
      }


      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }

      let vm = await teamService.getStandingsViewModel(seasons,leagues, league, season, options)
      vm['page'] = page

      return res.json(vm)

    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

    return
  })


  /** 
   * END TEAMS 
   * 
  * */


  /**
   * GAMES
   */


  app.get('/api/game/list/:rank/:date', async function (req, res) {

    try {

      let allLeagues: League[] = await leagueService.listByRankAsc()
      let league:League = allLeagues.find( l => l.rank == parseIntWithException(req.params.rank))
      let date = dayjs(req.params.date).toDate()

      let vm = await gameService.getGames(date, league)

      //@ts-ignore
      vm.allLeagues = allLeagues.map( l => { return { _id: l._id, rank: l.rank } })

      return res.json(vm)
    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

    return
  })

  app.get('/api/game/view/:id', async function (req, res) {

    try {
      let gameId = req.params.id
      return res.json(await gameService.get(gameId))
    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })

  app.post('/api/game/play/bot', async function (req, res) {

      try {

          //@ts-ignore
          let userId = req.session?.passport?.user

          if (!userId) {
            res.status(401)
            return res.send("Not authorized.")
          }

          let user:User = await userService.get(userId)
          let teams:Team[] = await teamService.getByUser(user)
          let team = teams[0]

          let inProgressGames:Game[] = await gameService.getInProgressByTeam(team)

          if (inProgressGames.length > 0) {
            res.status(500)
            return res.send("Game in progress")
          }

          const getTeamBundle = async (theTeam) => {
            
            let tls:TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(theTeam, season)
            let tlsPlain:TeamLeagueSeason = tls.get( { plain: true })

            let pls: PlayerLeagueSeason[] = await playerLeagueSeasonService.getMostRecentByTeam(theTeam)
            let plsPlain = pls.map( pls => pls.get({ plain: true}))

            let startingPitcher: RotationPitcher = teamService.getStartingPitcherFromPLS(tls.lineups[0].rotation, plsPlain, universe.currentDate)

            return {
              tls: tls,
              tlsPlain: tlsPlain,
              plss: pls,
              plssPlain: plsPlain,
              startingPitcher: startingPitcher,
              team: theTeam
            }

          }

          

          let season:Season = await seasonService.getMostRecent()

          //Find bot match.
          let bot:Team = await teamService.getClosetRatedBot(team.longTermRating.rating)

          let teamBundle = await getTeamBundle(team)

          if (teamBundle.startingPitcher.stamina < 1) {
            throw new Error("No rested pitcher available.")
          }

          let botBundle = await getTeamBundle(bot)

          //Validate rosters and lineups.
          teamService.validateLineup(team, teamBundle.tls.lineups[0], teamBundle.plssPlain, teamBundle.startingPitcher, universe.currentDate)
          teamService.validateLineup(bot, botBundle.tls.lineups[0], botBundle.plssPlain, botBundle.startingPitcher, universe.currentDate)

          
          let isHome = Math.random() >= .5

          let awayBundle = isHome ? botBundle : teamBundle
          let homeBundle = isHome ? teamBundle : botBundle

          let game

          await sequelize.transaction(async (t1) => {
        
            let options = { transaction: t1 }

            game = await gameService.scheduleGame({
              league: teamBundle.tlsPlain.league,
              season: season,
              awayTLS: awayBundle.tlsPlain,
              homeTLS: homeBundle.tlsPlain,
              startDate: new Date(new Date().toUTCString()),
            }, options)

            //Create game-player association
            let playerIds = [].concat(awayBundle.plss.map( pls => pls.playerId)).concat(homeBundle.plss.map( pls => pls.playerId))
            let players:Player[] = await playerService.getByIds(playerIds, options)

            await gameService.createGamePlayers(game, playerIds, options)

            gameService.startGame({
              
              game: game,

              homeTLS: homeBundle.tls, 
              awayTLS: awayBundle.tls,

              awayPlayers: awayBundle.plss,
              homePlayers: homeBundle.plss,

              away: awayBundle.team,
              home: homeBundle.team,

              awayStartingPitcher: awayBundle.startingPitcher,
              homeStartingPitcher: homeBundle.startingPitcher,

              date: universe.currentDate,
              leagueAverageRatings: teamBundle.tlsPlain.league.averageRating
              
            })

            await gameService.put(game, options)

            let home:Team = await teamService.get(homeBundle.team._id)
            let away:Team = await teamService.get(awayBundle.team._id)

            home.lastGamePlayed = universe.currentDate
            away.lastGamePlayed = universe.currentDate

            await teamService.put(home, options)
            await teamService.put(away, options)

            //Update players last game date
            for (let player of players) {
                player.lastGamePlayed = game.startDate
            }

            //Updated pitch dates for starting pitchers
            let homePitcher = players.find( p => p._id == homeBundle.startingPitcher._id)
            homePitcher.lastGamePitched = universe.currentDate


            let awayPitcher = players.find( p => p._id == awayBundle.startingPitcher._id)
            awayPitcher.lastGamePitched = universe.currentDate

            await playerService.updateGameFields(players, options)

          })

          return res.json({
            gameId: game._id
          })


      } catch (ex) {
        res.status(500)
        res.send(ex.message)
      }



  })

  app.post('/api/game/play/pvp', async function (req, res) {

      try {

        //@ts-ignore
        let userId = req.session?.passport?.user

        if (!userId) {
          res.status(401)
          return res.send("Not authorized.")
        }

        let user:User = await userService.get(userId)
        let teams:Team[] = await teamService.getByUser(user)
        let team = teams[0]

        let inProgressGames:Game[] = await gameService.getInProgressByTeam(team)

        if (inProgressGames.length > 0) {
          res.status(500)
          return res.send("Game in progress")
        }

        //Check if they are already in the queue.

        // return res.json(vm)

      } catch (ex) {
        console.log(ex)
        res.sendStatus(404)
      }
    



  })

  app.get('/api/cities', cacheService.cacheResponse(), async function(req, res) {
    return res.json(await cityService.list(1000, 0))
  })

  /**
   * END GAMES
   */


  


  /** AUTHENTICATION */


  app.get('/auth/token/:address', async function (req, res) {

    try {

      let address = req.params.address

      if (!ethers.isAddress(address)) {
        res.status(500)
        return res.send("Invalid wallet.")
      }
  
      let signatureToken = await signatureTokenService.getOrCreate(address)
  
      res.send({
        token: signatureToken.token,
      })
      
    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })

  app.post('/auth/link', async function (req, res) {

    try {

      //@ts-ignore
      let userId = req.session?.passport?.user

      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }

      let params = req.body

      let recoveredAddress = await connectService.connectAddressToUser(userId, params.message, params.signature)

      res.send({
        _id: userId,
        address: recoveredAddress
      })

    } catch (ex) {
      res.status(500)
      res.send(ex.message);
    }

  })

  app.post('/auth/unlink', async function (req, res, next) {

    try {

      //@ts-ignore
      let userId = req.session?.passport?.user

      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }

      let user: User = await userService.get(userId)
      user.address = null

      await userService.put(user)
      res.send("success")


    } catch (ex) {
      res.status(500)
      res.send(ex.message);
    }

  })

  app.get('/auth/info', async function (req, res) {

    try {

      //@ts-ignore
      let userId = req.session?.passport?.user

      if (!userId) {
        return res.send()
      }

      let user: User = await userService.get(userId)

      return res.json(await userService.getAuthInfo(user))

    } catch (ex) {
      res.status(500)
      res.send(ex.message);
    }


  })

  app.get('/auth/discord', passport.authenticate('discord'))

  app.get('/auth/discord/callback',
    passport.authenticate('discord', {
      failureRedirect: '/auth/discord',
    }),
    (req, res) => {
      res.redirect('/#!/')
    }
  )

  app.get('/auth/logout', function (req, res, next) {
    //@ts-ignore
    req.logout(function (err) {
      if (err) { return next(err) }
      res.redirect('/')
    })
  })

  /** END AUTHENTICATION */






  //** ADMIN */

  //** */

  //Serve the main website files right from this instance
  app.use(express.static(`${config.runDir}/public`))

  const PORT = process.env.WEB_PORT ? process.env.WEB_PORT : 8080

  /** WEBSOCKETS */
  socketService.init(server, sessionMiddleware)
  /** END WEBSOCKETS */

  server.listen(PORT, () => {
    console.log(`EBL listening on port ${PORT}`)
  })



  const gameLoop = async () => {

    console.time(`Game loop`)


    //Simulate games 
    let gameIds = await ladderService.runGameRunner(universe._id)

    if (gameIds?.length > 0) {

      let updatedGames = await gameService.getByIds(gameIds)

      for (let game of updatedGames) {
        //Send websocket updates to connected clients.
        socketService.gameUpdate(game)

      }
      
    }



    console.timeEnd(`Game loop`)

    setTimeout(async () => { await gameLoop() }, SECONDS_BETWEEN_SIMS*1000)
  }

  if (!config.skipSim) {
    await gameLoop()
  }




  console.log(`
***********************************
* Web server started ${version}  *
* *********************************
    `)

}

export {
  startWebServer
}

