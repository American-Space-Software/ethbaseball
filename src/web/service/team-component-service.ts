import { inject, injectable } from "inversify";
import { LoginWebService } from "./login-web-service.js";
import { TeamWebService } from "./team-web-service.js";
import { Position } from "../../service/enums.js";
import { LineupService } from "../../service/lineup-service.js";


@injectable()
class TeamComponentService {

    constructor(
        private loginWebService:LoginWebService,
        private teamWebService:TeamWebService,
        private lineupService:LineupService
    ) {}

    loading = false
    hasChanges = false

    authInfo:any
    selected = "stats"

    team
    startDate
    games = []

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
                    h.push({
                        fullName: "Pitcher Slot",
                        primaryPosition: Position.PITCHER
                    })
                } else {
                    h.push({ })
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
                p.push({ })
            }

        }

        return p
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

            this.authInfo = await this.loginWebService.getAuthInfo()
            let teamViewModel = await this.teamWebService.getByDate(teamId, startDate)

            this.team = teamViewModel.team
            this.startDate = startDate
           
            this.rosterPlayers.length = 0
            this.rosterPlayers.push(...teamViewModel.players)

            this.games.length = 0
            this.games.push(...teamViewModel.games)


            this.hasChanges = false
            this.loading = false

        }
        

        return this.team

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


    combineStatsAndRatings(statsResult, ratingsResult) {

        for (let hitterStat of statsResult.hitters) {
            let ratingsPlayer = ratingsResult.hitters.find(p => p._id == hitterStat._id)
            hitterStat.ratings = {}
            hitterStat.ratings.hitting = ratingsPlayer.ratings.hitting
        }

        for (let pitcherStat of statsResult.pitchers) {
            let ratingsPlayer = ratingsResult.pitchers.find(p => p._id == pitcherStat._id)
            pitcherStat.ratings = {}

            pitcherStat.ratings.pitching = ratingsPlayer.ratings.pitching
            pitcherStat.ratings.pitchRating = ratingsPlayer.ratings.pitchRating
        }
    }


    // removeRosterHitter(player) {

    //     this.removeRoster(player)

    //     for (let lineup of this.team.lineups) {
    //         this.lineupService.lineupRemove(lineup, player._id)
    //     }

    // }


    // removeRosterPitcher(player) {

    //     this.removeRoster(player)

    //     for (let lineup of this.team.lineups) {
    //         this.lineupService.rotationRemove(lineup, player._id)
    //     }

    // }


    // addRoster(player) {

    //     //Remove from unrostered
    //     this.arrayRemove(this.unrosteredPlayers, player._id)

    //     //Add to rostered
    //     this.arrayAdd(this.rosterPlayers, player)

    //     player.team = {
    //         cityName: this.team.city ? this.team.city.name : undefined,
    //         name: this.team.name,
    //         _id: this.team._id
    //     }

    // }

    // removeRosterById(id) {
    //     this.removeRoster(this.getPlayer(id))
    // }

    // removeRoster(player) {

    //     //Remove existing player from roster
    //     this.arrayRemove(this.rosterPlayers, player._id)

    //     //Add to unrostered
    //     this.arrayAdd(this.unrosteredPlayers, player)

    //     player.team = undefined

    // }

    

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



    // getLastAvailableOrderSpot(lineup) {
    //     //Find the first empty spot from the end for a pitcher.
    //     for ( let i =8; i >=0; i--) {
    //         if (!lineup.order[i]?._id) {
    //             return i
    //         }
    //     }
    // }

    // getLastAvailableRotationSpot(lineup) {
    //     //Find the first empty spot from the end for a pitcher.
    //     for ( let i =4; i >=0; i--) {
    //         if (!lineup.rotation[i]?._id) {
    //             return i
    //         }
    //     }
    // }

    
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

    // autoFillLineup() {

    //     let lineup = this.team.lineups[0]

    //     let positions = [
    //         Position.CATCHER,
    //         Position.FIRST_BASE,
    //         Position.SECOND_BASE,
    //         Position.SHORTSTOP,
    //         Position.THIRD_BASE,
    //         Position.LEFT_FIELD,
    //         Position.RIGHT_FIELD,
    //         Position.CENTER_FIELD        
    //     ]


    //     for (let position of positions) {

    //         //Look for a player at this position
    //         if (lineup.order.filter( p => p.position == position).length == 0) {

    //             //Find the highest rated player that's not on another team
    //             let matches = this.unrosteredPlayers.filter(p => p.primaryPosition == position && p.team?._id == undefined).sort( (a,b) => b.overallRating - a.overallRating)

    //             if (matches.length > 0) {


    //                 this.hasChanges = true

    //                 let highestRated = matches[0]

    //                 //Find the next open slot
    //                 let spot = this.lineupService.getFirstAvailableOrderSpot(lineup)

    //                 //Add player to roster
    //                 this.addRoster(highestRated)

    //                 //Add player to lineup
    //                 this.lineupService.lineupAdd(lineup, highestRated, spot)

    //             }


    //         }

    //     }


    //     //Make sure we're at 5 pitchers
    //     let pitcherCount = lineup.rotation.filter( p => p._id != undefined).length

    //     if (pitcherCount < 5) {

    //         let unrosteredPitchers = this.unrosteredPlayers.filter(p => p.primaryPosition == Position.PITCHER && p.team?._id == undefined).sort( (a,b) => b.overallRating - a.overallRating)

    //         let pitchersToAdd = unrosteredPitchers.slice(0, 5 - pitcherCount)

    //         this.hasChanges = true

    //         for (let pitcher of pitchersToAdd) {

    //             //Find the next open slot
    //             let spot = this.lineupService.getFirstAvailableRotationSpot(lineup)

    //             //Add player to roster
    //             this.addRoster(pitcher)

    //             //Add player to lineup
    //             this.lineupService.rotationAdd(lineup, pitcher, spot)

    //         }

    //     }

    // }


}

export {
    TeamComponentService
}