import { inject, injectable } from 'inversify'
import { Player } from '../dto/player.js'

import Table from "cli-table3"
import colors from "@colors/colors"
import { GameViewModel, LastPlay } from './data/game-service.js'
import { GamePlayer, PitchType, PlayResult, Position, ShallowDeep, TeamInfo, ThrowResult } from './enums.js'

@injectable()
class UserIOService {

    constructor(
        @inject("rlp") private rlp
    ) {}

    print(message) {
        console.log(message)
    }


    async printHelp() {


        let mainTable = new Table({
            head: ['Description', 'Command']
        })

        mainTable.push(
            ['Connect', '/connect *walletAddress*'],
            ['Disconnect', '/disconnect']

        )

        let rosterTable = new Table({
            head: ['Description', 'Command']
        })

        rosterTable.push(
            ['Show Full Roster', '/roster *pageNumber*'],
            ['Scout Player', '/scout [P|C|1B|2B|3B|SS|LF|CF|RF] [red|blue]'],
            ['Draft Team', '/draftteam [red|blue]']
        )

        let lineupTable = new Table({
            head: ['Description', 'Command']
        })

        lineupTable.push(
            ['Show Lineup List', '/lineups'],
            ['Show Lineup', '/lineup *lineupId*'],
            ['Create Lineup:', '/lineupcreate'],
            ['Add Player to Lineup', '/lineupadd *playerId*'],
            ['Remove Player from Lineup', '/lineupremove *playerId*'],
            ['Move Player to Spot', '/lineupmove *playerId* *spotId*']
        )

        let queueTable = new Table({
            head: ['Description', 'Command']
        })

        queueTable.push(
            ['Queue All', '/joinall'],
            ['Queue Player', '/join *playerId*'],
            ['Queue Lineup', '/jointeam *lineupId*'],

        )

        return this.print(`

Connect
${mainTable.toString()}

Roster
${rosterTable.toString()}

Lineups
${lineupTable.toString()}

Queue
${queueTable.toString()}

`)
    }

    async printGoodbye() {
        console.log("Goodbye")
    }

    async printUnrecognizedCommand() {
        console.log(`
        
        Command not recognized
        
        `)
    }

    getWalletAddressError() {
        return `            
Error: Pass wallet address.
----------------------------
USAGE:
/connect *walletAddress*
----------------------------
        `
    }

    getNoWalletSelectedError() {
        return `            
No wallet connected.
        `
    }

    getLineupCreateArgsError() {
        return `            
Error: Pass a valid faction.
----------------------------
USAGE

To create a Red faction lineup:
/lineupcreate red

To create a Blue faction lineup:
/lineupcreate blue
----------------------------
        `
    }

    getJoinLineupInvalidArgsMessage() {
        return `            
Error: Pass a valid lineup ID.
----------------------------
USAGE

/jointeam 1
----------------------------
        `
    }

    getDraftArgsError() {
        return `            
Error: Pass a valid baseball position. [P,C,1B,2B,3B,SS,LF,CF,RF]
----------------------------
USAGE

To draft a pitcher:
/draft P

To draft a catcher:
/draft C

To draft a 1B:
/draft 1B
----------------------------
        `
    }

    getPlayerNotDraftedMessage() {
        return `
Player not drafted.        
        `
    }

    getPlayerDraftedMessage(player: Player) {
        return `
SUCCESS!

${player.fullName} added to roster.

        `
    }

    getLineupCreatedMessage(lineup) {
        return `
SUCCESS!

Lineup ${lineup.index} created.

        `
    }

    getInvalidLineupMessage() {
        return `
Invalid lineup ID.

        `
    }

    getInvalidGameMessage() {
        return `
Invalid game ID.

        `
    }

    getInvalidLevelMessage() {
        return `
Invalid level.

        `
    }

    getInvalidPlayerMessage() {
        return `
Invalid player ID.

        `
    }

    getPlayerNotOnRosterMessage() {
        return `
Player not on roster.

        `
    }

    printLineupQueueSuccess(lineup) {
        return `
SUCCESS!

Lineup ${lineup.index} queued to play.

        `
    }

    async printPlayer(player) {

        let pitches = ""

        for (let pitch of player.pitchRatings.pitches) {
            pitches += `${pitch.type}:      ${pitch.rating}\n`
        }

        let hitterTable = this.getHitterTable(player)
        let pitcherTable = this.getPitcherTable(player)


        console.log(`

Name:     ${player.fullName}
Position: ${player.currentPosition}
Age:      ${player.age}
Level:    ${player.level}
Rating:   ${player.rating}

Hitting 
${hitterTable.toString()}

Pitching
${pitcherTable.toString()}

    `)

    }

    getHitterTable(player: GamePlayer) {

        let hitterTable = new Table({
            head: ['CON', 'GAP', 'HR', 'EYE', 'SPD', 'DEF', 'R/L']
        })

        hitterTable.push([
            // player.hittingRatings.contact,
            // player.hittingRatings.gapPower,
            // player.hittingRatings.homerunPower,
            // player.hittingRatings.plateDiscipline,
            // player.hittingRatings.speed,
            // player.hittingRatings.defense,
            // player.hittingRatings.vsSameHand
        ])

        return hitterTable
    }

    getPitcherTable(player: GamePlayer) {

        let pitcherHead = ['CON', 'POW', 'MOV', 'R/L', 'Pitches']

        let pitcherRow = [
            // player.pitchRatings.control,
            // player.pitchRatings.power,
            // player.pitchRatings.movement,
            // player.pitchRatings.vsSameHand,
            ''
        ]

        let pitcherTable = new Table({
            head: pitcherHead
        })

        for (let pitch of player.pitchRatings.pitches) {
            pitcherHead.push(Object.keys(PitchType)[Object.values(PitchType).indexOf(pitch.type)])
            // pitcherRow.push(pitch.rating)
        }

        pitcherTable.push(pitcherRow)

        return pitcherTable

    }

    async printRoster(players: Player[], walletAddress: string, page: number, perPage: number, total: number) {

        let hitters = players.filter(p => p.primaryPosition != Position.PITCHER)
        let pitchers = players.filter(p => p.primaryPosition == Position.PITCHER)

        //Hitters
        let hitterTable = new Table({
            head: ['ID', 'Name', 'POS','Level', 'Contact', 'Gap', 'HR', 'Eye', 'Speed', 'Def', 'vs Same Hand']
        })

        if (hitters.length > 0) {

            for (let hitter of hitters) {
                hitterTable.push([
                    hitter._id,
                    `${hitter.hits} - ${hitter.fullName}`,
                    hitter.primaryPosition,
                    // hitter.rating.rating,
                    // this.levelService.getDisplayName(hitter.playerLevel),
                    // hitter.hittingRatings.contact,
                    // hitter.hittingRatings.gapPower,
                    // hitter.hittingRatings.homerunPower,
                    // hitter.hittingRatings.plateDiscipline,
                    // hitter.hittingRatings.speed,
                    // hitter.hittingRatings.defense,
                    // hitter.hittingRatings.vsSameHand
                ])
            }

        } else {
            hitterTable.push(['', "No hitters on roster", '', '', '', ''])
        }


        //Pitchers
        let pitcherTable = new Table({
            head: ['ID', 'Name', 'POS', 'Rating', 'Level', 'Control', 'Power', 'Movement', 'vs Same Hand']
        })

        if (pitchers.length > 0) {

            for (let pitcher of pitchers) {
                pitcherTable.push([
                    pitcher._id,
                    `${pitcher.hits} - ${pitcher.fullName}`,
                    pitcher.primaryPosition,
                    // pitcher.rating.rating,
                    // this.levelService.getDisplayName(pitcher.playerLevel),
                    // pitcher.pitchRatings.control,
                    // pitcher.pitchRatings.power,
                    // pitcher.pitchRatings.movement,
                    // pitcher.pitchRatings.vsSameHand
                ])
            }

        } else {
            pitcherTable.push(['', "No pitchers on roster", '', '', '', ''])
        }


        let start = ((page - 1) * perPage) + 1
        let end = start + players.length - 1

        console.log(`
Players: ${walletAddress}

Hitters
${hitterTable.toString()}

Pitchers
${pitcherTable.toString()}

Showing players ${start} - ${end} of ${total} / Page ${page} 

        `)

    }

    async printDraftTeamResults(lineup, players: Player[], walletAddress: string) {

        let rosterTable = new Table({
            head: ['ID', 'Order', 'Name', 'POS', 'Level', 'Throws', 'Hits']
        })

        if (lineup.players.length > 0) {

            let i = 1
            for (let player of players) {
                rosterTable.push([
                    player._id,
                    i,
                    player.fullName,
                    player.primaryPosition,
                    // this.levelService.getDisplayName(player.playerLevel),
                    player.throws,
                    player.hits
                ])
                i++
            }

        } else {
            rosterTable.push(['', "No players on roster", '', '', '', ''])

        }

        console.log(`
Players drafted by: ${walletAddress}

Lineup #${lineup.index} created!

${rosterTable.toString()}

        `)

    }

    async printLineups(lineups:[], walletAddress: string, page: number, perPage: number, totalPlayers: number) {

        let lineupTable = new Table({
            head: ['ID',  'Players']
        })


        if (lineups.length > 0) {


            for (let lineup of lineups) {

                let playerTable = new Table({
                    head: ['Order', 'Name', 'POS', 'Token #']
                })

                let i = 1
                // for (let player of lineup.players) {


                //     playerTable.push([
                //         i, player.displayName, player.position, player.tokenId
                //     ])

                //     i++
                // }

                // lineupTable.push([
                //     lineup.index, playerTable.toString()
                // ])

            }

        } else {
            lineupTable.push(['', "No lineups created."])
        }

        let start = ((page - 1) * perPage) + 1
        let end = start + lineups.length - 1

        console.log(`
Lineups: ${walletAddress}

${lineupTable.toString()}

${lineups.length > 0 ? `Showing players ${start} - ${end} of ${totalPlayers} / Page ${page}` : ''} 

        `)

    }

    printQueuedPlayers(players: Player[], errors: Error[]) {

        for (let player of players) {
            console.log(`${player.fullName} joined queue.`)
        }

        for (let error of errors) {
            console.log(error.message)
        }

    }

    printGamesStarted(startedGames: GameViewModel[]) {

        if (startedGames?.length > 0) {
            for (let gameViewModel of startedGames) {
                console.log(`

Game #${gameViewModel.game._id} started.
        
${this.getGameOutput(gameViewModel)}
                
                `)
            }
        } else {
            console.log("No games started.")
        }

    }

    getGameOutput(gameViewModel: GameViewModel): string {

        //Print info
        let infoTable = new Table({
            head: ['Balls', 'Strikes', 'Outs', '1B', '2B', '3B']
        })

        // infoTable.push(
        //     [
        //         gameViewModel.game.count.balls,
        //         gameViewModel.game.count.strikes,
        //         gameViewModel.game.count.outs,

        //         gameViewModel.baseRunners.first ? `${gameViewModel.baseRunners.first?.fullName} (${gameViewModel.baseRunners.first?.currentPosition})` : undefined,
        //         gameViewModel.baseRunners.second ? `${gameViewModel.baseRunners.second?.fullName} (${gameViewModel.baseRunners.second?.currentPosition})` : undefined,
        //         gameViewModel.baseRunners.third ? `${gameViewModel.baseRunners.third?.fullName} (${gameViewModel.baseRunners.third?.currentPosition})` : undefined
        //     ]
        // )

        //Print linescore
        let linescoreTable = new Table({
            head: [`${gameViewModel.game.isTopInning ? 'Top' : 'Bottom'} ${gameViewModel.game.currentInning}`, '1', '2', '3', '4', '5', '6', '7', '8', '9', 'R', 'H', 'E']
        })

        //Make current half inning bold
        if (gameViewModel.game.isTopInning) {
            gameViewModel.linescore.away[gameViewModel.game.currentInning] = colors.bold(gameViewModel.linescore.away[gameViewModel.game.currentInning])
        } else {
            gameViewModel.linescore.home[gameViewModel.game.currentInning] = colors.bold(gameViewModel.linescore.home[gameViewModel.game.currentInning])
        }

        linescoreTable.push(
            gameViewModel.linescore.away,
            gameViewModel.linescore.home
        )

        let matchupTable = new Table({
            head: ['Hitter', 'Pitcher']
        })

        // matchupTable.push(
        //     [this.getMatchupHitter(gameViewModel.matchup.hitter), this.getMatchupPitcher(gameViewModel.matchup.pitcher)]
        // )

        let homeBoxScore = this.getBoxScore(gameViewModel.game.home)
        let awayBoxScore = this.getBoxScore(gameViewModel.game.away)


        let playTable = new Table()

        for (let play of gameViewModel.plays) {
            playTable.push([this.getPlayDescription(play)])
        }


        //Print hitter

        //Print pitcher

        //Print last play




        return `
Away
${awayBoxScore.hitters.toString()}
${awayBoxScore.pitchers.toString()}

Home
${homeBoxScore.hitters.toString()}
${homeBoxScore.pitchers.toString()}

Recent Plays
${playTable.toString()}

Up Next
${matchupTable.toString()}

${linescoreTable.toString()}
${infoTable.toString()}

        `

    }

    getBoxScore(team: TeamInfo) {

        let rows = []

        let nextHitter = team.players.find(p => p._id == team.lineupIds[team.currentHitterIndex])

        let i = 1
        for (let playerId of team.lineupIds) {

            let player = team.players.find(p => p._id == playerId)


            rows.push({
                spot: i,
                handedness: player.hits,
                name: player.fullName,
                position: player.currentPosition,
                atBats: player.hitResult.atBats,
                runs: player.hitResult.runs,
                hits: player.hitResult.hits,
                rbi: player.hitResult.rbi,
                hr: player.hitResult.homeRuns,
                bb: player.hitResult.bb,
                hbp: player.hitResult.hbp,
                so: player.hitResult.so,
                nextHitter: player._id == nextHitter._id
            })

            i++
        }

        let hittersTable = new Table({
            head: ['#', 'Player', 'POS', 'AB', 'R', 'H', 'RBI', 'HR', 'BB', 'HBP', 'SO']
        })

        for (let row of rows) {

            hittersTable.push([
                row.nextHitter ? colors.bold(row.spot) : row.spot,
                row.nextHitter ? colors.bold(`${row.handedness} ${row.name}`) : `${row.handedness} ${row.name}`,
                row.nextHitter ? colors.bold(row.position) : row.position,
                row.nextHitter ? colors.bold(row.atBats) : row.atBats,
                row.nextHitter ? colors.bold(row.runs) : row.runs,
                row.nextHitter ? colors.bold(row.hits) : row.hits,
                row.nextHitter ? colors.bold(row.rbi) : row.rbi,
                row.nextHitter ? colors.bold(row.hr) : row.hr,
                row.nextHitter ? colors.bold(row.bb) : row.bb,
                row.nextHitter ? colors.bold(row.hbp) : row.hbp,
                row.nextHitter ? colors.bold(row.so) : row.so
            ])
        }

        let pitcher = team.players.find(p => p._id == team.currentPitcherId)

        let pitchersTable = new Table({
            head: ['Player', 'POS', 'IP', 'H', 'R', 'ER', 'BB', 'K', 'HR', 'PI', 'PS']
        })

        pitchersTable.push([
            pitcher.fullName,
            pitcher.currentPosition,
            this.getIP(pitcher.pitchResult.outs),
            pitcher.pitchResult.hits,
            pitcher.pitchResult.runs,
            pitcher.pitchResult.er,
            pitcher.pitchResult.bb,
            pitcher.pitchResult.so,
            pitcher.pitchResult.homeRuns,
            pitcher.pitchResult.pitches,
            pitcher.pitchResult.strikes
        ])

        return {
            hitters: hittersTable,
            pitchers: pitchersTable
        }

    }

    getMatchupHitter(hitter: GamePlayer) {

        let ratingsTable = this.getHitterTable(hitter)

        return `
${hitter.hits} ${hitter.fullName} - ${hitter.currentPosition}     

${hitter.hitResult.pa > 0 ? `${hitter.hitResult.hits}/${hitter.hitResult.atBats}` : ``}

${ratingsTable.toString()}
`
    }

    getMatchupPitcher(pitcher: GamePlayer) {

        let ratingsTable = this.getPitcherTable(pitcher)

        return `
${pitcher.throws} ${pitcher.fullName} - ${pitcher.currentPosition}         

${this.getIP(pitcher.pitchResult.outs)} IP, ${pitcher.pitchResult.hits} H, ${pitcher.pitchResult.er} ER, ${pitcher.pitchResult.bb} BB, ${pitcher.pitchResult.so} K

${ratingsTable.toString()}
`
    }

    getIP(outs) {

        const innings = Math.floor(outs / 3)
        const thirds = outs % 3

        if (thirds === 0) {
            return innings + ".0"
        } else if (thirds === 1) {
            return innings + ".1"
        } else {
            return innings + ".2"
        }

    }

    getShallowDeepDescription(shallowDeep:ShallowDeep) {
        if (shallowDeep == ShallowDeep.NORMAL || !shallowDeep) return
        return shallowDeep.toLowerCase()
    }

    getPlayDescription(play: LastPlay) {

        let hitter = play.hitter
        let pitcher = play.pitcher

        let descriptions = []

        switch (play.play.result) {
            case PlayResult.STRIKEOUT:
                descriptions.push(`${hitter.fullName} strikes out.`)
                break
            case PlayResult.BB:
                descriptions.push(`${hitter.fullName} draws a walk.`)
                break
            case PlayResult.HIT_BY_PITCH:
                descriptions.push(`${hitter.fullName} gets hit by a pitch.`)
                break
            case PlayResult.OUT:
                descriptions.push(`${hitter.fullName} hits a ${play?.play?.contact?.toLowerCase()} to the ${play?.play?.fielder} and is out.`)
                break
            case PlayResult.SINGLE:
                descriptions.push(`${hitter.fullName} hits a ${play?.play?.contact?.toLowerCase()} single to ${this.getShallowDeepDescription(play?.play?.shallowDeep)} ${play?.play?.fielder}.`)
                break
            case PlayResult.DOUBLE:
                descriptions.push(`${hitter.fullName} hits a ${play?.play?.contact?.toLowerCase()} double to ${this.getShallowDeepDescription(play?.play?.shallowDeep)} ${play?.play?.fielder}.`)
                break
            case PlayResult.TRIPLE:
                descriptions.push(`${hitter.fullName} hits a ${play?.play?.contact?.toLowerCase()} triple to ${this.getShallowDeepDescription(play?.play?.shallowDeep)} ${play?.play?.fielder}.`)
                break
            case PlayResult.HR:
                descriptions.push(`${hitter.fullName} hits a ${play?.play?.contact?.toLowerCase()} home run!`)
                break
        }

        //Base runners
        // if (play?.play?.baseRunners?.third) {
        //     descriptions.push(this.getBaseRunnerDescription(3, play?.third, play?.play?.runnerAdvance.third?.throw, play?.play?.runnerAdvance.third?.result))
        // }

        // if (play?.play?.baseRunners?.second) {
        //     descriptions.push(this.getBaseRunnerDescription(2, play?.second, play?.play?.runnerAdvance.second?.throw, play?.play?.runnerAdvance.second?.result))
        // }

        // if (play?.play?.baseRunners?.first) {
        //     descriptions.push(this.getBaseRunnerDescription(1, play?.first, play?.play?.runnerAdvance.first?.throw, play?.play?.runnerAdvance.first?.result))
        // }


        //Runs?
        // if (play.play.runnerResult.end?.scored?.length > 0) {
        //     descriptions.push(`The score is ${play.play.score.away} - ${play.play.score.home}`)

        // }

        // //End inning?
        // switch (play.play?.count?.outs) {
        //     case 3:
        //         descriptions.push(`That's the 3rd out and the inning is complete.`)
        //         break
        // }


        let description = ''

        for (let text of descriptions) {
            if (text?.length > 0) {
                text = text.replace("  ", " ")
                description += `${text}\n`
            }
        }

        return description


    }

    getBaseRunnerDescription(baseNumber: number, runner: GamePlayer, throwResult: ThrowResult, result: number) {

        // let throwInfo = throwResult ? `Throw from ${throwResult.from} to ${throwResult.to}` : ''

        let getBaseName = (baseNumber: number) => {

            switch (baseNumber) {
                case 1:
                    return "first base"
                case 2:
                    return "second base"
                case 3:
                    return "third base"
                case 4:
                    return "home"
            }
        }

        // switch (result) {
        //     case 0:
        //         break
        //     case -1:
        //         return `${runner.fullName} is out. ${throwInfo}`
        //     case 1:
        //         return `${runner.fullName} is safe at ${getBaseName(baseNumber + 1)}. ${throwInfo}`
        //     case 2:
        //         return `${runner.fullName} is safe at ${getBaseName(baseNumber + 2)}. ${throwInfo}`
        //     case 3:
        //         return `${runner.fullName} is safe at ${getBaseName(baseNumber + 3)}. ${throwInfo}`
        // }

    }

    async getDraftScoutExitOption() {

        let answer


        while (answer != "DRAFT" && answer != "EXIT" && answer != "SCOUT") {

            answer = await this.prompt(`
Options:
Type DRAFT to draft.
Type SCOUT to scout another player.
Type EXIT to quit scouting: `)

            answer = answer.toUpperCase()

            if (answer != "DRAFT" && answer != "EXIT" && answer != "SCOUT") {
                this.printUnrecognizedCommand()
            }

        }

        return answer



    }

    async getDraftTeamComfirmation() {

        let answer


        while (answer != "YES" && answer != "EXIT") {

            answer = await this.prompt(`
Options:
Type RED to draft a Red faction team of 10 players.
Type BLUE to draft a Blue faction team of 10 players.

Type EXIT to quit scouting: `)

            answer = answer.toUpperCase()

            if (answer != "RED" && answer != "BLUE" && answer != "EXIT") {
                this.printUnrecognizedCommand()
            }

        }

        return answer



    }

    async printConnectMessage(walletAddress: string) {
        console.log(`
Connected as '${walletAddress}'
`)
    }

    async getMenuSelection() {
        return this.prompt(`Enter a command (/help to see list): `)
    }

    async prompt(message): Promise<string> {

        let choice = await this.rlp.questionAsync(message)
        return choice

    }

}



export {
    UserIOService
}
