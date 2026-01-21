import dayjs from "dayjs";
import { inject, injectable } from "inversify";


@injectable()
class OffChainEventWebService {

    constructor() {}

    getOffChainDescription (oce, players, teams) {

        if (oce.contractType == "PLAYERS" && oce.event == "Transfer") {

            const player = players.find(p => p._id == oce.playerId)

            //Drop
            if (oce.fromTeamId && !oce.toTeamId) {
                
                let fromTeam = teams.find( t => t._id == oce.fromTeamId  )

                return `${player?.fullName} dropped by ${fromTeam?.name}.`

            }

            //Singing
            if (!oce.fromTeamId && oce.toTeamId) {
                let toTeam = teams.find( t => t._id == oce.toTeamId  )

                return `${player?.fullName} signed by ${toTeam?.name}.`
             }

            //Trade
            if (oce.fromTeamId && oce.toTeamId) { 
                
                let fromTeam = teams.find( t => t._id == oce.fromTeamId  )
                let toTeam = teams.find( t => t._id == oce.toTeamId  )
                
                return `${player?.fullName} traded from ${fromTeam?.name} to ${toTeam?.name}.`  
            }

        }


        if (oce.contractType == "DIAMONDS" && oce.event == "Transfer") {

            if (oce.toAddress == "0x0000000000000000000000000000000000000000") {

                if (oce.fromTeamId) {
                    return "Expenses"
                } else {
                    return "Created Mint Pass"
                }

            }

            if (oce.fromAddress == "0x0000000000000000000000000000000000000000") {

                if (oce.toTeamId) {

                    if (oce.source?.type == "reward" && oce.source?.rewardType == "daily") {
                        return `Daily reward`
                    } else if (oce.source?.type == "reward" && oce.source?.rewardType == "season") {
                        return `Season reward`

                    }
                }

                return "Reward"

            }
        }

    }


}

export {
    OffChainEventWebService
}