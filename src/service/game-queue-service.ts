// import { inject, injectable } from "inversify"

// import { Player } from "../dto/player.js"
// import { IndividualGameQueueRepository } from "../repository/individual-game-queue-repository.js"
// import { LineupGameQueueRepository } from "../repository/lineup-game-queue-repository.js"
// import { Owner } from "../dto/owner.js"
// import { PlayerService } from "./player-service.js"
// import { IndividualGameQueue } from "../dto/individual-game-queue.js"

// import dayjs from "dayjs"
// import { Lineup } from "../dto/lineup.js"
// import { LineupGameQueue } from "../dto/lineup-game-queue.js"
// import { LevelService } from "./level-service.js"
// import { GameService, GameViewModel, SimGameCommand } from "./game-service.js"
// import { Game } from "../dto/game.js"
// import { LineupService } from "./lineup-service.js"

// import fs from "fs"
// import { Client, EmbedBuilder, TextChannel } from "discord.js"
// import { GameLevel, HomeAway, Position, Rating, TeamInfo } from "./enums.js"

// const SECONDS_BETWEEN_SIMS = 1

// @injectable()
// class GameQueueService {

//     @inject("sequelize")
//     private sequelize:Function

//     @inject("IndividualGameQueueRepository")
//     private individualGameQueueRepository:IndividualGameQueueRepository

//     @inject("LineupGameQueueRepository")
//     private lineupGameQueueRepository:LineupGameQueueRepository

//     constructor(
//         private playerService:PlayerService,
//         private levelService:LevelService,
//         private gameService:GameService,
//         private lineupService:LineupService,
//         @inject("discord") private discord:Client
//     ) {}

//     async runGameQueueEngine(config:any) {

//         // //Start as many games as we can.
//         // let games = await this.startUndraftedGames()

//         // console.log(`Starting ${games.length} games.`)

//         // //Move all games forward
//         // let incrementedGames:Game[] = await this.gameService.incrementAll()
//         // console.log(`Incrementing ${incrementedGames.length} games`)


//         // //Write game summaries to disk
//         // fs.writeFileSync(`${config.publicPath}/games/in-progress.json`, JSON.stringify(incrementedGames.map(g => this.gameService.getGameSummaryViewModel(g))))

//         // for (let game of incrementedGames) {
//         //     //Write games to disk
//         //     fs.writeFileSync(`${config.publicPath}/games/${game._id}.json`, JSON.stringify(game))
//         // }

//         // await this.gameService.updateLatestInfo()

//         // setTimeout(() => { this.runGameQueueEngine(config) }, SECONDS_BETWEEN_SIMS*1000)


//     }



//     /**INDIVIDUAL */
//     async queueAllOwnedPlayers(owner:Owner, guildId:string, options?:any) {

//         let players:Player[] = await this.playerService.getByOwnerAndCooldown(owner, options)

//         return this.queuePlayers(players, guildId, options)

//     }

//     async queuePlayers(players:Player[], guildId:string, options?:any) {

//         let success:Player[] = []
//         let errors:Error[] = []

//         for (let player of players) {

//             try {
//                 await this.queuePlayer(player, guildId, options)
//                 success.push(player)

//             } catch(ex) {
//                 errors.push(ex)
//             }

//         }

//         return {
//             success: success,
//             errors: errors
//         }
//     }

//     async queuePlayer(player:Player, guildId:string, discordId:string, options?:any) : Promise<IndividualGameQueue> {
        
//         await this.validateExistingPlayerQueue(player, options)

//         let gameQueue:IndividualGameQueue 

//         gameQueue = await this.individualGameQueueRepository.put(Object.assign(new IndividualGameQueue(), {
//             playerId: player._id,
//             // level: this.levelService.getLevel(player.playerLevel),
//             // rating: player.rating.rating,
//             guildId: guildId,
//             discordId: discordId
//         }),options)

//         //Update player cooldown
//         player.lastGamePlayed = new Date(new Date().toUTCString())

//         await this.playerService.put(player,options)

//         //Trigger cooldowns for players
//         await this.playerService.triggerCooldowns([player], options)

//         return gameQueue

//     }

//     async validateExistingPlayerQueue(player:Player, options?:any) {

//         //Check if queued as an individual
//         let existingIndividualQueue:IndividualGameQueue = await this.individualGameQueueRepository.getByPlayer(player, options) 

//         if (existingIndividualQueue?._id) {
//             throw new Error(`${player.fullName} is already queued to play.`)
//         }

//         //Check if queued on a lineup.
//         let lineupGameQueue:LineupGameQueue = await this.lineupGameQueueRepository.getByPlayer(player, options)

//         if (lineupGameQueue?._id) {
//             throw new Error(`${player.fullName} is already queued to play with lineup.`)
//         }

//         //Check cooldowns.
//         let aDayAgo = dayjs(new Date(new Date().toUTCString())).subtract(1, 'days').toDate()

//         if (player.lastGamePlayed > aDayAgo) {
//             throw new Error("Player's cooldown has not reset.")
//         }

//     }

//     async getQueuedPlayers(position:Position, gameLevel:GameLevel) : Promise<Player[]> {
        
//         let queues = await this.individualGameQueueRepository.getByPositionAndLevel(position, gameLevel)

//         let players:Player[] = []

//         for (let queue of queues) {
//            players.push( await this.playerService.get(queue.playerId))
//         }

//         return players
//     }

//     async dequeuePlayer(player:Player, options?:any) {
//         await this.individualGameQueueRepository.deleteByPlayer(player, options)
//     }
    
//     async queuedPlayerTransferred(player:Player, options?:any) {

//         //Remove from queue
//         await this.dequeuePlayer(player,  options)

//         //Remove from lineups
//         let lineups:Lineup[] = await this.lineupService.getByPlayer(player, options)

//         for (let lineup of lineups) {

//           lineup = await this.lineupService.get(lineup._id, options)

//           //Remove from lineup
//           await this.lineupService.removeFromLineup(lineup, player, options)

//           //Remove lineup from queue
//           await this.dequeueLineup(lineup, options)

//         }
//     }

//     async getIndividualGameQueueByPlayer(player:Player, options?:any) : Promise<IndividualGameQueue>{
//         return this.individualGameQueueRepository.getByPlayer(player, options) 
//     }

//     /**INDIVIDUAL */


//     /** LINEUPS */
//     async queueLineup(lineup:Lineup, guildId:string, discordId:string, options?:any)  {
        
//         //Make sure they are not already queued.
//         let existingQueue:LineupGameQueue = await this.lineupGameQueueRepository.getByLineup(lineup, options) 

//         if (existingQueue?._id) {
//             throw new Error(`Lineup is already queued to play.`)
//         }

//         //Get highest tier lineup is eligible to play in.
//         // let level:GameLevel = await this.getLevel(lineup)

//         // if (!level) {
//         //     throw new Error("Lineup has players from multiple levels and is not elibigle to join the queue.")
//         // }


//         //Check if any players are in the individual queue or other lineups in the queue
//         let players:Player[] = await this.playerService.getByTokenIds(lineup.players.map(p => p.tokenId))

//         if (players?.length < 9) {
//             throw new Error("Lineup is not filled.")
//         }

//         for (let player of players) {      
//             await this.validateExistingPlayerQueue(player, options)
//         }

//         let gameQueue:LineupGameQueue

//         // let rating:Rating = await this.playerService.calculateRating(players)

//         gameQueue = await this.lineupGameQueueRepository.put( Object.assign(new LineupGameQueue(), {
//             lineupId: lineup._id,
//             // level: level,
//             // rating: rating.rating,
//             guildId:guildId,
//             discordId: discordId
//         }),  options)

//         //Trigger cooldowns for all players
//         await this.playerService.triggerCooldowns(players, options)

//         return {
//             gameQueue: gameQueue,
//             players: players
//         }

//     }

//     // async getLevel(lineup:Lineup) : Promise<GameLevel> {

//     //     let lineupLevel:GameLevel

//     //     for (let level=GameLevel.PROS; level >= GameLevel.HIGH_SCHOOL; level-- ) {

//     //         //Check if every player is eligible
//     //         let eligible = true
//     //         for (let lineupPlayer of lineup.players) {
//     //             let player:Player = await this.playerService.getByTokenId(lineupPlayer.tokenId)

//     //             if (this.levelService.getLevel(player.playerLevel) != level) {
//     //                 eligible = false
//     //             }
//     //         }

//     //         if (eligible) {
//     //             lineupLevel = level
//     //             break
//     //         }

//     //     }

//     //     return lineupLevel
//     // }

//     async dequeueLineup(lineup:Lineup, options?:any) {
//         await this.lineupGameQueueRepository.deleteByLineup(lineup, options)
//     }

//     async getLineupGameQueueByPlayer(player:Player, options?:any) : Promise<LineupGameQueue>{
//         return this.lineupGameQueueRepository.getByPlayer(player, options)
//     }

//     async startUndraftedGames() {

//         let games:Game[] = []

//         //Start at the highest level and go to the lowest and try to clear the queues and start as many games as possible.
//         for (let level=GameLevel.COLLEGE; level >= GameLevel.HIGH_SCHOOL; level-- ) {

//             let result = await this.startGamesAtLevel(level)

//             if (result?.games?.length > 0) {
//                 games.push(...result.games)
//             }

//         }

//         return games


//     }

//     async startGamesAtLevel(level:GameLevel, options?:any) {

//         let s = await this.sequelize()

//         let results

//         await s.transaction(async (t1) => {

//             let options = { transaction: t1 }
    
//             //Get all of the players at this level
//             let players:Player[] = await this.playerService.getEligible(options)

//             console.log(`${players.length} eligible players at ${level}`)

//             if (players.length > 0) {

//                 results = await this.startGamesWithPlayers(players, level)

//                 //Save games
//                 for (let game of results.games) {
//                     await this.gameService.put(game, options)
//                 }
    
//                 //Update player cooldowns
//                 await this.playerService.triggerCooldowns(results.players)
    
//             }


//         })

//         return results

//     }


//     async startGamesWithPlayers(players:Player[], level:GameLevel) {

//         let games:Game[] = []

//         players.sort((a,b) => b.overallRating - a.overallRating)

//         let addedPlayers:Player[] = []

    
//         while(players.length > 0) {

//             let teams 

//             try {
//                 teams = await this.getNextTwoTeams(players)
//             } catch(ex) {}

//             if (!teams) break

//             let awayColors = this.getColors(HomeAway.AWAY)
//             let awayTeam:TeamInfo = await this.gameService.buildTeamInfoFromPlayers("Away", teams.team1, awayColors.color1, awayColors.color2)

//             let homeColors = this.getColors(HomeAway.HOME)
//             let homeTeam:TeamInfo = await this.gameService.buildTeamInfoFromPlayers("Home", teams.team2, homeColors.color1, homeColors.color2)

//             let allPlayers = [].concat(teams.team1).concat(teams.team2)

//             let averageRating:number = this.gameService.getAverageRating(allPlayers)
//             let averageAge:number = this.gameService.getAverageAge(Array.from(allPlayers))
    
//             let game:Game = await this.gameService.initGame()

//             game.leagueAverages = this.playerService.buildLeagueAverages(averageRating, averageAge)

//             //Set teams on game.
//             game.away = awayTeam            
//             game.home = homeTeam


//             console.log(`Started game #${game._id}`)

//             games.push(game)
//             addedPlayers.push(...allPlayers)

//             players = players.filter(p => addedPlayers.indexOf(p) < 0)

//         }

//         // console.log(`Players left in queue: ${players.length}`)

//         return {
//             games: games,
//             players: addedPlayers
//         }

//     }


//     async getNextTwoTeams(players:Player[]) {

//         let positions = [Position.CATCHER, Position.PITCHER, Position.FIRST_BASE, Position.SECOND_BASE, Position.THIRD_BASE, Position.SHORTSTOP, Position.LEFT_FIELD, Position.CENTER_FIELD, Position.RIGHT_FIELD]

//         let team1Pick = true

//         //Fill two team lineups
//         let team1:Player[] = []
//         let team2:Player[] = []

//         for (let position of positions) {

//             let matches = players.filter(p => p.primaryPosition == position)
//             if (matches.length < 2) throw new Error(`Error finding ${position}`)

//             //Add to lineup
//             if (team1Pick) {
//                 team1.push(matches[0])
//                 team2.push(matches[1])
//             } else {
//                 team1.push(matches[1])
//                 team2.push(matches[0])
//             }

//             //Flip turns each position
//             team1Pick = !team1Pick

//         }

//         const totalRating = (p:Player) => {
//             return (p.hittingRatings.speed * 2) + (p.hittingRatings.steals * 2) + //the others get counted twice
//             p.hittingRatings.vsL.contact + p.hittingRatings.vsL.gapPower + p.hittingRatings.vsL.homerunPower + p.hittingRatings.vsL.plateDiscipline + 
//             p.hittingRatings.vsR.contact + p.hittingRatings.vsR.gapPower + p.hittingRatings.vsR.homerunPower + p.hittingRatings.vsR.plateDiscipline
//         }

//         team1.sort((a,b) => totalRating(b) - totalRating(a))
//         team2.sort((a,b) => totalRating(b) - totalRating(a))


//         return {
//             team1: team1,
//             team2: team2
//         }
//     }

//     // async startGames() {

//     //     let s = await this.sequelize()

//     //     let allGames:GameViewModel[] = []

//     //     await s.transaction(async (t1) => {

//     //         let options = { transaction: t1 }

//     //         //Start at the highest level and go to the lowest and try to clear the queues and start as many games as possible.
//     //         for (let level=GameLevel.PROS; level >= GameLevel.HIGH_SCHOOL; level-- ) {
    
//     //             let game:Game
    
//     //             do {
//     //                 game = await this.startNextGame(level, options)
                    
//     //                 if (game) {
//     //                     allGames.push(this.gameService.getGameViewModel(game))
//     //                 }
    
//     //             } while(game != undefined)
    
//     //         }
    
    
//     //     })


//     //     return allGames


        
//     // }

//     async startNextGame(level:GameLevel, options?:any) : Promise<Game> {

//         let game:Game = await this.gameService.initGame()

//         let away = await this.getNextLineup(level, HomeAway.AWAY, options)
//         if (!away) return

//         await this.dequeueLineupInfo(away, options)

//         let home = await this.getNextLineup(level, HomeAway.HOME, options)
//         await this.dequeueLineupInfo(home, options)

//         if (!away || !home) return

//         //Set teams on game.
//         game.away = away.teamInfo            
//         game.home = home.teamInfo


//         let allPlayers = [].concat(away.teamInfo.players).concat(home.teamInfo.players)

//         if (new Set(allPlayers.map(p => p._id)).size < 18) {
//             throw new Error("Game can not start with duplicate players on lineups.")
//         }

//         let averageRating:number = this.gameService.getAverageRating(Array.from(allPlayers))
//         let averageAge:number = this.gameService.getAverageAge(Array.from(allPlayers))

//         game.leagueAverages = this.playerService.buildLeagueAverages(averageRating, averageAge)
    
//         // console.log(`Starting game between [${red.teamInfo.players.map(r => r._id)}] and [${blue.teamInfo.players.map(r => r._id)}]`)

//         await this.gameService.put(game, options)

//         try {
//             await this.announceGameStart(game)
//         } catch(ex) {
//             // console.log(ex)
//         }


//         return game

//     }
    

//     getColors(homeAway:HomeAway) {

//         let color1:string
//         let color2:string

//         switch(homeAway) {
//             case HomeAway.AWAY:
//                 color1 = "#f40707"
//                 color2 = "#FFFFFF"
//                 break
//             case HomeAway.HOME:
//                 color1 =  "#0A3161"
//                 color2 = "#FFFFFF"
//                 break
//         }

//         return {
//             color1: color1,
//             color2: color2
//         }
//     }

//     async getNextLineup(level:GameLevel, homeAway:HomeAway, options?:any) : Promise<LineupInfo> {
        
//         let colors = this.getColors(homeAway)

//         let color1 = colors.color1
//         let color2 = colors.color2

//         //Get next queued lineup
//         let queuedLineup:LineupGameQueue = await this.getNextLineupGameQueue(level, options)
       
//         //Get next queued group of players
//         let players:Player[]
        
//         try {
//             players = await this.getQueuedIndividualLineup(level, options)
//         } catch(ex) { }
        

//         if (!queuedLineup && !players) return

//         //Is the lineup or the player queued first?
//         if (!players || players.length == 0 || queuedLineup?.dateCreated > players[0]?.dateCreated ) {

//             //Lineup
//             let lineup:Lineup = await this.lineupService.get(queuedLineup.lineupId, options)

//             //Get players on team
//             let players:Player[] = await Promise.all(lineup.players.map(async(p) => await this.playerService.getByTokenId(p.tokenId)))

//             let teamInfo:TeamInfo = await this.gameService.buildTeamInfoFromPlayers(homeAway.toString(), players, color1, color2)

//             return {
//                 teamInfo: teamInfo,
//                 lineup: lineup
//             }

//         } else {
//             //Individual
//             return {
//                 teamInfo: await this.gameService.buildTeamInfoFromPlayers(homeAway.toString(), players, color1, color2),
//                 players: players
//             }
//         }






//     }

//     async getQueuedIndividualLineup(level:GameLevel, options?:any) : Promise<Player[]> {

//         //P
//         let p:IndividualGameQueue[] = await this.individualGameQueueRepository.getByPositionAndLevel(Position.PITCHER, level, options)

//         if (!p || p?.length == 0) {
//             throw new Error(`Unable to create lineup: No pitchers.`)
//         }

//         //C
//         let c:IndividualGameQueue[] = await this.individualGameQueueRepository.getByPositionAndLevel(Position.CATCHER, level, options)

//         if (!c || c?.length == 0) {
//             throw new Error(`Unable to create lineup: No catchers.`)
//         }

//         //1B
//         let first:IndividualGameQueue[] = await this.individualGameQueueRepository.getByPositionAndLevel( Position.FIRST_BASE, level, options)

//         if (!first || first?.length == 0) {
//             throw new Error(`Unable to create lineup: No 1B.`)
//         }

//         //2B
//         let second:IndividualGameQueue[] = await this.individualGameQueueRepository.getByPositionAndLevel(Position.SECOND_BASE, level, options)

//         if (!second || second?.length == 0) {
//             throw new Error(`Unable to create lineup: No 2B.`)
//         }

//         //3B
//         let third:IndividualGameQueue[] = await this.individualGameQueueRepository.getByPositionAndLevel( Position.THIRD_BASE, level, options)

//         if (!third || third?.length == 0) {
//             throw new Error(`Unable to create lineup: No 3B.`)
//         }

//         //SS
//         let ss:IndividualGameQueue[] = await this.individualGameQueueRepository.getByPositionAndLevel( Position.SHORTSTOP, level, options)

//         if (!ss || ss?.length == 0) {
//             throw new Error(`Unable to create lineup: No SS.`)
//         }

//         //LF
//         let lf:IndividualGameQueue[] = await this.individualGameQueueRepository.getByPositionAndLevel( Position.LEFT_FIELD, level, options)

//         if (!lf || lf?.length == 0) {
//             throw new Error(`Unable to create lineup: No LF.`)
//         }

//         //CF
//         let cf:IndividualGameQueue[] = await this.individualGameQueueRepository.getByPositionAndLevel(Position.CENTER_FIELD, level, options)

//         if (!cf || cf?.length == 0) {
//             throw new Error(`Unable to create lineup: No CF.`)
//         }

//         //RF
//         let rf:IndividualGameQueue[] = await this.individualGameQueueRepository.getByPositionAndLevel(Position.RIGHT_FIELD, level, options)

//         if (!rf || rf?.length == 0) {
//             throw new Error(`Unable to create lineup: No RF.`)
//         }
        
//         let lineupPlayers = [
//             await this.playerService.get(c[0].playerId),
//             await this.playerService.get(first[0].playerId),
//             await this.playerService.get(second[0].playerId),
//             await this.playerService.get(third[0].playerId),
//             await this.playerService.get(ss[0].playerId),
//             await this.playerService.get(lf[0].playerId),
//             await this.playerService.get(cf[0].playerId),
//             await this.playerService.get(rf[0].playerId)
//         ].sort( (a,b) => b.rating.rating - a.rating.rating)

        
//         lineupPlayers.push(await this.playerService.get(p[0].playerId))

//         return lineupPlayers

//     }

//     private async getNextLineupGameQueue(level:GameLevel, options?:any) {

//         //Get next queued lineup
//         let queuedLineup:LineupGameQueue 
//         let lineupGameQueues:LineupGameQueue[] = await this.lineupGameQueueRepository.getByLevel(level, Object.assign({ limit: 1 }, options))
        
//         if (lineupGameQueues?.length > 0) {
//             queuedLineup = lineupGameQueues[0]
//         }

//         return queuedLineup

//     }

//     private async dequeueLineupInfo(lineupInfo:LineupInfo, options?:any) {

//         if (lineupInfo?.lineup) {

//             await this.dequeueLineup(lineupInfo.lineup, options)
            
//         } else if (lineupInfo?.players?.length > 0) {

//             for (let player of lineupInfo.players) {
//                 await this.dequeuePlayer(player, options)
//             }

//         }

//     }
    

//     async announceGameStart(game:Game) {

//         try {

//             let channel:TextChannel = await this.discord.channels.fetch(process.env.PLAY_CHANNEL_ID) as TextChannel
            
//             const gameEmbed = new EmbedBuilder()
//                 .setColor(0x0099FF)
//                 .setURL(`${process.env.WEB}/#!/g?id=${game._id}`)
//                 .setTitle(`Game started. Play ball!`)
    
//             await channel.send({ content: '', embeds: [gameEmbed],  components: [] })

//         } catch(ex) {

//             console.log(ex)

//         }



//     }
   

// }


// interface LineupInfo {
//     teamInfo:TeamInfo
//     players?:Player[]
//     lineup?:Lineup
// }

// export {
//     GameQueueService
// }





//     /** LINEUPS */
//     // async startIndividual(options?:any) : Promise<GameViewModel[]> {

//     //     let allGames:GameViewModel[] = []

//     //     //Start at the highest level and go to the lowest and try to clear the queues and start as many games as possible.
//     //     for (let level=GameLevel.PROS; level >= GameLevel.HIGH_SCHOOL; level-- ) {

//     //         let game:Game

//     //         do {

//     //             game = await this.startNextIndividualGame(level, options)
                
//     //             if (game) {
//     //                 allGames.push(this.gameService.getGameViewModel(game))
//     //             }

//     //         } while(game != undefined)

//     //     }


//     //     return allGames

//     // }

//     // async startNextIndividualGame(level:GameLevel, options?:any) : Promise<Game> {

//     //     let rng = await this.seedService.getRNG()

//     //     //Create red team
//     //     let red:TeamInfo
//     //     let blue:TeamInfo
//     //     try {
//     //         red = await this.getNextIndividualLineup(level, options)
//     //         blue = await this.getNextIndividualLineup(level, options)
//     //     } catch(ex) {}

//     //     if (!red || !blue) return

//     //     let allPlayers = [].concat(red.players).concat(blue.players)

//     //     let averageLevel:number = this.gameService.getAverageLevel(allPlayers)
//     //     let averageAge:number = this.gameService.getAverageAge(allPlayers)


//     //     //Roll for home
//     //     let roll = await this.rollService.getRoll(rng, 0, 1)

//     //     let gameOptions:SimGameCommand
//     //     let leagueAverages:LeagueAverage = this.playerService.buildLeagueAverages(level, averageLevel, averageAge)

//     //     if (roll == 0) {
//     //         gameOptions = { 
//     //             awayTeam: red, 
//     //             homeTeam: blue,
//     //             leagueAverages: leagueAverages,
//     //             level: level
//     //         }
//     //     } else {
//     //         gameOptions = { 
//     //             awayTeam: blue, 
//     //             homeTeam: red,
//     //             leagueAverages: leagueAverages,
//     //             level: level
//     //         }
//     //     }

//     //     let game:Game = await this.gameService.startGame(gameOptions, options)
//     //     game.level = level

//     //     //Remove players from queue
//     //     for (let player of red.players) {
//     //         await this.dequeuePlayer(await this.playerService.get(player._id), options)
//     //     }

//     //     for (let player of blue.players) {
//     //         await this.dequeuePlayer(await this.playerService.get(player._id), options)
//     //     }

//     //     return game

//     // }

//     // async getNextIndividualLineup(level:GameLevel, options?:any) : Promise<TeamInfo> {
        
//     //     //Get players on team
//     //     let players:Player[] = await this.getQueuedIndividualLineup(level, options)

//     //     return this.gameService.buildTeamInfoFromPlayers("Team", players)

//     // }



    
//     // async isQueueEligible(player:Player, options?:any) {

//     //     let existingIndividualQueue:IndividualGameQueue = await this.individualGameQueueRepository.getByPlayer(player, options) 

//     //     if (existingIndividualQueue?._id) {
//     //         return false
//     //     }

//     //     //Check if queued on a lineup.
//     //     let lineupGameQueue:LineupGameQueue = await this.lineupGameQueueRepository.getByPlayer(player, options)

//     //     if (lineupGameQueue?._id) {
//     //         return false
//     //     }

//     //     //Check cooldowns.
//     //     let aDayAgo = dayjs().subtract(1, 'days').toDate()

//     //     if (player.lastGamePlayed > aDayAgo) {
//     //         return false
//     //     }

//     //     return true

//     // }