import { inject, injectable } from "inversify";

import { UniverseRepository } from "../repository/universe-repository.js";
import { Universe } from "../dto/universe.js";
import { GLICKO_SETTINGS, NFTMetadata, PlayerService } from "./player-service.js";
import { IPFSService } from "./ipfs-service.js";
import { ImageService } from "./image-service.js";

import { Image } from "../dto/image.js";
import { Animation } from "../dto/animation.js";
import { v4 as uuidv4 } from 'uuid';

import { Jimp } from "jimp"
import fs from "fs"
import Hash from 'ipfs-only-hash'

import { CID } from "@ipld/car/writer";
import { faker } from '@faker-js/faker'
import pluralize from "pluralize"



import { City, SEED_DATA } from "../dto/city.js";
import { CityRepository } from "../repository/city-repository.js";
import { TeamService } from "./team-service.js";
import {  Team, TEAM_COLORS, TEAM_NAMES } from "../dto/team.js";
import { CityService } from "./city-service.js";
import { SeedService } from "./seed-service.js";
import { RollService } from "./roll-service.js";
import { Stadium } from "../dto/stadium.js";
import { StadiumService } from "./stadium-service.js";
import { LeagueService } from "./league-service.js";
import { League } from "../dto/league.js";
import { SeasonService } from "./season-service.js";
import { Season } from "../dto/season.js";

import { LadderService } from "./ladder-service.js";
import { TeamLeagueSeason } from "../dto/team-league-season.js";
import { TeamLeagueSeasonService } from "./team-league-season-service.js";
import { ContractType, SERIES_LENGTH } from "./enums.js";
import dayjs from "dayjs";
import { Owner } from "../dto/owner.js";
import { TEAMS_PER_TIER } from "../service/enums.js"
import { OwnerService } from "./owner-service.js";
import { OffchainEventService } from "./offchain-event-service.js";
import { AirdropService } from "./airdrop-service.js";
import { PostService } from "./post-service.js";

@injectable()
class UniverseService {

    @inject("UniverseRepository")
    private universeRepository:UniverseRepository

    @inject("CityRepository")
    private cityRepository:CityRepository

    @inject("sequelize")
    private sequelize:Function

    constructor(
        private ipfsService:IPFSService,
        private imageService:ImageService,
        private teamService:TeamService,
        private cityService:CityService,
        private seedService:SeedService,
        private rollService:RollService,
        private stadiumService:StadiumService,
        private leagueService:LeagueService,
        private seasonService:SeasonService,
        private teamLeagueSeasonService:TeamLeagueSeasonService,
        private ladderService:LadderService,
        private ownerService:OwnerService,
        private offchainEventService:OffchainEventService,
        private airdropService:AirdropService,
        private postService:PostService,
        @inject("universe") private _universe:Function,
        @inject("config") private _config:Function
    ) {}



    public get universe()  {
        return this._universe()
    }

    public get config() : any  {
        return this._config()
    }

    getIPFSDirectory(universe:Universe) {
        return `/export/universe`
    }
    

    async get(id:string, options?:any): Promise<Universe> {
        return this.universeRepository.get(id, options)
    }

    async list(limit:number, offset:number, options?: any): Promise<Universe[]> {
        return this.universeRepository.list(limit, offset, options)
    }

    async put(universe:Universe, options?:any): Promise<Universe> {
        return this.universeRepository.put(universe, options)
    }


    async exportIfChanged(path:string, cid:string, content:string) {

        //Write to IPFS
        let stat

        try {
            stat = await this.ipfsService.heliaStat(path)
        } catch(ex) {}

        if (!stat?.cid || stat.cid?.toString() != cid) {
            await this.ipfsService.heliaMFSWrite(new TextEncoder().encode(content), path)
        }

    }

    async exportTeamIPFS(ipfsDirectory:string, team:Team, image:Image, metadata:NFTMetadata) {

        //Write to IPFS
        let metadataContent = JSON.stringify(metadata)
        let metadataCid = await Hash.of(metadataContent)

        await this.exportIfChanged(`${ipfsDirectory}/metadata/${team.tokenId}.json`, metadataCid, metadataContent)
        await this.exportIfChanged(`${ipfsDirectory}/images/${image.cid}.html`, image.cid, image.svg)
    }

    async exportGeneratingPlayerIPFS(ipfsDirectory:string, animation:Animation, image:Image, metadata:NFTMetadata) {

        //Write to IPFS
        let metadataContent = JSON.stringify(metadata)
        let metadataCid = await Hash.of(metadataContent)

        await this.exportIfChanged(`${ipfsDirectory}/metadata/generating.json`, metadataCid, metadataContent)
        await this.exportIfChanged(`${ipfsDirectory}/animations/${animation.cid}.html`, animation.cid, animation.content)
        await this.exportIfChanged(`${ipfsDirectory}/images/${image.cid}.html`, image.cid, image.svg)
    }
    
    async exportToIPFS(universe:Universe) : Promise<string> {

        let ipfsDirectory = this.getIPFSDirectory(universe)

        try {
            let stat = await this.ipfsService.heliaStat(ipfsDirectory)
            await this.ipfsService.heliaRm(ipfsDirectory)
        } catch(ex) {}

        await this.ipfsService.heliaMkDir(`${ipfsDirectory}`, { force: true })
        await this.ipfsService.heliaMkDir(`${ipfsDirectory}/animations`, { force: true })
        await this.ipfsService.heliaMkDir(`${ipfsDirectory}/images`, { force: true })
        await this.ipfsService.heliaMkDir(`${ipfsDirectory}/metadata`, { force: true })

        //Save act metadata
        let contractMetadataPath = `${ipfsDirectory}/contractMetadata.json`
        let contractMetadata:ContractMetadata = await this.exportContractMetadata(universe)

        await this.ipfsService.heliaAdd(  new TextEncoder().encode(JSON.stringify(contractMetadata)), contractMetadataPath  )

        let stat = await this.ipfsService.heliaStat(ipfsDirectory)

        //@ts-ignore
        return stat.cid.toString()

    }

    async getUniverseCid(universe:Universe) : Promise<CID> {

        let ipfsDirectory = this.getIPFSDirectory(universe)

        let stat = await this.ipfsService.heliaStat(ipfsDirectory)

        //@ts-ignore
        return stat.cid

    }

    async exportContractMetadata(universe:Universe) : Promise<ContractMetadata> {

        let result:ContractMetadata = {
          name: "Ethereum Baseball League",
          description: universe.descriptionMarkdown,
          external_link: "https://playebl.com",
          seller_fee_basis_points: 0, //TODO: Setting this to anything other than zero ruins OpenSea. Investigate.
        }
    
        if (universe.coverImageId) {
          let coverImage:Image = await this.imageService.get(universe.coverImageId)
          result.image = `ipfs://${coverImage.cid}`
        }
    
        return result
    
    }

    clearDirectory(directory) {

        if (fs.existsSync(directory)) {
            fs.rmdirSync(directory, { recursive: true })
        } else {
            fs.mkdirSync(directory, { recursive: true })
        }
    }

    async clearIPFSDirectory(directory) {

        //Clear IPFS animations folder
        try {
            let stat = await this.ipfsService.heliaStat(directory)
            await this.ipfsService.heliaRm(directory, { force: true })
        } catch(ex) {}

    }

    async syncMetadata(universe:Universe, config, options?:any) : Promise<CID> {

        let season:Season = await this.seasonService.getMostRecent(options)

        let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.listBySeason(season, options)
        
        let ipfsDirectory = this.getIPFSDirectory(universe)

        //Clear IPFS images folder
        await this.clearIPFSDirectory(`${ipfsDirectory}/images`)
        await this.clearIPFSDirectory(`${ipfsDirectory}/metadata`)
        await this.clearIPFSDirectory(`${ipfsDirectory}/animation`)

        for (let tls of tlss) {

            let tlsPlain:TeamLeagueSeason = tls.get({ plain: true })

            console.time(`Generating metadata for ${tlsPlain.city.name} ${tlsPlain.team.name}`)

            // let svg:string = await this.imageService.getTeamLogoSVG(tlsPlain.team)
            // let animation:Animation = await this.animationService.generateAnimation(player)
            // let metadata:NFTMetadata = this.playerService.createNFTMetadata(player, image, animation)

            let image = await this.imageService.get(tls.logoId, options)
            let metadata = await this.teamService.createNFTMetadata(tlsPlain.city, tlsPlain.team, image )

            // //Export to IPFS
            await this.exportTeamIPFS(ipfsDirectory, tlsPlain.team, image, metadata)

            console.timeEnd(`Generating metadata for ${tlsPlain.city.name} ${tlsPlain.team.name}`)

        }

        let cid = await this.getUniverseCid(universe)

        await this.generateCAR(cid, config)

        return cid


    }

    async generateCAR(cid, config) {

        //Generate CAR
        const { writer, out } = await this.ipfsService.createCAR(cid)
        
        const carBlobPromise = this.ipfsService.carWriterOutToBlob(out)

        await this.ipfsService.exportCAR(cid, writer)

        fs.writeFileSync(`${config.publicPath}/export.car`, new Uint8Array(await (await carBlobPromise).arrayBuffer()))


        //Clear/create directories
        this.clearDirectory(`${config.publicPath}/animations`)
        this.clearDirectory(`${config.publicPath}/images`)
        this.clearDirectory(`${config.publicPath}/metadata`)

        //Now unpack it.
        await this.ipfsService.writeCAR(`${config.publicPath}/export.car`, config.publicPath)
    }

    generateTeam(name:string, city:City, color1:string, color2:string, tokenId:number) {

        let team:Team = new Team()
        team._id = uuidv4()
        team.name = name
        team.tokenId = tokenId
        team.abbrev = city.name[0] + team.name.split(' ').map(word => word[0].toUpperCase()).join("")

        //Create a stadium for them to play at.
        let stadium = new Stadium()
        stadium._id = uuidv4()
        stadium.capacity = 15000
        stadium.name = `${faker.company.name()} Field`

        team.colors = {
            color1: color1,
            color2: color2
        }

        team.seasonRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }
        team.longTermRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }

        return {
            team: team,
            stadium: stadium
        }

    }

    async generateTeams(rng, allCities:City[], numberOfTeams:number, options?:any) : Promise<TeamWithLocation[]> {

        let tokenId = 1

        let teams:TeamWithLocation[] = []

        let chosenCities:City[] = []
        let maxxedCities:City[] = []

        for (let i=0; i<numberOfTeams; i++) {

            let team:Team = new Team()
            team._id = uuidv4()
            team.tokenId = tokenId++

            let city:City

            do {
                //Random top 100 city
                city = allCities[this.rollService.getRoll(rng, 0, 99)]
            } while(maxxedCities.filter( c => c.id == city._id).length > 0)

            chosenCities.push(city)
            if (chosenCities.filter ( c => c._id == city._id ).length > 1) maxxedCities.push(city)

            //Create a stadium for them to play at.
            let stadium = new Stadium()
            stadium._id = uuidv4()
            stadium.capacity = 15000
            stadium.name = `${faker.company.name()} Field`

            await this.stadiumService.put(stadium, options)

            let color1 = TEAM_COLORS[i].color1
            let color2 = TEAM_COLORS[i].color2

            team.colors = {
                color1: color1,
                color2: color2
            }

            //Name the team
            let name =  Array.from(TEAM_NAMES)[this.rollService.getRoll(rng, 0, TEAM_NAMES.size - 1)]

            team.name = `${pluralize(name)}`
            team.abbrev = city.name[0] + team.name.split(' ').map(word => word[0].toUpperCase()).join("")

            team.seasonRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }
            team.longTermRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }


            await this.teamService.put(team, options)

            teams.push({
                team: team,
                city: city,
                stadium: stadium
            })


        }

        return teams

    }

    async createTeamLogo(city:City, team:Team, options?:any) {

        let logo = new Image()
        logo.svg = this.imageService.getTeamLogoSVG(city, team)
        logo.cid = await Hash.of(logo.svg)
        logo._id = logo.cid

        let existing = await this.imageService.get(logo._id, options)

        if (!existing) {
            existing = await this.imageService.put(logo, options)
        }

        return existing
    }




    async runLeagueGenerator(season:Season, rank:number, name:string, numberOfTeams:number, options?:any) {

        let rng = await this.seedService.getRNG(options)

        let league:League = new League()
        league._id = uuidv4()
        league.rank = rank
        league.name = name

        await this.leagueService.put(league, options)


        let cities = await this.cityService.list(1000, 0, options)

        let teams = await this.generateTeams( rng, cities, numberOfTeams, options)

        for (let t of teams) {

            let financeSeason = this.ladderService.getDefaultFinanceSeason(this.ladderService.getScheduleLength(teams.length, SERIES_LENGTH))
            let tls:TeamLeagueSeason = this.teamLeagueSeasonService.initNew(t.team, league, season, t.city, t.stadium, financeSeason)

            let logo = await this.createTeamLogo(t.city, t.team, options)
            tls.logoId = logo._id

            await this.imageService.put(logo, options)

            await this.teamLeagueSeasonService.put(tls, options)
        }

        let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.listByLeagueAndSeason(league, season, options)

        await this.ladderService.scheduleGenerator(tlss, league, season, options)


    }

    async loadPresetLeagues(season:Season, leagues:LeagueInfo[], config, options?:any) {

        let cities = await this.cityService.list(1000, 0, options)

        for (let leagueInfo of leagues) {

            let league:League = new League()
            league._id = uuidv4()
            league.rank = leagueInfo.league.rank
            league.name = leagueInfo.league.name

            await this.leagueService.put(league, options)

            for (let t of leagueInfo.teams) {

                let city = cities.find( c => c.name == t.city.name && c.state == t.city.state)

                if (!city) {
                    throw new Error("City not found.")
                }

                let teamStadium = this.generateTeam(t.name, city, t.colors.color1, t.colors.color2, t.tokenId)

                if (t.reserved == true) {
                    teamStadium.team.mintKey = uuidv4()   
                }

                await this.teamService.put(teamStadium.team, options)

                let team:Team = await this.teamService.get(teamStadium.team._id, options)


                let stadium = await this.stadiumService.put(teamStadium.stadium, options)

                let financeSeason = this.ladderService.getDefaultFinanceSeason(this.ladderService.getScheduleLength(leagueInfo.teams.length, SERIES_LENGTH))
                let tls:TeamLeagueSeason = this.teamLeagueSeasonService.initNew(team, league, season, city, stadium, financeSeason)


                //Try to load custom logo
                
                let logo:Image

                try {

                    let logoData = fs.readFileSync(`${config.runDir}/logos/${team.tokenId}.png`) 

                    const image = await Jimp.read(logoData)

                    image.resize({ w: 1024, h: 1024 })

                    let thumbnail1024Data = await image.getBuffer("image/png")

                    image.resize({ w: 100, h: 100 })

                    let thumbnail100Data = await image.getBuffer("image/png")

                    image.resize({ w: 60, h: 60 })

                    let thumbnail60Data = await image.getBuffer("image/png")

                    
                    logo = await this.imageService.createImageFromContent(logoData,thumbnail60Data, thumbnail100Data, thumbnail1024Data, options)
                } catch(ex) {}


                if (!logo) {
                    logo = await this.createTeamLogo(city, team, options)
                }
                
                
                tls.logoId = logo._id

                await this.teamLeagueSeasonService.put(tls, options)

            }

            let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.listByLeagueAndSeason(league, season, options)

            await this.ladderService.scheduleGenerator(tlss, league, season, options)

        }

    }

    async setupCities(options?:any) {

        //Only do this once ever 
        let list = await this.cityRepository.list(100000, 0, options)
        if (list?.length > 0) return

        for (let cityRow of SEED_DATA) {
            
            let city:City = new City()
            Object.assign(city, cityRow)

            city._id = cityRow.rank.toString()
            await this.cityRepository.put(city, options)
        }

    }

    async setup(universe:Universe, config, options?:any) {

        await this.setupCities(options)

        let existingLeague:League = await this.leagueService.getByRank(1, options)

        if (!existingLeague) {
      
          //Generate initial league.
          let season:Season = new Season()
          season._id = uuidv4()
          season.startDate = dayjs(universe.currentDate).toDate()
          season.isComplete = false
          season.isInitialized = false
          
          await this.seasonService.put(season, options)
      
      
          if (process.env.LEAGUE_LIST) {
      
            let leagueList = JSON.parse(process.env.LEAGUE_LIST)
            await this.loadPresetLeagues(season, leagueList, config, options)
      
          } else {
      
            await this.runLeagueGenerator(season, 1, "Apex League", TEAMS_PER_TIER, options)
            await this.runLeagueGenerator(season, 2, "The Second League", TEAMS_PER_TIER, options)
            await this.runLeagueGenerator(season, 3, "The Third League", TEAMS_PER_TIER, options)
            await this.runLeagueGenerator(season, 4, "The Fourth League", TEAMS_PER_TIER, options)
            await this.runLeagueGenerator(season, 5, "The Fifth League", TEAMS_PER_TIER, options)
            await this.runLeagueGenerator(season, 6, "The Sixth League", TEAMS_PER_TIER, options)
            await this.runLeagueGenerator(season, 7, "The Seventh League", TEAMS_PER_TIER, options)
            await this.runLeagueGenerator(season, 8, "The Eighth League", TEAMS_PER_TIER, options)
            await this.runLeagueGenerator(season, 9, "The Ninth League", TEAMS_PER_TIER, options)
            await this.runLeagueGenerator(season, 10, "The Tenth League", TEAMS_PER_TIER, options)
          }
      
          //Generate player pool
          await this.ladderService.generatePlayerPool(season, options)

          //Start first season so we get numbers for the airdrop
          let allLeagues:League[] = await this.leagueService.list(options)
          await this.ladderService.startSeason(season, allLeagues, options)
      

          if (process.env.AIRDROP_LIST) {
      
            let airdropList = JSON.parse(process.env.AIRDROP_LIST)
      
            for (let entry of airdropList ) {
      
              let address = entry[0]
              let amount = entry[1]
      
              let owner:Owner = await this.ownerService.getOrCreate(address, options)

              await this.offchainEventService.createMintEvent(address, amount, options)

              this.ownerService.setOfflineDiamondBalance(owner, await this.offchainEventService.getBalanceForOwner(ContractType.DIAMONDS, owner, options))
    
              await this.ownerService.put(owner, options)
      
            }
      
          } else if (process.env.DEFAULT_AIRDROP == "true") {

            //Get the total # of diamonds needed to buy every team that is for sale
            let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.listBySeason(season, options)

            let totalDiamonds = "0"

            for (let tls of tlss) {
                
                let team:Team  = await this.teamService.get(tls.teamId, options)

                if (!team.mintKey) {
                    let cost = this.teamService.getTeamCost(tls.financeSeason)
                    totalDiamonds = (BigInt(totalDiamonds) + BigInt(cost.totalDiamonds)).toString()
                }

            }

            //Increase total by 20%
            totalDiamonds = (BigInt(totalDiamonds) * 120n / 100n).toString()

            let airdropList = await this.airdropService.getAirdropList( BigInt(totalDiamonds) )

            console.time(`Creating airdrop list containing ${airdropList.length} addresses.`)
            for (let o of airdropList) {

                let owner:Owner = await this.ownerService.getOrCreate(o.address, options)

                await this.offchainEventService.createMintEvent(o.address, o.count, options)
                
                this.ownerService.setOfflineDiamondBalance(owner, await this.offchainEventService.getBalanceForOwner(ContractType.DIAMONDS, owner, options))

                await this.ownerService.put(owner, options)
            }

            console.timeEnd(`Creating airdrop list containing ${airdropList.length} addresses.`)

          }
      

        //   if (process.env.INITIAL_POSTS) {

        //     let initialPosts = JSON.parse(process.env.INITIAL_POSTS)

        //     for (let p of initialPosts) {

        //         let post = new Post()
        //         post._id = p._id
        //         post.title = p.title
        //         post.content = p.content
        //         post.short = p.short
        //         post.isFeatured = p.isFeatured
        //         post.publishDate = p.publishDate

        //         await this.postService.put(post, options)

        //     }

        //   }


          
    
        }

    }

}

interface TeamWithLocation {
    team:Team
    city:City
    stadium:Stadium
}


interface ContractMetadata {

    name?:string
    description?:string

    image?:string

    external_link?:string 
    
    seller_fee_basis_points?:number
    fee_recipient?:string

    license?:string
} 


interface LeagueInfo {
    league: {
      name: string
      rank: number
    }
    teams: {
      tokenId: number
      name: string
      city: {
        name: string
        state: string
      }
      colors: {
        color1: string
        color2: string
      }
      rank: number,
      reserved: boolean
    }[]
  }


export {
    UniverseService, TeamWithLocation
}






    // private async _publishAnimations(ipfsDirectory:string, animationCids:string[]) {

    //     await this.ipfsService.heliaMkDir(`${ipfsDirectory}/animations`)

    //     for (let animationCid of animationCids) {

    //         let animation = await this.animationService.get(animationCid)

    //         let ipfsFilename = `${ipfsDirectory}/animations/${animation.cid}.html`

    //         const result = await this.ipfsService.heliaAdd(new TextEncoder().encode(animation.content), ipfsFilename)

    //         if (result.toString() !== animation.cid.toString()) {
    //             throw new Error(`Incorrect cid when saving animation. Expected: ${animation.cid}, Result: ${result.toString()}`)
    //         }

    //     }

    // }

    // private async _publishImages(ipfsDirectory:string, imageCids:string[]){

    //     await this.ipfsService.heliaMkDir(`${ipfsDirectory}/images`)

    //     for (let imageCid of imageCids) {
            
    //         let image = await this.imageService.get(imageCid)

    //         let ipfsFilename = `${ipfsDirectory}/images/${image.cid}.jpg` 

    //         //Add to IPFS
    //         const result = await this.ipfsService.heliaAdd(await this.imageService.getImageContent(image), ipfsFilename)

    //         //Validate cid
    //         if (result.toString() != image.cid) {    
    //             throw new Error(`Incorrect cid when saving image. Expected: ${image.cid}, Result: ${result.toString()}`)
    //         }

    //     }

    // }

    // private async _publishNFTMetadata(ipfsDirectory:string, universe:Universe, players:Player[])  {

    //     await this.ipfsService.heliaMkDir(`${ipfsDirectory}/metadata`)

    //     let metadataNFTMap = {}

    //     for (let thePlayer of players) {

    //         // let item = this.exportService.prepareItem(theItem)

    //         // let ipfsFilename = `${ipfsDirectory}/metadata/${item.tokenId}.json`


    //         // let coverImage:Image = await this.imageService.get(item.coverImageId)
    //         // let nftMetadata = await this.itemService.exportNFTMetadata(channel, item, coverImage)
            
    //         // let content = new TextEncoder().encode(JSON.stringify(nftMetadata))
    //         // let contentCid = await Hash.of(content)

    //         // metadataNFTMap[contentCid] = nftMetadata

    //         // const result = await this.ipfsService.heliaAdd(content, ipfsFilename)



    //     }

    // }



    // const getSeasonHomeGameCount = (team:Team) => {
    //     return Object.values(schedule).flat().filter(g => g.homeId == team._id).length
    // }

    // const getSeasonHomeAwayCount = (team1:Team, team2:Team) => {

    //     return {
    //         team1HomeCount: Object.values(schedule).flat().filter(g => g.homeId == team1._id && g.awayId == team2._id).length,
    //         team2HomeCount: Object.values(schedule).flat().filter(g => g.homeId == team2._id && g.awayId == team1._id).length,

    //     }

    // }

    // countGamesBetweenTeams(schedule:Schedule) {

    //     return Object.values(schedule).flat().reduce((acc, game) => {
    //         // Initialize objects for the home and away teams if not already present
    //         if (!acc[game.homeId]) acc[game.homeId] = {}
    //         if (!acc[game.awayId]) acc[game.awayId] = {}
        
    //         // Increment game count for the home team's opponent
    //         acc[game.homeId][game.awayId] = (acc[game.homeId][game.awayId] || 0) + 1
        
    //         // Increment game count for the away team's opponent
    //         acc[game.awayId][game.homeId] = (acc[game.awayId][game.homeId] || 0) + 1
        
    //         return acc
    //     }, {} as Record<string, Record<string, number>>)

    // }

