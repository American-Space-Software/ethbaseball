import { inject, injectable } from "inversify";
import { LoginWebService } from "./login-web-service.js";
import { TeamWebService } from "./team-web-service.js";
import { Position } from "../../service/enums.js";
import { LineupService } from "../../service/lineup-service.js";
import { GameWebService } from "./game-web-service.js";


@injectable()
class TeamComponentService {

    constructor(
        private loginWebService:LoginWebService,
        private teamWebService:TeamWebService,
        private lineupService:LineupService,
        private gameWebService:GameWebService
    ) {}

    loading = false
    hasChanges = false

    authInfo:any
    selected = "stats"

    team
    startDate
    inProgressGame
    completedGames = []

    rosterPlayers:any[] = []

    get hasEmptySpots() {

        let emptyLineupSpots = this.team.lineups[0].order.filter(p => p._id != undefined).length < 8
        let emptyRotationSpots = this.team.lineups[0].rotation.filter(p => p._id != undefined).length < 5

        return emptyLineupSpots || emptyRotationSpots

    }

    getDisplayHitters() {
        if (!this.team) return []
        return this.buildDisplayHitters(this.team.lineups[0])
    }

    getDisplayPitchers(){
        if (!this.team) return []
        return this.buildDisplayPitchers(this.team.lineups[0])
    }

    buildDisplayHitters(lineup) {

        let h = []

        for (let player of lineup.order) {

            if (player._id) {
                h.push(this.getPlayer(player._id))
            } else {
                if (player.position == Position.PITCHER) {
                    // h.push({
                    //     fullName: "Pitcher Slot",
                    //     primaryPosition: Position.PITCHER
                    // })
                } else {
                    h.push({ fullName: "Sign a free agent.", primaryPosition: player.position } )
                }
            }

        }

        return h
    }

    buildDisplayPitchers(lineup) {

        let p = []

        for (let player of lineup.rotation) {

            if (player._id) {
                p.push(this.getPlayer(player._id))
            } else {
                p.push({ fullName: "Sign a free agent.", primaryPosition: "P" } )
            }

        }

        return p
    }

    updateInProgressGame(inProgressGame) {
        Object.assign(this.inProgressGame, this.gameWebService.getGameViewModel(inProgressGame))
    }

    getRosterSize() {
        return this.rosterPlayers.length
    }

    getPlayer(id) {
        return this.rosterPlayers.find(p => p._id == id)
    }

    isTeamOwner() {
        return (this.authInfo?._id == this.team?.owner?._id && this.team?.owner?._id != undefined)
    }

    async loadTeam(teamId:string, startDate:string, options?:any) {

        if ( (options?.forceRefresh || teamId != this.team?._id || startDate != this.startDate) && this.loading == false) {
            
            console.log(`Loading team ${teamId}/${startDate}`)

            this.loading = true

            let authInfo = await this.loginWebService.getAuthInfo()
            let teamViewModel = await this.teamWebService.getByDate(teamId, startDate)

            this.setLoadedTeam(teamViewModel, authInfo, startDate)


            this.hasChanges = false
            this.loading = false

        }
        

        return this.team

    }


    setLoadedTeam(teamViewModel, authInfo, startDate) {

        this.authInfo = authInfo

        this.team = teamViewModel.team
        this.startDate = startDate
        
        this.rosterPlayers.length = 0
        this.rosterPlayers.push(...teamViewModel.players)

        this.completedGames.length = 0
        this.completedGames.push(...teamViewModel.completedGames)


        delete this.inProgressGame

        if (teamViewModel.inProgressGame) {
            this.inProgressGame = this.gameWebService.getGameViewModel(teamViewModel.inProgressGame)
        }
        

        //Add placeholder positions for any missing lineup spots
        let order = this.team.lineups[0].order
        
        let missingPositions = this.listMissingPositionsInLineup(order)

        for (let position of missingPositions) {
            let firstBlankSpot = order.find( o => !o.position)
            firstBlankSpot.position = position                
        }

        this.hasChanges = false

    }


    dropPlayer(id) {

        let selectedPlayer = this.rosterPlayers.find(p => p._id == id)

        // if (selectedPlayer.primaryPosition == Position.PITCHER) {
        //     this.removeRosterPitcher(selectedPlayer)
        //     this.lineupService.rotationRemove(this.team.lineups[0], selectedPlayer._id)
        // } else {
        //     this.removeRosterHitter(selectedPlayer)
        //     this.lineupService.lineupRemove(this.team.lineups[0], selectedPlayer._id)
        // }

        this.hasChanges = true
    }


    moveToRoster(selectedId, currentPlayerId, spot, lineupIndex) {
        this.hasChanges = true

        let lineup = this.team.lineups[lineupIndex]

        let selectedPlayer = this.getPlayer(selectedId)
        let currentPlayer = this.getPlayer(currentPlayerId)

        let isSelectedRostered = this.rosterPlayers.find(p => p._id == selectedPlayer._id) != undefined


        //Handle adding/removing from roster move(s) first
        // if (!isSelectedRostered) {

        //     //If we're moving a player from unrostered to roster then remove current player from roster to make room.
        //     if (currentPlayer) {
        //         this.removeRoster(currentPlayer)
        //     }

        //     if (currentPlayer?.primaryPosition != selectedPlayer.primaryPosition) {

        //         //Remove any other players that play the same position as the selected player
        //         let removedId = this.lineupService.lineupRemoveByPosition(lineup, selectedPlayer.primaryPosition)

        //         let player = this.getPlayer(removedId)
        //         this.removeRoster(player)

        //     }

        //     //Add to roster
        //     this.addRoster(selectedPlayer)

        // } 


        if (selectedPlayer.primaryPosition != Position.PITCHER) {

            //Hitters
            let isSelectedInLineup = lineup.order.find(p => p._id == selectedPlayer._id) != undefined

            //Handle lineup move
            if (isSelectedRostered) {
    
                if (currentPlayer) {
                    //If the players are already on the roster and play different positions it's just a lineup swap
                    this.lineupService.lineupSwap(lineup, selectedPlayer._id, currentPlayer._id)
                } else {
                    //Not replacing anyone just move them
                    this.lineupService.lineupMove(lineup, selectedPlayer._id, spot)
                }
    
            } else {
    
                if (currentPlayer) {
    
                    this.lineupService.lineupReplace(lineup, selectedPlayer, currentPlayer._id)
    
                } else {
    
                    if (isSelectedInLineup) {
    
                        //If no current player in the spot and the selected player is already in the lineup just move them to the spot
                        this.lineupService.lineupMove(lineup, selectedPlayer._id, spot)
    
                    } else {
    
                        // if (selectedPlayer.primaryPosition == Position.PITCHER) {
                        //     spot = this.getLastAvailableSpot(lineup)
                        // }
            
                        this.lineupService.lineupAdd(lineup, selectedPlayer, spot) 
    
                    }
                }
    
            }



        } else {

            //Pitchers
            let isSelectedInRotation = lineup.rotation.find(p => p._id == selectedPlayer._id) != undefined

            //Handle lineup move
            if (isSelectedRostered) {
    
                if (currentPlayer) {
                    //If the players are already on the roster it's just a rotation spot swap
                    this.lineupService.rotationSwap(lineup, selectedPlayer._id, currentPlayer._id)
                } else {
                    //Not replacing anyone just move them
                    this.lineupService.rotationMove(lineup, selectedPlayer._id, spot)
                }
    
            } else {
    
                if (currentPlayer) {
    
                    this.lineupService.rotationReplace(lineup, selectedPlayer, currentPlayer._id)
    
                } else {
    
                    if (isSelectedInRotation) {
    
                        //If no current player in the spot and the selected player is already in the rotation just move them to the spot
                        this.lineupService.rotationMove(lineup, selectedPlayer._id, spot)
    
                    } else {
    
                        // if (selectedPlayer.primaryPosition == Position.PITCHER) {
                        //     spot = this.getLastAvailableSpot(lineup)
                        // }
            
                        this.lineupService.rotationAdd(lineup, selectedPlayer, spot) 
    
                    }
                }
    
            }

        }



    }

    
    arrayRemove(arr, id) {
        const index = arr.indexOf( arr.find(p => p._id == id) )
        arr.splice(index, 1)
    }

    arrayAdd(arr, player) {
        if (arr.filter(p => p.id == player._id).length == 0) {
            arr.push(player)
        }
    }

    arrayMove(arr, fromIndex, toIndex) {
        var element = arr[fromIndex]
        arr.splice(fromIndex, 1)
        arr.splice(toIndex, 0, element)
    }

    async save() {
        await this.teamWebService.setRoster( this.team._id, this.team.lineups )
        this.hasChanges = false
    }


    listMissingPositionsInLineup(order): Position[] {

        let required: Position[] = []

        let positions = [
            Position.CATCHER,
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE,
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD,
        ]

        for (let position of positions) {
            let current = order.filter(p => p.position == position).length
            if (current == 0) {
                required.push(position)
            }
        }

        return required

    }

    canAffordDrop() {

      if (!this.authInfo?.offChainDiamondBalance) return false
      if (!this.team?.minimumPlayerSalary) return false

      if (BigInt(this.authInfo.offChainDiamondBalance) < BigInt(this.team.minimumPlayerSalary)) return false

      return true

    }


}

export {
    TeamComponentService
}