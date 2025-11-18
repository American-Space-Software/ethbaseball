import { inject, injectable } from "inversify";
import fs from "fs"
import { PlayerService } from "./player-service.js";
import { Player } from "../dto/player.js";
import { Team } from "../dto/team.js";
import { TeamService } from "./team-service.js";
import { Owner } from "../dto/owner.js";
import { OwnerService } from "./owner-service.js";
import dayjs from "dayjs";
import { SeasonService } from "./season-service.js";
import { Season } from "../dto/season.js";
import { Universe } from "../dto/universe.js";
import { UniverseService } from "./universe-service.js";


interface CacheConfig {
    millisToCache?: number
    tag?:string
}

interface CacheTimer {
    date: Date
    millisToCache: number
    tag:string
}

interface CacheTimers {
    [key: string]: CacheTimer
}

const MANAGE_TAG_SECONDS = 60
const DEFAULT_CACHE_TIME = 3600000
const CACHE_DIR = "./server-cache"

const PLAYERS = "players"
const TEAMS = "teams"
const OWNERS = "owners"
const IMAGES = "images"
const ENV_TAG = "env"

// let lastPlayersUpdate:Date
let lastOwnersUpdate:Date
let lastTeamssUpdate:Date
let mostRecentSeasonUpdate:Date
let lastUniverseDate:Date

@injectable()
class CacheService {

    cacheTimers:CacheTimers = {}

    constructor(
        private playerService:PlayerService,
        private teamService:TeamService,
        private ownerService:OwnerService,
        private seasonService:SeasonService,
        private universeService:UniverseService,
        @inject("universe") private getUniverse:Function 
    ) {}

    async init() {

        if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR)
        }

        let past = dayjs('1903-01-01').toDate()

        // let updatedPlayers:Player[] = await this.playerService.getUpdatedLastGameSince(past, { limit: 1 })
        let updatedTeams:Team[] = await this.teamService.getUpdatedSince(past, { limit: 1 })
        let updatedOwners:Owner[] = await this.ownerService.getUpdatedSince(past, { limit: 1 })
        let mostRecentSeason:Season = await this.seasonService.getMostRecent()

        let universe:Universe = this.getUniverse()

        mostRecentSeasonUpdate = mostRecentSeason?.lastUpdated  || new Date(new Date().toUTCString())
        // lastPlayersUpdate = updatedPlayers[0]?.lastGameUpdate || new Date(new Date().toUTCString())
        lastOwnersUpdate = updatedOwners[0]?.lastUpdated || new Date(new Date().toUTCString())
        lastTeamssUpdate = updatedTeams[0]?.lastUpdated || new Date(new Date().toUTCString())
        lastUniverseDate = universe.currentDate
    }

    async clearPlayersTag() {

        //Clear 'players' tag if there's been an update
        // let updatedPlayers:Player[] = await this.playerService.getUpdatedLastGameSince(lastPlayersUpdate, { limit: 1 })

        // if (updatedPlayers?.length > 0) {
            console.log("Clearing 'players' cache.")
            this.clearTag(PLAYERS)
            // lastPlayersUpdate = updatedPlayers[0].lastGameUpdate
        // }
    }

    async clearTeamsTag() {
        //Teams
        let updatedTeams:Team[] = await this.teamService.getUpdatedSince(lastTeamssUpdate, { limit: 1 })

        if (updatedTeams?.length > 0) {
            console.log("Clearing 'teams' cache.")
            this.clearTag(TEAMS)
            lastTeamssUpdate = updatedTeams[0].lastUpdated//new Date(new Date().toUTCString()) 
        }
    }

    async clearOwnersTag() {
        //Owners
        let updatedOwners:Owner[] = await this.ownerService.getUpdatedSince(lastOwnersUpdate, { limit: 1 })

        if (updatedOwners?.length > 0) {
            console.log("Clearing 'owners' cache.")
            this.clearTag(OWNERS)
            lastOwnersUpdate = updatedOwners[0].lastUpdated//new Date(new Date().toUTCString()) 
        }
    }

    async clearImagesTag() {
        //Owners
        console.log("Clearing 'images' cache.")
        this.clearTag(IMAGES)
    }

    async clearEnvTag() {

        //ENV
        let mostRecentSeason:Season = await this.seasonService.getMostRecent()

        let universe = await this.universeService.get(this.getUniverse()._id)

        if (mostRecentSeason.lastUpdated != mostRecentSeasonUpdate || universe.currentDate != lastUniverseDate) {
            console.log("Clearing 'env' cache.")
            this.clearTag(ENV_TAG)
            mostRecentSeasonUpdate = mostRecentSeason.lastUpdated
            lastUniverseDate = universe.currentDate
        }
    }


    async manageTags() {

        console.time('Manage tags')

        await this.clearPlayersTag()
        await this.clearTeamsTag()
        await this.clearOwnersTag()
        await this.clearEnvTag()

        console.timeEnd('Manage tags')
        
        setTimeout(() => { this.manageTags() }, MANAGE_TAG_SECONDS*1000)
    }


    clearTag(tag:string) {
        
        for (let key of Object.keys(this.cacheTimers)) {

            if (this.cacheTimers[key].tag == tag) {
                delete this.cacheTimers[key]
            }

        }

    }

    cacheResponse(config?:CacheConfig) {

        let millis = config?.millisToCache ? config.millisToCache : DEFAULT_CACHE_TIME

        return (req, res, next) => {

            const key = req.originalUrl
                            .trim()
                            .replace(/ +/g, '-')
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '')

            //Check if key exists in cache          
            const cacheInfo = this.cacheTimers[key]
            
            let now = new Date(new Date().toUTCString()) 
            
            let difference = now.getTime() - (cacheInfo?.date?.getTime() || 0)
            let cacheValid = cacheInfo?.date && ( millis > difference)


            //If we have a cache record make sure it's still timely.
            if (  cacheValid ) {
        
                res.send(fs.readFileSync(`${CACHE_DIR}/${key}`))

            } else {

                res.originalSend = res.send
          
                res.send = (body) => {
                
                  res.originalSend(body)

                  fs.writeFileSync(`${CACHE_DIR}/${key}`, body)
                  
                  this.cacheTimers[key] = {
                    date: now,
                    millisToCache: millis,
                    tag: config?.tag
                  }

                }

                next()

            }

          
        }

    }
}




export {
    CacheService, CacheConfig, PLAYERS, TEAMS, OWNERS, ENV_TAG, IMAGES
}