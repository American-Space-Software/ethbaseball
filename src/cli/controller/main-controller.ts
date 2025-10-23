import { injectable } from 'inversify';
import { UserIOService } from '../../service/userio-service.js';
import { GameService, GameViewModel, LastPlay } from '../../service/game-service.js';
import { Player } from '../../dto/player.js';
import { PlayerService } from '../../service/player-service.js';
import { SchemaService } from '../../service/schema-service.js';
import { OwnerService } from '../../service/owner-service.js';
import { Owner } from '../../dto/owner.js';

import { Position } from '../../service/enums.js';


const PER_PAGE = 20


@injectable()
class MainController {

    //We're going to mock authentication on the CLI for now
    connected:Owner

    constructor(
        private userIO:UserIOService,
        private gameService:GameService,
        private schemaService:SchemaService,
        private playerService:PlayerService,
        private ownerService:OwnerService,
    ) {}

    async start() {

        await this.schemaService.load()

        await this.connect(["xyz"])

        let keepRunning = true

        while (keepRunning) {

            try {
                
                let result = await this.userIO.getMenuSelection()

                let split = result.split(" ")
        
                if (split[0] == "/help") {
                    await this.help()
                } else if (split[0] == "/connect") {
                    await this.connect(split.slice(1))
                } else if (split[0] == "/scout") {
                    await this.scout(split.slice(1))
                } else if (split[0] == "/draftteam") {
                    await this.draftTeam()
                } else if (split[0] == "/player") {
                    await this.showPlayer(split.slice(1))
                } else if (split[0] == "/lineups") {
                    await this.showLineups(split.slice(1))
                } else if (split[0] == "/lineup") {
                    await this.lineupShow(split.slice(1))
                } else if (split[0] == "/lineupcreate") {
                    await this.lineupCreate(split.slice(1))
                } else if (split[0] == "/lineupadd") {
                    await this.lineupAdd(split.slice(1))
                } else if (split[0] == "/lineupremove") {
                    await this.lineupRemove(split.slice(1))
                } else if (split[0] == "/lineupmove") {
                    await this.lineupMove(split.slice(1))
                } else if (split[0] == "/joinall") {
                    await this.joinAll(split.slice(1))
                } else if (split[0] == "/roster") {
                    await this.roster(split.slice(1))
                } else if (split[0] == "/start") {
                    await this.startGames(split.slice(1))
                } else if (split[0] == "/game") {
                    await this.showGame(split.slice(1))
                } else if (split[0] == "/play") {
                    await this.playGames()
                } else if (split[0] == "/quit") {
                    keepRunning = false
                } else {
                    await this.userIO.printUnrecognizedCommand()
                }

            } catch (ex) {
                await this.userIO.print(ex.message)
            }

        }

        await this.userIO.printGoodbye()

    }



    async help() {
        await this.userIO.printHelp()
    }

    async connect(args:string[]) {

        if (args?.length == 0) {
            throw new Error(this.userIO.getWalletAddressError())
        }

        //Validate
        if (args[0].length == 0) {
            throw new Error(this.userIO.getWalletAddressError())
        }

        this.connected = await this.ownerService.getOrCreate(args[0])

        this.userIO.printConnectMessage(this.connected._id)

    }

    async roster(args:string[]) {


        if (!this.connected) {
            throw new Error(this.userIO.getNoWalletSelectedError())
        }

        let pageNumber
        try {
             pageNumber = parseInt(args[0]) - 1
        } catch(ex) {
            throw new Error("Invalid page number.")
        }

        if (!pageNumber) pageNumber = 0

        let players:Player[] = await this.playerService.getByOwner(this.connected, { 
            limit: PER_PAGE,
            offset: pageNumber * PER_PAGE
        })


        let total = await this.playerService.countByOwner(this.connected)

        this.userIO.printRoster(players, this.connected._id, pageNumber+1, PER_PAGE, total)

    }

    async showPlayer(args:string[]) {

        if (!this.connected) {
            throw new Error(this.userIO.getNoWalletSelectedError())
        }

        let playerId
        try {
            playerId = parseInt(args[0])

            let player:Player = await this.playerService.get(playerId)

            this.userIO.printPlayer(player)

        } catch(ex) {
            throw new Error("Invalid player ID.")
        }

    }

    async scout(args:string[]) {

        if (!this.connected) {
            throw new Error(this.userIO.getNoWalletSelectedError())
        }

        if (args?.length == 0) {
            throw new Error(this.userIO.getDraftArgsError())
        }
        
        let position = args[0]?.toUpperCase()

    
        if (  !Object.values(Position).includes(position as Position)  ) {
            throw new Error("Invalid position selected.")
        }



        // let player:Player  = await this.playerService.scoutPlayer({ 
        //     type: position as Position,
        //     onDate: new Date(new Date().toUTCString()) 
        // })

        // this.userIO.printPlayer(player)
        
        // let choice = await this.userIO.getDraftScoutExitOption()

        // if (choice == "DRAFT") {

        //     // await this.playerService.draftPlayer(this.connected, player)
        //     this.userIO.print(this.userIO.getPlayerDraftedMessage(player))

        // } else if (choice == "SCOUT") {
            
        //     this.userIO.print(this.userIO.getPlayerNotDraftedMessage())
        //     this.scout(args)

        // } else {

        //     this.userIO.print(this.userIO.getPlayerNotDraftedMessage())

        // }

    }

    async draftTeam() {

        if (!this.connected) {
            throw new Error(this.userIO.getNoWalletSelectedError())
        }

        // let draftResult = await this.playerService.draftTeam(this.connected)
        // this.userIO.printDraftTeamResults(draftResult.lineup, draftResult.players, this.connected._id)

    }

    async showLineups(args:string[]) {

        if (!this.connected) {
            throw new Error(this.userIO.getNoWalletSelectedError())
        }

        let pageNumber
        try {
             pageNumber = parseInt(args[0]) - 1
        } catch(ex) {
            throw new Error("Invalid page number.")
        }

        if (!pageNumber) pageNumber = 0

        // let lineups:Lineup[] = await this.lineupService.getByOwner(this.connected, { 
        //     limit: PER_PAGE,
        //     offset: pageNumber * PER_PAGE
        // })

        // let total = await this.lineupService.countByOwner(this.connected)

        // this.userIO.printLineups(lineups, this.connected._id, pageNumber+1, PER_PAGE, total)

    }

    async lineupShow(args:string[]) {

        if (!this.connected) {
            throw new Error(this.userIO.getNoWalletSelectedError())
        }

        // let lineup:Lineup = await this.getLineup(args[0])

        // this.userIO.printLineups([lineup], this.connected._id, 1, PER_PAGE, 1)

    }

    async lineupCreate(args:string[]) {

        if (!this.connected) {
            throw new Error(this.userIO.getNoWalletSelectedError())
        }

        if (args?.length == 0) {
            throw new Error(this.userIO.getLineupCreateArgsError())
        }


        // let lineup:Lineup = await this.lineupService.createLineup({ owner: this.connected})

        // this.userIO.print(this.userIO.getLineupCreatedMessage(lineup))


    }

    async lineupAdd(args:string[]) {

        if (!this.connected) {
            throw new Error(this.userIO.getNoWalletSelectedError())
        }

        if (args?.length == 0) {
            throw new Error(this.userIO.getLineupCreateArgsError())
        }

        // let lineup:Lineup = await this.getLineup(args[0])
        // let player:Player = await this.getPlayer(args[1])
        
        // let spotId
        // try {
        //     spotId = parseInt(args[2])

        //     if (!Number.isInteger(spotId)) {
        //         spotId = lineup.players.length + 1 
        //     }

        // } catch(ex) {
        //     throw new Error("Invalid spot.")
        // }

        // try {
        //     await this.lineupService.addToLineup(lineup, player, spotId)
        // } catch(ex) {
        //     throw new Error(ex.message)
        // }

        // this.userIO.printLineups([lineup], this.connected._id, 1, 1, 1)

    }

    async lineupRemove(args:string[]) {

        // if (!this.connected) {
        //     throw new Error(this.userIO.getNoWalletSelectedError())
        // }

        // if (args?.length == 0) {
        //     throw new Error(this.userIO.getLineupCreateArgsError())
        // }

        // let lineup:Lineup = await this.getLineup(args[0])
        // let player:Player = await this.getPlayer(args[1])

        // try {
        //     await this.lineupService.removeFromLineup(lineup, player)
        // } catch(ex) {
        //     throw new Error(ex.message)
        // }

        // this.userIO.printLineups([lineup], this.connected._id, 1, 1, 1)


    }

    async lineupMove(args:string[]) {

        // if (!this.connected) {
        //     throw new Error(this.userIO.getNoWalletSelectedError())
        // }

        // if (args?.length == 0) {
        //     throw new Error(this.userIO.getLineupCreateArgsError())
        // }

        // let lineup:Lineup = await this.getLineup(args[0])
        // let player:Player = await this.getPlayer(args[1])

        // let spotId
        // try {
        //     spotId = parseInt(args[2])

        //     if (!Number.isInteger(spotId)) {
        //         spotId = 1
        //     }

        // } catch(ex) {
        //     throw new Error("Invalid spot.")
        // }

        // try {
        //     await this.lineupService.moveLineupSpot(lineup, player, spotId)
        // } catch(ex) {
        //     throw new Error(ex.message)
        // }

        // this.userIO.printLineups([lineup], this.connected._id, 1, PER_PAGE, 1)


    }

    async joinLineup(args:string[]) {

        // if (!this.connected) {
        //     throw new Error(this.userIO.getNoWalletSelectedError())
        // }

        // if (args?.length == 0) {
        //     throw new Error(this.userIO.getJoinLineupInvalidArgsMessage())
        // }

        // let lineup:Lineup = await this.getLineup(args[0])

        // await this.gameQueueService.queueLineup(lineup)

        // this.userIO.printLineupQueueSuccess(lineup)


    }

    async joinAll(args:string[]) {

        // let result = await this.gameQueueService.queueAllOwnedPlayers(this.connected)

        // this.userIO.printQueuedPlayers(result.success, result.errors)


    }

    async startGames(args:string[]) {

        // // let startedIndividual:GameViewModel[] = await this.gameQueueService.startIndividual()
        // let startedTeam:GameViewModel[] = await this.gameQueueService.startLineups()
        
        // this.userIO.printGamesStarted(startedIndividual.concat(startedTeam))

    }

    async showGame(args:string[]) {

        try {
            let game:GameViewModel = await this.getGame(args[0])
            this.userIO.printGamesStarted([game])
        } catch(ex) {
            this.userIO.print(ex.message)
        }

    }

    async playGames() {

        // let games:Game[] = await this.gameService.incrementAll()

        // for (let game of games) {
            
        //     let gameViewModel:GameViewModel = this.gameService.getGameViewModel(game)

        //     this.userIO.print(this.userIO.getGameOutput(gameViewModel))
        // }

    }

    private async getLineup(arg:string) {

        // let lineup:Lineup
        // try {

        //     let lineupId = parseInt(arg)
        //     lineup = await this.lineupService.getByIndex(this.connected, lineupId)

        //     if (lineup.ownerId != this.connected._id) {
        //         throw new Error(this.userIO.getInvalidLineupMessage())
        //     }

        // } catch(ex) {
        //     throw new Error(this.userIO.getInvalidLineupMessage())
        // }

        // return lineup

    }

    private async getPlayer(arg:string) {

        let player:Player

        try {

            // let playerId = parseInt(arg)

            // if (playerId) {

            //     player = await this.playerService.getByTokenId(playerId)

            //     if (!player) {
            //         throw new Error(this.userIO.getInvalidPlayerMessage())
            //     }
    
            //     if (player.ownerId != this.connected._id) {
            //         throw new Error(this.userIO.getPlayerNotOnRosterMessage())
            //     }

            // } else {
            //     throw new Error(this.userIO.getInvalidPlayerMessage())
            // }


        } catch(ex) {
            throw new Error(this.userIO.getInvalidPlayerMessage())
        }

        return player
    } 

    private async getGame(arg:string) {

        let gvm:GameViewModel
        try {

            gvm = this.gameService.getGameViewModel(await this.gameService.get(arg))

            if (!gvm) {
                throw new Error(this.userIO.getInvalidGameMessage())
            }

        } catch(ex) {
            throw new Error(this.userIO.getInvalidGameMessage())
        }

        return gvm

    }


    // private async getLevel(arg:string) {

    //     let level:Level
    //     try {

    //         level = parseInt(arg)

    //         if (!Object.values(Level).includes(level as Level)) {
    //             throw new Error(this.userIO.getInvalidLevelMessage())
    //         }

    //     } catch(ex) {
    //         throw new Error(this.userIO.getInvalidLevelMessage())
    //     }

    //     return level

    // }



}

export { MainController }
