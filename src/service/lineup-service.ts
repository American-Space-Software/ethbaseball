import { inject, injectable } from "inversify";
import { Lineup } from "./enums.js";

@injectable()
class LineupService {


    constructor(

    ) {}

    lineupReplace(lineup:Lineup, addPlayer, replaceId) {
        const index = lineup.order.indexOf( lineup.order.find(p => p._id == replaceId) )
        lineup.order[index] = {
            _id: addPlayer._id,
            position: addPlayer.primaryPosition
        }
    }

    lineupSwap(lineup:Lineup, fromId, toId) {

        const fromIndex = lineup.order.indexOf( lineup.order.find(p => p._id == fromId) )
        const toIndex = lineup.order.indexOf( lineup.order.find(p => p._id == toId) )

        let f = lineup.order[fromIndex]
        let t = lineup.order[toIndex]

        lineup.order[fromIndex] = t
        lineup.order[toIndex] = f

    }

    lineupMove(lineup:Lineup, moveId, spot) {

        const fromIndex = lineup.order.indexOf( lineup.order.find(p => p._id == moveId) )

        lineup.order[spot] = lineup.order[fromIndex]
        lineup.order[fromIndex] = {}

    }

    lineupRemove(lineup:Lineup, removeId) {
        const index = lineup.order.indexOf( lineup.order.find(p => p._id == removeId) )
        lineup.order[index] = {}
    }

    lineupAdd(lineup:Lineup, addPlayer, index) {
        lineup.order[index] = {
            _id: addPlayer._id,
            position: addPlayer.primaryPosition
        }
    }
    
    lineupRemoveByPosition(lineup:Lineup, position) {

        const index = lineup.order.indexOf(lineup.order.find(p => p.position == position))

        const playerId = lineup.order[index]?._id

        if (playerId) {
            lineup.order[index] = {}
        }

        return playerId

    }

    rotationReplace(lineup:Lineup, addPlayer, replaceId) {
        const index = lineup.rotation.indexOf( lineup.rotation.find(p => p._id == replaceId) )
        lineup.rotation[index] = {
            _id: addPlayer._id
        }
    }

    rotationSwap(lineup:Lineup, fromId, toId) {

        const fromIndex = lineup.rotation.indexOf( lineup.rotation.find(p => p._id == fromId) )
        const toIndex = lineup.rotation.indexOf( lineup.rotation.find(p => p._id == toId) )

        let f = lineup.rotation[fromIndex]
        let t = lineup.rotation[toIndex]

        lineup.rotation[fromIndex] = t
        lineup.rotation[toIndex] = f

    }

    rotationMove(lineup:Lineup, moveId, spot) {

        const fromIndex = lineup.rotation.indexOf( lineup.rotation.find(p => p._id == moveId) )

        lineup.rotation[spot] = lineup.rotation[fromIndex]
        lineup.rotation[fromIndex] = {}

    }

    rotationRemove(lineup:Lineup, removeId) {
        const index = lineup.rotation.indexOf( lineup.rotation.find(p => p._id == removeId) )
        lineup.rotation[index] = {}
    }

    rotationAdd(lineup:Lineup, addPlayer, index) {
        lineup.rotation[index] = {
            _id: addPlayer._id
        }
    }


    getFirstAvailableOrderSpot(lineup:Lineup) {
        //Find the first empty spot from the end for a pitcher.
        for ( let i =0; i < 9; i++) {
            if (!lineup.order[i]?._id) {
                return i
            }
        }
    }

    getFirstAvailableRotationSpot(lineup:Lineup) {
        //Find the first empty spot from the end for a pitcher.
        for ( let i =0; i < 5; i++) {
            if (!lineup.rotation[i]?._id) {
                return i
            }
        }
    }


    availableHitterAdd(lineup: Lineup, playerId: string) {

        if (lineup.availableHitters.find(p => p._id == playerId)) return

        lineup.availableHitters.push({
            _id: playerId
        })

    }

    availableHitterRemove(lineup: Lineup, playerId: string) {

        const index = lineup.availableHitters.indexOf(lineup.availableHitters.find(p => p._id == playerId))

        if (index >= 0) {
            lineup.availableHitters.splice(index, 1)
        }

    }

    availablePitcherAdd(lineup: Lineup, playerId: string, role, priority: number) {

        if (lineup.availablePitchers.find(p => p.playerId == playerId)) return

        lineup.availablePitchers.push({
            playerId,
            role,
            priority
        })

    }

    availablePitcherRemove(lineup: Lineup, playerId: string) {

        const index = lineup.availablePitchers.indexOf(lineup.availablePitchers.find(p => p.playerId == playerId))

        if (index >= 0) {
            lineup.availablePitchers.splice(index, 1)
        }

    }

    moveLineupPlayerToAvailableHitters(lineup: Lineup, playerId: string) {

        this.lineupRemove(lineup, playerId)
        this.availableHitterAdd(lineup, playerId)

    }

    moveAvailableHitterToLineup(lineup: Lineup, player, index: number) {

        this.availableHitterRemove(lineup, player._id)
        this.lineupAdd(lineup, player, index)

    }

    moveRotationPitcherToAvailablePitchers(lineup: Lineup, playerId: string, role, priority: number) {

        this.rotationRemove(lineup, playerId)
        this.availablePitcherAdd(lineup, playerId, role, priority)

    }

    moveAvailablePitcherToRotation(lineup: Lineup, player, index: number) {

        this.availablePitcherRemove(lineup, player._id)
        this.rotationAdd(lineup, player, index)

    }


}



export {
    LineupService
}