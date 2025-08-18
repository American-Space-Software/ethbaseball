
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
import { PlayerService } from "../service/player-service.js"
import { Player } from "../dto/player.js"
import { Image } from "../dto/image.js"

import { PlayerViewService } from "../service/player-view-service.js"
import { OwnerService } from "../service/owner-service.js"

import connectSessionSequelize from "connect-session-sequelize"
import { UserService } from "../service/user-service.js"
import { User } from "../dto/user.js"
import { DiamondMintPass, Team } from "../dto/team.js"
import { TeamService } from "../service/team-service.js"
import { GameService } from "../service/game-service.js"
import { UniverseService } from "../service/universe-service.js"
import { Universe } from "../dto/universe.js"
import dayjs from "dayjs"
import { ImageService } from '../service/image-service.js'
import { CacheService, ENV_TAG, IMAGES, OWNERS, PLAYERS, TEAMS } from '../service/cache-service.js'
import { SignatureTokenService } from '../service/signature-token-service.js'
import { ethers } from 'ethers'
import { LeagueService } from '../service/league-service.js'
import { League } from '../dto/league.js'
import { SeasonService } from '../service/season-service.js'
import { Season } from '../dto/season.js'
import { GameTransactionService } from '../service/game-transaction-service.js'
import { PlayerLeagueSeason } from '../dto/player-league-season.js'
import { PlayerLeagueSeasonService } from '../service/player-league-season-service.js'
import { TeamLeagueSeasonService } from '../service/team-league-season-service.js'

import { OffchainEventService } from '../service/offchain-event-service.js'
import { ContractType, OwnerSorts, TeamCost } from '../service/enums.js'
import { TeamLeagueSeason } from '../dto/team-league-season.js'
import { PostService } from '../service/post-service.js'
import { Post } from '../dto/post.js'
import { ProcessedTransactionService } from '../service/processed-transaction-service.js'
import { DiamondMintPassService } from '../service/diamond-mint-pass-service.js'
import { TeamMintPassService } from '../service/team-mint-pass-service.js'
import { TeamMintPass } from '../dto/team-mint-pass.js'

import { Eta } from "eta"

const TWITTER = "@ethbaseball"






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

  const PROVIDER_CHAIN_ID = process.env.PROVIDER_CHAIN_ID ? parseInt(process.env.PROVIDER_CHAIN_ID) : 1337
  const PROVIDER_CHAIN_NAME = process.env.PROVIDER_CHAIN_NAME ? process.env.PROVIDER_CHAIN_NAME : "localhost"
  const PROVIDER_CHAIN_RPC_URL = process.env.PROVIDER_CHAIN_RPC_URL ? process.env.PROVIDER_CHAIN_RPC_URL : "http://127.0.0.1:8545/"
  const PROVIDER_CHAIN_BLOCK_EXPLORER = process.env.PROVIDER_CHAIN_BLOCK_EXPLORER





  const app = express()
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
  let gameTransactionService:GameTransactionService = container.get(GameTransactionService)
  let playerLeagueSeasonService:PlayerLeagueSeasonService = container.get(PlayerLeagueSeasonService)
  let teamLeagueSeasonService:TeamLeagueSeasonService = container.get(TeamLeagueSeasonService)
  let diamondMintPassService:DiamondMintPassService = container.get(DiamondMintPassService)
  let teamMintPassService:TeamMintPassService = container.get(TeamMintPassService)

  let offchainEventService:OffchainEventService = container.get(OffchainEventService)
  let postService:PostService = container.get(PostService)
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

  app.use(
    session({
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
  )

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


  //Passport middleware
  app.use(passport.initialize())
  app.use(passport.session() as RequestHandler)

  const renderIndex = (res, props) => {

      const renderedTemplate = eta.render("index.ejs", { 
        route: props.route,
        title: props.title,
        description: props.description,
        image: props.image ? props.image : '',
        url: `${process.env.WEB}${props.url}`,
        twitter: TWITTER,
        VERSION: version
      })

      res.status(200).send(renderedTemplate)

  }


  app.get('/env', cacheService.cacheResponse({ tag: ENV_TAG }), async function (req, res) {

    let season = await seasonService.getMostRecent()
    await refreshUniverse()

    return res.json({
      'WEB': process.env.WEB,
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
      'IPFS_CID': universe.ipfsCid
    })

  })


  /** We need one of these for each client-side route. Maybe there's a better way to automate it. 
   * If a user navigates to a page in the client and then hits refresh in the browser we need to return
   * the index page that loads the javascript, etc. Also it needs twitter/og meta tags because if a user shares
   * a link it reads those.
   *  
  */
  app.get("/", async function (req, res) {

      try {

        renderIndex(res,{ 
          twitter: TWITTER,
          title: "Ethereum Baseball League - Step Into the Owner’s Box. The League Awaits.",
          description: "Ethereum Baseball League (EBL) is a competitive PvP sports ownership and business simulator. Build a winning team, manage your finances, and outmaneuver real opponents in a player-driven economy where teams and Diamonds are bought, sold, and earned. ",
          VERSION: version,
          image: `${process.env.WEB}/logo.png`,
          url: req.originalUrl
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/t/:tokenId", async function (req, res) {

      try {

        let team: Team = await teamService.getByTokenId(parseIntWithException(req.params.tokenId))
        let season:Season = await seasonService.getMostRecent()
        let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })


        renderIndex(res,{ 
          twitter: TWITTER,
          title: `${tlsPlain.city.name} ${tlsPlain.team.name} - Ethereum Baseball League`,
          description: `${tlsPlain.city.name} ${tlsPlain.team.name} is a franchise in Ethereum Baseball League.`,
          VERSION: version,
          image: `${process.env.WEB}/image/thumbnail/1024/${tlsPlain.logoId}`,
          url: req.originalUrl

        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/t/schedule/:tokenId", async function (req, res) {

      try {

        let team: Team = await teamService.getByTokenId(parseIntWithException(req.params.tokenId))
        let season:Season = await seasonService.getMostRecent()
        let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })


        renderIndex(res,{ 
          twitter: TWITTER,
          title: `${tlsPlain.city.name} ${tlsPlain.team.name} Schedule - Ethereum Baseball League`,
          description: `View the schedule for ${tlsPlain.city.name} ${tlsPlain.team.name} in Ethereum Baseball League.`,
          VERSION: version,
          image: `${process.env.WEB}/image/thumbnail/1024/${tlsPlain.logoId}`,
          url: req.originalUrl

        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/t/activity/:tokenId", async function (req, res) {

      try {

        let team: Team = await teamService.getByTokenId(parseIntWithException(req.params.tokenId))
        let season:Season = await seasonService.getMostRecent()
        let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })

        renderIndex(res,{ 
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

  app.get("/t/activity/off/:tokenId", async function (req, res) {

      try {

        let team: Team = await teamService.getByTokenId(parseIntWithException(req.params.tokenId))
        let season:Season = await seasonService.getMostRecent()
        let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })

        renderIndex(res,{ 
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

  app.get("/t/activity/game/:tokenId", async function (req, res) {

      try {

        let team: Team = await teamService.getByTokenId(parseIntWithException(req.params.tokenId))
        let season:Season = await seasonService.getMostRecent()
        let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })

        renderIndex(res,{ 
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



  app.get("/t/mint/:tokenId", async function (req, res) {

      try {

        let team: Team = await teamService.getByTokenId(parseIntWithException(req.params.tokenId))
        let season:Season = await seasonService.getMostRecent()
        let tls: TeamLeagueSeason = await teamLeagueSeasonService.getByTeamSeason(team, season)

        let tlsPlain = tls.get({ plain: true })

        renderIndex(res,{ 
          twitter: TWITTER,
          title: `Mint ${tlsPlain.city.name} ${tlsPlain.team.name} - Ethereum Baseball League`,
          description: `Mint the ${tlsPlain.city.name} ${tlsPlain.team.name} in Ethereum Baseball League.`,
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

        renderIndex(res,{ 
          twitter: TWITTER,
          title: `Leagues - Ethereum Baseball League`,
          description: `View league list in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/logo.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/l/standings/:leagueRank", async function (req, res) {

      try {

        let rank = req.params.leagueRank ? parseIntWithException(req.params.leagueRank) : 1

        let league: League = await leagueService.getByRank(rank)

        renderIndex(res,{ 
          twitter: TWITTER,
          title: `${league.name} Standings - Ethereum Baseball League`,
          description: `View ${league.name} standings in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/logo.png`

        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/games", async function (req, res) {

      try {

        let gameDate = req.query.gameDate ? dayjs(req.query.gameDate?.toString()) : universe.currentDate

        renderIndex(res,{ 
          twitter: TWITTER,
          title: `Scores for ${dayjs(gameDate).format("YYYY-MM-DD")} - Ethereum Baseball League`,
          description: `View scores for ${dayjs(gameDate).format("YYYY-MM-DD")} in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/logo.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/g/:id", async function (req, res) {

      try {

        let gameId = req.params.id

        let game = await gameService.get(gameId)



        renderIndex(res,{ 
          twitter: TWITTER,
          title: `${game.away.cityName} ${game.away.name} @ ${game.home.cityName} ${game.home.name} on ${dayjs(game.gameDate).format("YYYY-MM-DD")}- Ethereum Baseball League`,
          description: `${game.away.cityName} ${game.away.name} @ ${game.home.cityName} ${game.home.name} on ${dayjs(game.gameDate).format("YYYY-MM-DD")}`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/logo.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/players/", async function (req, res) {

      try {

        renderIndex(res,{ 
          twitter: TWITTER,
          title: `Players - Ethereum Baseball League`,
          description: `View players in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/logo.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/p/:id", async function (req, res) {

      try {

        let playerId:string = req.params.id

        let player = await playerService.get(playerId)



        renderIndex(res,{ 
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

        renderIndex(res,{ 
          twitter: TWITTER,
          title: `Activity - Ethereum Baseball League`,
          description: `Activity in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/logo.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/activity/off", async function (req, res) {

      try {

        renderIndex(res,{ 
          twitter: TWITTER,
          title: `Activity (Off-chain) - Ethereum Baseball League`,
          description: `Activity (Off-chain) in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/logo.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/activity/game", async function (req, res) {

      try {

        renderIndex(res,{ 
          twitter: TWITTER,
          title: `Activity (Player Moves) - Ethereum Baseball League`,
          description: `Activity (Player Moves) in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/logo.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })


  app.get("/u/owners", async function (req, res) {

      try {

        renderIndex(res,{ 
          twitter: TWITTER,
          title: `Owners - Ethereum Baseball League`,
          description: `Owners in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/logo.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/about", async function (req, res) {

      try {

        renderIndex(res,{ 
          twitter: TWITTER,
          title: `About - Ethereum Baseball League`,
          description: `About Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/logo.png`
        })

      } catch (ex) {
        res.sendStatus(500)
      }

  })

  app.get("/u/activity", async function (req, res) {

      try {

        renderIndex(res,{ 
          twitter: TWITTER,
          title: `Activity - Ethereum Baseball League`,
          description: `Activity in Ethereum Baseball League.`,
          VERSION: version,
          url: req.originalUrl,
          image: `${process.env.WEB}/logo.png`
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
      let leagueOne:League = await leagueService.getByRank(1)

      let tlss: TeamLeagueSeason[] = await teamLeagueSeasonService.listByLeagueAndSeason(leagueOne, season, { limit: 10 })

      let featuredPost:Post = await postService.getFeatured()

      let vm = {
        featuredPost: featuredPost,
        todaysGames: await gameService.getGames(universe.currentDate, leagueOne),
        topTeams: tlss.map((t, index) => {
          t = t.get({ plain: true })
          return teamService.getTeamStandingsViewModel(t, index + 1)
      }),
        topNews:[]
      }



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
      let player:Player = await playerService.get(playerId)
      let season: Season = await seasonService.getMostRecent()

      let pls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

      if (!pls.teamId) {
        throw new Error("Player is not rostered.")
      }

      let team:Team = await teamService.get(pls.teamId)


      await refreshUniverse()

      //Make sure this address owns this player
      if (user.address != team.ownerId) {
        res.status(401)
        return res.send("Not authorized.")
      }

    
      let params = req.body

      await teamService.dropPlayerWithSignature(pls, player, team, season, universe.currentDate, params.message, params.signature)

      //Clear cache 
      await cacheService.clearPlayersTag()
      await cacheService.clearTeamsTag()

      res.send("success")

    } catch (ex) {
      res.status(500)
      res.send(ex.message);
    }

  })

  app.get('/api/player/list/:rank/:startDate', cacheService.cacheResponse({ tag: PLAYERS }), async function (req, res) {

    try {
      let startDate = dayjs(req.params.startDate).toDate()
      let rank = parseIntWithException(req.params.rank)

      let league:League
      if (rank > 0) {
        league = await leagueService.getByRank(rank)
      }

      return res.json(await playerService.getPlayerViewModels(startDate, league))
    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

    return
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

  app.get('/api/game-transaction/latest/:page', async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }


      return res.json(await gameTransactionService.latest(options))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })

  app.get('/api/game-transaction/on-chain/:page', async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }

      return res.json(await processedTransactionService.getAllEvents(options))

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

      return res.json(await offchainEventService.list(ContractType.DIAMONDS, options))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })



  app.get('/api/game-transaction/team/latest/:teamTokenId/:startDate/:page', async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }
      let tokenId = parseIntWithException(req.params.teamTokenId)

      let startDate = dayjs(req.params.startDate).toDate()
      let season: Season = await seasonService.getByDate(startDate)

      let team:Team = await teamService.getByTokenId(tokenId)
      

      return res.json(await gameTransactionService.getByTeamSeason(team, season, options))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })

  app.get('/api/game-transaction/team/on-chain/:teamTokenId/:page', async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }
      let tokenId = parseIntWithException(req.params.teamTokenId)

      return res.json(await processedTransactionService.getAllEventsByToken(tokenId, options))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })

  app.get('/api/game-transaction/team/off-chain/:teamTokenId/:page', async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }
      let tokenId = parseIntWithException(req.params.teamTokenId)

      return res.json(await offchainEventService.getByTokenId(ContractType.DIAMONDS, tokenId, options))

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

      let offChainEvents = await offchainEventService.getByOwner(ContractType.DIAMONDS, owner, options) //await offchainEventService.getByTokenId(ContractType.DIAMONDS, tokenId, options)      
      
      let onChainEvents = await processedTransactionService.getAllEventsByAddress(owner._id, options)
      // let onChainTransactions = processedTransactionService.groupEventsByTransaction(onChainEvents)

      return res.json({
        owner: owner,
        offChainEvents: offChainEvents,
        onChainEvents: onChainEvents
      })

    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })

  app.get('/api/game-transaction/player/:playerTokenId/:page', cacheService.cacheResponse({ tag: PLAYERS }), async function (req, res) {

    try {

      let perPage = 25
      let page = parseIntWithException(req.params.page)
      let options = { limit: perPage, offset: (page - 1) * perPage }
      
      let player:Player = await playerService.getByTokenId(parseIntWithException(req.params.playerTokenId))

      return res.json(await gameTransactionService.getByPlayer(player, options))
    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })



  /** End game transactions */





  app.get('/api/team/date/:tokenId/:startDate', async function (req, res) {

    try {

      let tokenId = parseIntWithException(req.params.tokenId)

      let team: Team = await teamService.getByTokenId(tokenId)

      let startDate = dayjs(req.params.startDate).toDate()

      let season: Season = await seasonService.getByDate(startDate)

      return res.json(await teamService.getTeamViewModel(team, season))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })

  app.get('/api/team/mint-info/:tokenId', async function (req, res) {

    try {

      let tokenId = parseIntWithException(req.params.tokenId)

      let team:Team = await teamService.getByTokenId(tokenId)
      let season:Season = await seasonService.getMostRecent()

      let vm:any = {
        team: await teamService.getBasicTeamViewModel(team, season)
      }

      //@ts-ignore
      let userId = req.session?.passport?.user

      if (!userId) {
        return res.json(vm)
      }

      let user: User = await userService.get(userId)

      if (user.address && !team.ownerId) {

        let mintKey:string = req.query.mintKey as string
        vm.mintInfo = await teamService.getMintInfo(user.address, team, season, mintKey)
      }

      return res.json(vm)

    } catch (ex) {
      console.log(ex)
      res.sendStatus(500)
    }

  })

  app.get('/api/team/games/:tokenId/:start', async function (req, res) {

    try {

      let tokenId = parseIntWithException(req.params.tokenId)

      let team: Team = await teamService.getByTokenId(tokenId)

      let start = dayjs(req.params.start).startOf('month').toDate()
      let end = dayjs(req.params.start).endOf('month').toDate()

      return res.json(await teamService.getTeamGameLogViewModels(team, start, end))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })

  app.get('/api/team/activity/:tokenId/:startDate', async function (req, res) {

    try {

      let tokenId = parseIntWithException(req.params.tokenId)

      let team: Team = await teamService.getByTokenId(tokenId)


      let startDate = dayjs(req.params.startDate).toDate()

      let season: Season = await seasonService.getByDate(startDate)

      return res.json(await teamService.getTeamGameTransactionsForSeason(team, season))

    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })

  app.post('/api/team/roster/:tokenId', async function (req, res) {

    try {

      //@ts-ignore
      let loggedInUser = req.session?.passport?.user

      if (!loggedInUser) {
        return res.sendStatus(401)
      }

      let user: User = await userService.get(loggedInUser)
      let owner: Owner = await ownerService.get(user.address)
      let team: Team = await teamService.getByTokenId(parseIntWithException(req.params.tokenId))

      if (team == undefined || owner._id != team.ownerId) {
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

  app.get('/api/team/withdraw/:tokenId', async function (req, res) {

    try {

      //@ts-ignore
      let loggedInUser = req.session?.passport?.user

      if (!loggedInUser) {
        return res.sendStatus(401)
      }

      let user: User = await userService.get(loggedInUser)
      let owner: Owner = await ownerService.get(user.address)
      let team: Team = await teamService.getByTokenId(parseIntWithException(req.params.tokenId))
      let season:Season = await seasonService.getMostRecent()

      if (team == undefined || owner._id != team.ownerId) {
        return res.sendStatus(401)
      }

      let balance = await offchainEventService.getBalanceForTokenId(ContractType.DIAMONDS, team.tokenId)

      if (BigInt(balance) <= BigInt(0)) {
        return res.sendStatus(400)
      }

      let mintPass:DiamondMintPass

      //Generate a mint pass
      await sequelize.transaction(async (t1) => {
        
        let options = { transaction: t1 }

        mintPass = await diamondMintPassService.generateWithdrawPass(team.ownerId, team.tokenId, BigInt(balance).toString(), options)

        await offchainEventService.createTeamBurnEvent(team.tokenId, `-${balance}`, undefined, options)

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

  app.get('/api/team/mint/:tokenId', async function (req, res) {

    try {

      //@ts-ignore
      let loggedInUser = req.session?.passport?.user

      if (!loggedInUser) {
        return res.sendStatus(401)
      }

      let user: User = await userService.get(loggedInUser)

      if (!user.address) {
        return res.sendStatus(401)
      }

      let tokenId = parseIntWithException(req.params.tokenId)

      let team:Team = await teamService.getByTokenId(tokenId)
      let season = await seasonService.getMostRecent()


      let mintKey:string = req.query.mintKey as string
      let mintInfo = await teamService.getMintInfo(user.address, team, season, mintKey)

      if (mintInfo.error) {
        return res.sendStatus(401)
      }


      //Generate a mint pass
      await sequelize.transaction(async (t1) => {
        
        let options = { transaction: t1 }

        let existing:TeamMintPass[] = await teamMintPassService.getByAddressAndToken(user.address, tokenId, options)

        //Delete any existing
        for (let e of existing) {
          await teamMintPassService.delete(e, options)
        }

        let diamondMintPass:TeamMintPass = await teamMintPassService.generateTeamMintPass(user.address, team.tokenId, undefined, mintInfo.diamonds.totalDiamonds, options)
        let ethMintPass:TeamMintPass = await teamMintPassService.generateTeamMintPass(user.address, team.tokenId, mintInfo.eth?.ethCost || "0", undefined, options)

        return res.json({
          eth: ethMintPass,
          diamond: diamondMintPass
        })

      })


    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })

  app.get('/api/team/team-mint-pass/:tokenId', async function (req, res) {

    try {

      //@ts-ignore
      let loggedInUser = req.session?.passport?.user

      if (!loggedInUser) {
        return res.sendStatus(401)
      }

      let tokenId = parseIntWithException(req.params.tokenId)

      let user: User = await userService.get(loggedInUser)

      if (!user.address) {
        return res.sendStatus(401)
      }

      let teamMintPasses = await teamMintPassService.getByAddressAndToken(user.address, tokenId)

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

  app.get('/api/diamond/mint', async function (req, res) {

    try {

      //@ts-ignore
      let loggedInUser = req.session?.passport?.user

      if (!loggedInUser) {
        return res.sendStatus(401)
      }

      let user: User = await userService.get(loggedInUser)

      if (!user.address) {
        return res.sendStatus(401)
      }


      let owner:Owner = await ownerService.getOrCreate(user.address)

      let balance = await offchainEventService.getBalanceForOwner(ContractType.DIAMONDS, owner)

      if (BigInt(balance) == BigInt(0)) {
        return res.sendStatus(400)
      }


    
      //Generate a mint pass
      await sequelize.transaction(async (t1) => {
        
        let options = { transaction: t1 }

        let owner:Owner = await ownerService.getOrCreate(user.address, options)

        let mintPass:DiamondMintPass = await diamondMintPassService.generateMintPass(owner._id, BigInt(balance).toString(), options)

        await offchainEventService.createBurnEvent(owner._id, balance, options)

        owner.offChainDiamondBalance = "0"
        owner.offChainDiamondBalanceDecimal = 0

        await ownerService.put(owner, options)

        return res.json(mintPass)

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

  app.get('/api/league/standings/:leagueRank/:startDate?', cacheService.cacheResponse({ tag: TEAMS }), async function (req, res) {

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

      return res.json(await teamService.getStandingsViewModel(seasons,leagues, league, season))

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

  app.get('/api/game/latest', async function (req, res) {

    try {
      return res.json(await gameService.getLastUpdate())
    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })

  /**
   * END GAMES
   */



  // app.get('/l/info', async function (req, res) {

  //   try {

  //     let leagues: League[] = await leagueService.listByRankAsc()

  //     let season = await seasonService.getMostRecent()

  //     return res.json(await teamService.listBasicViewModels(leagues, season))


  //   } catch (ex) {
  //     console.log(ex)
  //     res.sendStatus(404)
  //   }

  // })



  // app.get('/post/:id', async function (req, res) {

  //   try {
  //     return res.json(await postService.get(req.params.id))
  //   } catch (ex) {
  //     res.sendStatus(404)
  //   }

  // })

  


  /** AUTHENTICATION */

  app.get('/auth/token/drop-player/:address/:playerId', async function (req, res) {

    try {

      let address = req.params.address
      let playerId = req.params.playerId

      if (!ethers.isAddress(address)) {
        res.status(500)
        return res.send("Invalid wallet.")
      }

      //@ts-ignore
      let userId = req.session?.passport?.user
      if (!userId) {
        res.status(401)
        return res.send("Not authorized.")
      }

      let user: User = await userService.get(userId)
      if (user.address != address) {
        res.status(401)
        return res.send("Not authorized.")
      }

      //Make sure this address owns this player
      let player:Player = await playerService.get(playerId)
      let season:Season = await seasonService.getMostRecent()
     

      let pls:PlayerLeagueSeason = await playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season)

      if (!pls.teamId) {
        throw new Error("Player is not rostered.")
      }

      let team:Team = await teamService.get(pls.teamId)
      if (team.ownerId != address) throw new Error("Not team owner.")

      let tokenKey = `drop-${playerId}-${address}`

      let signatureToken = await signatureTokenService.getOrCreate(tokenKey)
  
      res.send({
        token: signatureToken.token,
      })
      
    } catch (ex) {
      console.log(ex)
      res.sendStatus(404)
    }

  })

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

  app.post('/auth/ethereum', passport.authenticate('ethereum'), async (req, res) => {

    try {

      //@ts-ignore
      let userId = req.session?.passport?.user
      res.json({ _id: userId })

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

  app.listen(PORT, () => {
    console.log(`EBL listening on port ${PORT}`)
  })

  


  console.log(`
***********************************
* Web server started ${version}  *
* *********************************
    `)

}

export {
  startWebServer
}

