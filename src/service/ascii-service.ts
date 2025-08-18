import { inject, injectable } from "inversify";

import { Player } from "../dto/player.js";

import Table from "easy-table"
import { PlayerService } from "./player-service.js";
import { Position } from "./enums.js";

@injectable()
class ASCIIService {

    constructor(
    ) {}
    
    getHelp() {

        return`### Wallet
\`\`\`
Balance:           /balance
\`\`\`
### Players
\`\`\`
Show Full Roster:  /roster
Show Player:       /player *id*
\`\`\`
`

    }

    getASCIIProfile(player:Player) {


    }


    getHitterTable(player: Player) {

        // const table = new Table()

        // table.cell('Type', 'Contact')
        // table.cell('Rating', player.hittingRatings.vsL.contact, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Gap Power')
        // table.cell('Rating', player.hittingRatings.vsL.gapPower, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Home Run')
        // table.cell('Rating', player.hittingRatings.vsL.homerunPower, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Plate Discipline')
        // table.cell('Rating', player.hittingRatings.vsL.plateDiscipline, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Speed')
        // table.cell('Rating', player.hittingRatings.speed, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Steal')
        // table.cell('Rating', player.hittingRatings.steals, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Line Drive')
        // table.cell('Rating', player.hittingRatings.vsL.lineDrive, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Ground Ball')
        // table.cell('Rating', player.hittingRatings.vsL.groundBall, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Defense')
        // table.cell('Rating', player.hittingRatings.defense, Table.number(0))
        // table.newRow()

        // return table.toString()


    }

    getPitcherTable(player: Player) {

        // const table = new Table()
          
        // table.cell('Type', 'Control')
        // table.cell('Rating', player.pitchRatings.vsL.control, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Power')
        // table.cell('Rating', player.pitchRatings.power, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Movement')
        // table.cell('Rating', player.pitchRatings.vsL.movement, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Line Drive')
        // table.cell('Rating', player.pitchRatings.vsL.lineDrive, Table.number(0))
        // table.newRow()

        // table.cell('Type', 'Ground Ball')
        // table.cell('Rating', player.pitchRatings.vsL.groundBall, Table.number(0))
        // table.newRow()

        // const pitchTable = new Table()

        // for (let pitch of player.pitchRatings.pitches) {
        //     pitchTable.cell('Type', pitch.type)
        //     pitchTable.cell('Rating', pitch.rating)
        //     pitchTable.newRow()
        // }


        // return `${table.toString()}\n${pitchTable.toString()}`

    }

    getRoster(players:Player[], offset:number, total:number) {

        const table = new Table()
        
        for (let player of players) {
            table.cell('ID', player._id)
            table.cell('Name', `${player.primaryPosition} ${player.lastName}, ${player.firstName.substring(0,1).toUpperCase()}.`)
            table.newRow()
        }

        let result = `Showing ${offset + 1} - ${offset + players.length} of ${total}
### Roster
\`\`\`${table.toString()}\`\`\``


        return result

    }


    getLineups(lineups:[], offset:number, total:number) {

//         const table = new Table()
        
//         for (let lineup of lineups) {
//             table.cell('ID', lineup.index, Table.number(0))
//             table.cell('Name', `Lineup ${lineup.index}`)
//             table.newRow()
//         }

//         let result = `Showing ${offset + 1} - ${offset + lineups.length} of ${total}
// ### Lineups
// \`\`\`${table.toString()}\`\`\``


//         return result

    }

    getLineup(lineup) {

        if (lineup.players?.length > 0) {

            const table = new Table()

            let i=1
            for (let player of lineup.players) {
    
                table.cell('#', i)
                table.cell('Pos', player.position)
                table.cell('Name', `${player.displayName} #${player.tokenId}`)
                table.newRow()
                i++
            }

        return `### Lineup #${lineup.index}
\`\`\`${table.toString()}\`\`\``

        } else{
            return `### Lineup #${lineup.index}
\`\`\`Lineup is empty. Use /lineupadd to add players.\`\`\``
        }


    }

    getRosterError() {


        let result = `### Roster
\`\`\`No players found.\`\`\``


        return result

    }

    getPlayerError() {

        let result = `\`\`\`Player not found.\`\`\``

        return result

    }

    getLineupError() {

        let result = `\`\`\`Lineup not found.\`\`\``

        return result

    }

    getCreateLineupError() {

        let result = `\`\`\`Error creating lineup.\`\`\``

        return result

    }

    getLineupsError() {


        let result = `### Lineups
\`\`\`No lineups found.\`\`\``


        return result

    }




}

export {
    ASCIIService
}