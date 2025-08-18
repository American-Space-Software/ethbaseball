import { inject, injectable } from "inversify";
import { Lineup } from "../dto/team.js";
import { Position } from "./enums.js";

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

        const index = lineup.order.indexOf( lineup.order.find(p => p.position == position) )

        if (lineup.order[index]?._id) {
            lineup.order[index] = {}
        }

        return lineup.order[index]?._id

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

}



export {
    LineupService
}