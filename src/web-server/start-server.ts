
import passport from 'passport'
import { v4 as uuidv4 } from 'uuid';

import { getContainer, setConfig, setDiamondsAddress, setUniverse } from "./inversify.config.js"

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
import { DiamondMintPass,  Team } from "../dto/team.js"
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
import { ContractType, HitterPitcher, OwnerSorts, PLAYER_STATS_SORT_EXPRESSION, SeasonInfo } from '../service/enums.js'
import { TeamLeagueSeason } from '../dto/team-league-season.js'
import { ProcessedTransactionService } from '../service/data/processed-transaction-service.js'
import { DiamondMintPassService } from '../service/data/diamond-mint-pass-service.js'

import { Eta } from "eta"
import { CityService } from '../service/data/city-service.js'

import http from 'http'
import { SocketService } from '../service/socket-service.js'
import { LadderService } from '../service/ladder-service.js'
import { TeamQueueService } from '../service/data/team-queue-service.js'
import { PitchingRoleType, Position, RotationPitcher } from '../baseball-sim-engine/index.js';
import { TeamTransactionService } from '../service/data/team-transaction-service.js';
import { TeamMarketOfferService } from '../service/data/team-market-offer-service.js';
import { TeamMarketOffer } from '../dto/team-market-offer.js';


const TWITTER = "@ethbaseball"


const app = express()

const server = http.createServer(app)



let startWebServer = async () => {

  //@ts-ignore
  const version = VERSION

  //@ts-ignore
  const buildId = BUILD_ID

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
  const FOOTER_SCRIPT:string|undefined = process.env.FOOTER_SCRIPT

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
  let socketService:SocketService = container.get(SocketService)
  let ladderService:LadderService = container.get(LadderService)
  let teamQueueService:TeamQueueService = container.get(TeamQueueService)
  let teamTransactionService:TeamTransactionService = container.get(TeamTransactionService)
  let teamMarketOfferService:TeamMarketOfferService = container.get(TeamMarketOfferService)

  let offchainEventService:OffchainEventService = container.get(OffchainEventService)
  let processedTransactionService:ProcessedTransactionService = container.get(ProcessedTransactionService)

  
  let s = container.get("sequelize")
  let sequelize = await s()


  let universe: Universe

  while (!universe) {

    universe = await universeService.getActive()

    if (!universe) {

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


  setConfig(config)

  setUniverse(universe)


  await cacheService.init()
  await cacheService.manageTags() //starts a loop


  let leagues:League[] = await leagueService.listByRankAsc()

  const refreshUniverse = async () => {
    universe = await universeService.get(universe._id)
  }

  const parseFloatWithException = (theStr:string|undefined) => {

    if (theStr == undefined) throw new Error("Missing input.")

    let result = parseFloat(theStr)

    if (isNaN(result)) throw new Error("Error parsing float.")

    return result

  }

  const parseIntWithException = (theStr:string|undefined) => {

    if (theStr == undefined) throw new Error("Missing input.")

    let result = parseInt(theStr)

    if (isNaN(result)) throw new Error("Error parsing integer.")

    return result

  }

  const parseBoolean = (theStr:string|undefined) => {
    return (theStr === 'true')
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
      'BUILD_ID': buildId,
      'PROVIDER_CHAIN_ID': PROVIDER_CHAIN_ID,
      'PROVIDER_CHAIN_NAME': PROVIDER_CHAIN_NAME,
      'PROVIDER_CHAIN_RPC_URL': PROVIDER_CHAIN_RPC_URL,
      'PROVIDER_CHAIN_BLOCK_EXPLORER': PROVIDER_CHAIN_BLOCK_EXPLORER,
      'DIAMONDS_ADDRESS': universe.diamondAddress,
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
        leagues: leagues,
        VERSION: version,
        BUILD_ID: buildId,
        FOOTER_ROUTES: FOOTER_ROUTES,
        FOOTER_SCRIPT: FOOTER_SCRIPT,
        ENV: await getEnv()
      })

      res.status(200).send(renderedTemplate)

  }



  app.get('/health', (_req, res) => {
    return res.status(200).send('ok')
  })

  app.get('/env', async function (req, res) {
    return res.json(await getEnv())

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
          title: "Play a Baseball Game Online – Ethereum Baseball League",
          description: "Ethereum Baseball League (EBL) is an online baseball game where you run a franchise, compete against other teams, watch games live, and play through a 162-day season on top of an open baseball simulation engine.",
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
          title: `${tlsPlain.city?.name ? tlsPlain.city.name : ''} ${tlsPlain.team.name} Results - Ethereum Baseball League`,
          description: `View the results for ${tlsPlain.city?.name ? tlsPlain.city.name : ''} ${tlsPlain.team.name} in Ethereum Baseball League.`,
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

  app.get("/t/activity/on/:teamId", async function (req, res) {

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

        await refreshUniverse()
        
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

  app.get("/activity/on", async function (req, res) {

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

  app.get("/offers", async function (req, res) {

      try {

        await refreshUniverse()

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `Offers - Ethereum Baseball League`,
          description: `View offers in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/offers/user", async function (req, res) {

      try {

        await refreshUniverse()

        await renderIndex(res,{ 
          twitter: TWITTER,
          title: `User Listings - Ethereum Baseball League`,
          description: `View your listings in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/ebl-512.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })



  /** END SERVED PAGES */


  app.get('/api/home/:startDate', async function (req, res) {

    try {

      let startDate = dayjs(req.params.startDate).toDate()
      let season: Season = await seasonService.getByDate(startDate)

      if (!season) {
        throw new Error("Season not found for date.")
      }

      let vm = {}

      //@ts-ignore
      let userId = req.session?.passport?.user

      if (!userId) {
        return res.json(vm)
      }

      await refreshUniverse()

      let user: User = await userService.get(userId)
      let userVm = await userService.getViewModel(universe.currentDate, user, season)

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

  app.get('/api/player/:playerId/:startDate', async function (req, res) {

    try {

      //@ts-ignore
      let userId = req.session?.passport?.user

      let user:User = await userService.get(userId)

      let startDate = dayjs(req.params.startDate).toDate()

      let season: Season = await seasonService.getByDate(startDate)


      return res.json(await playerViewService.getPlayerViewModel(user, req.params.playerId, season))
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

      let rankOneLeague
      let league:League
      if (rank > 0) {
        league = await leagueService.getByRank(rank)
      }

      if (league?.rank == 1) {
        rankOneLeague = league
      } else {
        rankOneLeague = await leagueService.getByRank(1)
      }


      let sortColumn = req.query.sortColumn ? req.query.sortColumn.toString() : 'overallRating'
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

      await refreshUniverse()

      await sequelize.transaction(async (t1) => {
      
          let options = { transaction: t1 }

          let user: User = await userService.get(userId, options)

          //Make sure this user owns this player
          let player:Player = await playerService.get(playerId, options)
          
          await teamTransactionService.dropPlayer(user, player, universe.currentDate, options)

      })

      //Clear cache 
      await cacheService.clearPlayersTag()
      await cacheService.clearTeamsTag()

      return res.send("success")

    } catch (ex) {
      res.status(500)
      res.send(ex.message);
    }

  })

  app.post('/api/player/sign/:playerId', async function (req, res) {

    try {

      let playerId = req.params.playerId

      //@ts-ignore
      let userId = req.session?.passport?.user
      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }

      await refreshUniverse()

      await sequelize.transaction(async (t1) => {
      
          let options = { transaction: t1 }

          let user: User = await userService.get(userId, options)
          let teams:Team[] = await teamService.getByUser(user, options)
          let team = teams[0]

          let player:Player = await playerService.get(playerId, options)
          
          let offChainEventTransactionId = uuidv4()
          await teamTransactionService.signFreeAgent(user, player, team, universe.currentDate, offChainEventTransactionId, options)

      })

      //Clear cache 
      await cacheService.clearPlayersTag()
      await cacheService.clearTeamsTag()

      return res.send("success")

    } catch (ex) {
      console.log(ex)
      res.status(500)
      res.send(ex.message);
    }

  })

  app.post('/api/player/activate/:playerId/:teamId', async function (req, res) {

    try {

      let playerId = req.params.playerId
      let teamId = req.params.teamId

      //@ts-ignore
      let userId = req.session?.passport?.user
      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }

      await refreshUniverse()

      await sequelize.transaction(async (t1) => {
      
          let options = { transaction: t1 }

          let user: User = await userService.get(userId, options)
          let team:Team = await teamService.get(teamId, options)

          if (team.userId != user._id) {
            throw new Error("Not authorized.")
          }

          let player:Player = await playerService.get(playerId, options)
          
          await teamTransactionService.activatePlayer(user, team, player, universe.currentDate, options)

      })

      //Clear cache 
      await cacheService.clearPlayersTag()
      await cacheService.clearTeamsTag()

      return res.send("success")

    } catch (ex) {
      console.log(ex)
      res.status(500)
      res.send(ex.message);
    }

  })

  app.post('/api/player/deactivate/:playerId', async function (req, res) {

    try {

      let playerId = req.params.playerId

      //@ts-ignore
      let userId = req.session?.passport?.user
      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }

      await refreshUniverse()

      await sequelize.transaction(async (t1) => {
      
          let options = { transaction: t1 }

          let user: User = await userService.get(userId, options)
          let teams:Team[] = await teamService.getByUser(user, options)
          let team = teams[0]

          let player:Player = await playerService.get(playerId, options)
          
          await teamTransactionService.deactivatePlayer(user, team, player, universe.currentDate, options)

      })

      //Clear cache 
      await cacheService.clearPlayersTag()
      await cacheService.clearTeamsTag()

      return res.send("success")

    } catch (ex) {
      console.log(ex)
      res.status(500)
      res.send(ex.message);
    }

  })

  app.post('/api/player/list-for-sale/:playerId', async function (req, res) {

    try {

      let playerId = req.params.playerId

      let listPrice = req.body.listPrice


      //@ts-ignore
      let userId = req.session?.passport?.user
      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }

      await sequelize.transaction(async (t1) => {
      
          let options = { transaction: t1 }

          let user: User = await userService.get(userId, options)
          let player:Player = await playerService.get(playerId, options)
          
          await teamTransactionService.createPlayerSaleListing(user, player, listPrice, options)

      })

      return res.send("success")

    } catch (ex) {
      console.log(ex)
      res.status(500)
      res.send(ex.message);
    }

  })

  app.post('/api/player/cancel-sales-listing/:playerId', async function (req, res) {

    try {

      let playerId = req.params.playerId


      //@ts-ignore
      let userId = req.session?.passport?.user
      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }

      await refreshUniverse()

      await sequelize.transaction(async (t1) => {
      
          let options = { transaction: t1 }

          let user: User = await userService.get(userId, options)
          let player:Player = await playerService.get(playerId, options)

  
          await teamTransactionService.cancelPlayerSaleListings(user, player, options)

      })

      //Clear cache 
      await cacheService.clearPlayersTag()
      await cacheService.clearTeamsTag()

      return res.send("success")

    } catch (ex) {
      console.log(ex)
      res.status(500)
      res.send(ex.message);
    }

  })

  app.post('/api/player/bid/:playerId', async function (req, res) {

    try {

      let playerId = req.params.playerId

      let bidPrice = req.body.bidPrice


      //@ts-ignore
      let userId = req.session?.passport?.user
      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }

      await refreshUniverse()

      await sequelize.transaction(async (t1) => {
      
          let options = { transaction: t1 }

          let user: User = await userService.get(userId, options)
          let player:Player = await playerService.get(playerId, options)

  
          await teamTransactionService.createPlayerBuyOffer(user, player, bidPrice)

      })

      //Clear cache 
      await cacheService.clearPlayersTag()
      await cacheService.clearTeamsTag()

      return res.send("success")

    } catch (ex) {
      console.log(ex)
      res.status(500)
      res.send(ex.message);
    }

  })  

  app.post('/api/player/cancel-bid/:bidId', async function (req, res) {

    try {

      let bidId = req.params.bidId


      //@ts-ignore
      let userId = req.session?.passport?.user
      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }


      await sequelize.transaction(async (t1) => {
      
          let options = { transaction: t1 }

          let user: User = await userService.get(userId, options)
          let tmo:TeamMarketOffer = await teamMarketOfferService.get(bidId, options)

          await teamTransactionService.cancelPlayerBuyOffer(user, tmo, options)

      })

      //Clear cache 
      await cacheService.clearPlayersTag()
      await cacheService.clearTeamsTag()

      return res.send("success")

    } catch (ex) {
      console.log(ex)
      res.status(500)
      res.send(ex.message);
    }

  })   

  app.post('/api/player/accept-bid', async function (req, res) {

    try {

      let bidId = req.body.bidId

      //@ts-ignore
      let userId = req.session?.passport?.user
      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }


      await sequelize.transaction(async (t1) => {
      
          let options = { transaction: t1 }

          let user: User = await userService.get(userId, options)
          let highestbid:TeamMarketOffer = await teamMarketOfferService.get(bidId, options)
          let player:Player = await playerService.get(highestbid.salePlayerId, options)
          let date:Date = new Date(new Date().toUTCString())

          await teamTransactionService.acceptHighestPlayerBuyOffer(user, player, highestbid, date, options)

      })


      return res.send("success")

    } catch (ex) {
      console.log(ex)
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


/** Offers */


  app.get('/api/offer/list/:page', async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }
      
      let offers:TeamMarketOffer[] = await teamMarketOfferService.listPendingSaleListings(options)
      let offerVms = await teamMarketOfferService.getTeamMarketOfferViewModels(offers)


      return res.json(offerVms)

    } catch (ex) {
      console.log(ex)
      res.status(500)
      res.send(ex.message);
    }

  })

  app.get('/api/offer/user', async function (req, res) {

    try {

      //@ts-ignore
      let userId = req.session?.passport?.user

      let user: User = await userService.get(userId)

      if (!user) {
        res.status(401)
        return res.send("Not authorized.")
      }

      
      let listings:TeamMarketOffer[] = await teamMarketOfferService.listSaleListingsBySellerUserId(user._id)
      let listingsVms = await teamMarketOfferService.getTeamMarketOfferViewModels(listings)

      let bids:TeamMarketOffer[] = await teamMarketOfferService.listPendingByBuyerUserId(user._id)
      let bidsVms = await teamMarketOfferService.getTeamMarketOfferViewModels(bids)

      let highestBids:TeamMarketOffer[] = await teamMarketOfferService.getHighestBidsForUserPlayers(user._id)
      let highestBidsVms = await teamMarketOfferService.getTeamMarketOfferViewModels(highestBids)

      return res.json({
        listings: listingsVms,
        bids: bidsVms,
        highestBids: highestBidsVms
      })

    } catch (ex) {
      console.log(ex)
      res.status(500)
      res.send(ex.message);
    }

  })


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

      let events = await offchainEventService.listByPage(options)

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

      let team:Team = await teamService.get(teamId)
      let user:User = await userService.get(team.userId)

      let result

      if (user.address) {
        result = await processedTransactionService.listWithEventsByAddress(user.address, options)
      } else {
        result = {
            transactions: [],
            teams: []
        }
      }

      return res.json(result)

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
      let events = await offchainEventService.getByTeamId(teamId, options)

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


  app.get('/team/image/60/:teamId', cacheService.cacheResponse({ tag: TEAMS }), async function (req, res) {

    try {

      let id = req.params.teamId

      let team:Team = await teamService.get(id)
      let tls:TeamLeagueSeason = await teamLeagueSeasonService.getMostRecent(team)

      let image:Image = await imageService.get(tls.logoId)

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

  app.get('/api/team/date/:teamId/:startDate', async function (req, res) {

    try {

      let teamId = req.params.teamId

      let team: Team = await teamService.get(teamId)

      let startDate = dayjs(req.params.startDate).toDate()

      await refreshUniverse()


      let season: Season = await seasonService.getByDate(startDate)
      let seasonInfo:SeasonInfo = await seasonService.getSeasonInfo(season, universe.currentDate)

      let user:User 


      if (team.userId) {
          user = await userService.get(team.userId)
      }

      return res.json(await teamService.getTeamViewModel(team, season, seasonInfo, user))

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

  app.post('/api/team/roster/:teamId', async function (req, res) {

    try {

      //@ts-ignore
      let loggedInUser = req.session?.passport?.user

      if (!loggedInUser) {
        return res.sendStatus(401)
      }

      let user: User = await userService.get(loggedInUser)
      let team: Team = await teamService.get(req.params.teamId)

      if (team == undefined || user._id != team.userId) {
        return res.sendStatus(401)
      }

      let roster = req.body

      if (!roster || typeof roster != "object" || Array.isArray(roster)) {
        throw new Error("Invalid roster.")
      }

      if (!Array.isArray(roster.lineups)) {
        throw new Error("Invalid lineup.")
      }

      if (roster.lineups.length < 1) {
        throw new Error("Invalid lineup.")
      }

      for (let lineup of roster.lineups) {

        if (!lineup || typeof lineup != "object" || Array.isArray(lineup)) {
          throw new Error("Invalid lineup.")
        }

        if (!Array.isArray(lineup.order)) {
          throw new Error("Invalid lineup order.")
        }

        if (!Array.isArray(lineup.rotation)) {
          throw new Error("Invalid rotation.")
        }

        if (!Array.isArray(lineup.availablePitchers)) {
          throw new Error("Invalid bullpen.")
        }

        if (lineup.valid != undefined && typeof lineup.valid != "boolean") {
          throw new Error("Invalid lineup valid flag.")
        }

        for (let lineupPlayer of lineup.order) {

          if (!lineupPlayer || typeof lineupPlayer != "object" || Array.isArray(lineupPlayer)) {
            throw new Error("Invalid lineup player.")
          }

          if (lineupPlayer._id != undefined && typeof lineupPlayer._id != "string") {
            throw new Error("Invalid lineup player.")
          }

          if (lineupPlayer.position != undefined && !Object.values(Position).includes(lineupPlayer.position)) {
            throw new Error("Invalid lineup position.")
          }

        }

        for (let rotationPitcher of lineup.rotation) {

          if (!rotationPitcher || typeof rotationPitcher != "object" || Array.isArray(rotationPitcher)) {
            throw new Error("Invalid rotation pitcher.")
          }

          if (rotationPitcher._id != undefined && typeof rotationPitcher._id != "string") {
            throw new Error("Invalid rotation pitcher.")
          }

        }

        for (let pitchingRole of lineup.availablePitchers) {

          if (!pitchingRole || typeof pitchingRole != "object" || Array.isArray(pitchingRole)) {
            throw new Error("Invalid bullpen pitcher.")
          }

          if (pitchingRole.playerId != undefined && typeof pitchingRole.playerId != "string") {
            throw new Error("Invalid bullpen pitcher.")
          }

          if (!Object.values(PitchingRoleType).includes(pitchingRole.role)) {
            throw new Error("Invalid bullpen role.")
          }

          if (!Number.isInteger(pitchingRole.priority) || pitchingRole.priority < 1) {
            throw new Error("Invalid bullpen priority.")
          }

        }

      }

      let isQueued = await teamQueueService.isTeamQueued(team)

      if (isQueued) {
        throw new Error("Can not update lineup after entering queue.")
      }

      await sequelize.transaction(async (t1) => {
        let options = { transaction: t1 }

        await teamTransactionService.updateRoster(roster.lineups, team, options)
      })

      return res.json("success")

    } catch (ex) {
      console.log(ex)
      return res.status(403).send(ex.message)
    }

  })

  app.post('/api/team/budget/:teamId', async function (req, res) {

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


      let budgetPercent = parseIntWithException(req.body.budgetPercent)

      if (budgetPercent < 0 || budgetPercent > 100) {
        throw new Error("Invalid budget amount.")
      }


      team.developmentStrategy.budgetPercent = budgetPercent
      team.changed('developmentStrategy', true)

      await teamService.put(team)

      return res.json("success")

    } catch (ex) {
      console.log(ex)
      return res.status(403).send(ex.message)
    }

  })

  app.get('/api/team/mint', async function (req, res) {

    try {

      //@ts-ignore
      let loggedInUser = req.session?.passport?.user

      if (!loggedInUser) {
        return res.sendStatus(401)
      }

      let user: User = await userService.get(loggedInUser)
      let teams: Team[] = await teamService.getByUser(user)
      let team = teams[0]

      if (!user.address) {
        return res.sendStatus(401)
      }

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

        mintPass = await diamondMintPassService.generateMintPass(team.userId, user.address, BigInt(balance).toString(), options)

        let offChainEventTransactionId = uuidv4()
        await offchainEventService.createTeamBurnEvent(team._id, balance, offChainEventTransactionId, options)

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

      await refreshUniverse()

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }

      let vm = await teamService.getStandingsViewModel(universe.currentDate, seasons,leagues, league, season, options)
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


  app.get('/api/game/list/:rank', async function (req, res) {

    try {

      let allLeagues: League[] = await leagueService.listByRankAsc()
      let league:League = allLeagues.find( l => l.rank == parseIntWithException(req.params.rank))


      let vm = await gameService.getGames(league, { limit: 25 })

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

  app.post('/api/game/queue', async function (req, res) {

    try {

      
        //@ts-ignore
        let userId = req.session?.passport?.user

        if (!userId) {
          res.status(401)
          return res.send("Not authorized.")
        }

        const expandRange = parseBoolean(req.query.expandRange as string)



        await refreshUniverse()

        let user:User = await userService.get(userId)
        let season:Season = await seasonService.getMostRecent()

        if (!season) {
          throw new Error("No active season.")
        }


        let teams:Team[] = await teamService.getByUser(user)
        let team = teams[0]

        if (!team) {
          throw new Error("Team not found.")
        }


        let isQueued = await teamQueueService.isTeamQueued(team)

        if (isQueued) {
          throw new Error("Team is already queued.")
        }

        let tls:TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        if (!tls) {
          throw new Error("Team season not found.")
        }


        let seasonInfo:SeasonInfo = seasonService.getSeasonInfo(season, universe.currentDate)
        let gamesPlayed = tls.overallRecord.wins + tls.overallRecord.losses 

        const inProgressGames = await gameService.getInProgressByTeam(team)

        if (inProgressGames?.length > 0) {
          throw new Error("Can not join queue while team has a game in progress.")
        }

        if (gamesPlayed >= seasonInfo.dayNumber) {
          throw new Error("All caught up on games. Join the queue again at 9:30AM eastern time.")
        }


        let league:League = await leagueService.get(tls.leagueId)

        let plss: PlayerLeagueSeason[] = await playerLeagueSeasonService.getMostRecentByTeamSeason(team, season)
        let startingPitcher:RotationPitcher = teamService.getStartingPitcherFromPLS(tls.lineups[0].rotation, plss)

        teamService.validateLineup(team, tls.lineups[0], plss.map( pls => pls.get({ plain: true})), startingPitcher)


        let teamRating = (team.longTermRating.rating + team.seasonRating.rating) / 2


        await teamQueueService.queueTeam(team, league, teamRating, 25, expandRange)

        return res.send("success")

    } catch (ex:any) {      
      res.status(500)
      return res.send(ex.message)
    }

  })

  app.post('/api/game/dequeue', async function (req, res) {

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

        await sequelize.transaction(async (t1) => {

          let options = { transaction: t1 }

          let isQueued = await teamQueueService.isTeamQueued(team, options)

          if (!isQueued) {
            throw new Error("Team is not queued.")
          }

          await teamQueueService.dequeueTeam(team, options)
        })


        return res.send("success")

    } catch (ex:any) {      
      console.log(ex)
      res.sendStatus(500)
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
      let season = await seasonService.getMostRecent()


      return res.json(await userService.getAuthInfo(user, season))

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
      res.redirect('/')
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

    if (gameIds?.allGameIds?.length > 0) {

      let updatedGames = await gameService.getByIds(gameIds?.allGameIds)

      for (let game of updatedGames) {

        if (gameIds.startedGameIds?.includes(game._id)) {

          let homeTeam:Team = await teamService.get(game.home._id)
          let homeUser:User = await userService.get(homeTeam.userId)


          let awayTeam:Team = await teamService.get(game.away._id)
          let awayUser:User = await userService.get(awayTeam.userId)

          socketService.queueGameStarted([homeUser._id, awayUser._id], game)

        }

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



  // await playerService.updateAllRatings()



  console.log(`
***********************************
* Web server started ${version}  *
* *********************************
    `)

}

export {
  startWebServer
}

