import { injectable } from "inversify";
import { LoginWebService } from "./login-web-service.js";
import { TeamWebService } from "./team-web-service.js";
import { LineupService } from "../../service/lineup-service.js";
import { GameWebService } from "./game-web-service.js";
import { Position } from "../../baseball-sim-engine/index.js";
import { TeamViewModel } from "../../service/enums.js";

@injectable()
class TeamComponentService {

    constructor(
        private loginWebService: LoginWebService,
        private teamWebService: TeamWebService,
        private lineupService: LineupService,
        private gameWebService: GameWebService
    ) {}

    loading = false
    hasChanges = false

    authInfo: any
    selected = "stats"

    teamViewModel: TeamViewModel

    startDate
    _inProgressGame

    get hasEmptySpots() {

        let emptyLineupSpots = this.teamViewModel.team.lineups[0].order.filter(p => p._id != undefined).length < 8
        let emptyRotationSpots = this.teamViewModel.team.lineups[0].rotation.filter(p => p._id != undefined).length < 5

        return emptyLineupSpots || emptyRotationSpots

    }

    get inProgressGame() {
        return this._inProgressGame
    }

    get completedGames() {
        return this.teamViewModel.completedGames
    }

    public async loadTeam(teamId: string, startDate: string, options?: any) {

        if ((options?.forceRefresh || teamId != this.teamViewModel.team?._id || startDate != this.startDate) && this.loading == false) {

            console.log(`Loading team ${teamId}/${startDate}`)

            this.loading = true

            let authInfo = await this.loginWebService.getAuthInfo()
            let teamViewModel = await this.teamWebService.getByDate(teamId, startDate)

            this.setLoadedTeam(teamViewModel, authInfo, startDate)

            this.hasChanges = false
            this.loading = false

        }

        return this.teamViewModel.team

    }

    public setLoadedTeam(teamViewModel, authInfo, startDate) {

        this.authInfo = authInfo
        this.teamViewModel = teamViewModel

        this.startDate = startDate


        delete this._inProgressGame

        if (teamViewModel.inProgressGame) {
            this._inProgressGame = this.gameWebService.getGameViewModel(teamViewModel.inProgressGame)
        }

        this.addMissingLineupPlaceholders()

        this.hasChanges = false

    }

    public isTeamOwner() {
        return this.authInfo?._id == this.teamViewModel?.team?.owner?._id && this.teamViewModel?.team?.owner?._id != undefined
    }

    public getDisplayHitters(lineupIndex = 0) {

        if (!this.teamViewModel?.team) return []

        return this.buildDisplayHitters(this.teamViewModel?.team.lineups[lineupIndex])

    }

    public getDisplayPitchers(lineupIndex = 0) {

        if (!this.teamViewModel?.team) return []

        return this.buildDisplayPitchers(this.teamViewModel?.team.lineups[lineupIndex])

    }


    public getDisplayAvailablePitchers(lineupIndex = 0) {

        if (!this.teamViewModel?.team) return []

        return this.buildDisplayPitchers({
            rotation: this.teamViewModel.team.lineups[lineupIndex].availablePitchers.map(p => ({
                _id: p.playerId
            }))
        })

    }  

    public getDisplayAvailableHitters(lineupIndex = 0) {

        if (!this.teamViewModel?.team) return []

        return this.buildDisplayHitters({
            order: this.teamViewModel.team.lineups[lineupIndex].availableHitters.map(p => ({
                _id: p._id
            }))
        })

    }

    public canAffordDrop() {

        if (!this.authInfo?.offChainDiamondBalance) return false
        if (!this.teamViewModel?.team?.minimumPlayerSalary) return false

        if (BigInt(this.authInfo.offChainDiamondBalance) < BigInt(this.teamViewModel.team.minimumPlayerSalary)) return false

        return true

    }

    public async save() {

        await this.teamWebService.setRoster(this.teamViewModel.team._id, this.teamViewModel.team.lineups)

        this.hasChanges = false

    }

    public moveToRoster(selectedId, currentPlayerId, spot, lineupIndex) {

        this.hasChanges = true

        let lineup = this.teamViewModel.team.lineups[lineupIndex]

        let selectedPlayer = this.getPlayer(selectedId)
        let currentPlayer = this.getPlayer(currentPlayerId)

        if (selectedPlayer.primaryPosition != Position.PITCHER) {
            this.moveHitterToRoster(lineup, selectedPlayer, currentPlayer, spot)
        } else {
            this.movePitcherToRoster(lineup, selectedPlayer, currentPlayer, spot)
        }

    }



    public updateInProgressGame(inProgressGame) {
        Object.assign(this.inProgressGame, this.gameWebService.getGameViewModel(inProgressGame))
    }

    public getRosterSize() {
        return this.teamViewModel?.players.length
    }

    public listMissingPositionsInLineup(order): Position[] {

        let required: Position[] = []

        let positions = [
            Position.CATCHER,
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE,
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD
        ]

        for (let position of positions) {
            let current = order.filter(p => p.position == position).length

            if (current == 0) {
                required.push(position)
            }
        }

        return required

    }

    private buildDisplayHitters(lineup) {

        let hitters = []

        for (let lineupPlayer of lineup.order) {

            if (lineupPlayer._id) {
                hitters.push(this.getPlayer(lineupPlayer._id))
            } else if (lineupPlayer.position != Position.PITCHER) {
                hitters.push({
                    fullName: "Sign a free agent.",
                    primaryPosition: lineupPlayer.position
                })
            }

        }

        return hitters

    }

    private buildDisplayPitchers(lineup) {

        let pitchers = []

        for (let rotationPitcher of lineup.rotation) {

            if (rotationPitcher._id) {
                pitchers.push(this.getPlayer(rotationPitcher._id))
            } else {
                pitchers.push({
                    fullName: "Sign a free agent.",
                    primaryPosition: Position.PITCHER
                })
            }

        }

        return pitchers

    }

    private moveHitterToRoster(lineup, selectedPlayer, currentPlayer, spot) {

        let isSelectedInLineup = lineup.order.find(p => p._id == selectedPlayer._id) != undefined

        if (currentPlayer) {
            this.lineupService.lineupSwap(lineup, selectedPlayer._id, currentPlayer._id)
        } else if (isSelectedInLineup) {
            this.lineupService.lineupMove(lineup, selectedPlayer._id, spot)
        } else {
            this.lineupService.lineupAdd(lineup, selectedPlayer, spot)
        }

    }

    private movePitcherToRoster(lineup, selectedPlayer, currentPlayer, spot) {

        let isSelectedInRotation = lineup.rotation.find(p => p._id == selectedPlayer._id) != undefined

        if (currentPlayer) {
            this.lineupService.rotationSwap(lineup, selectedPlayer._id, currentPlayer._id)
        } else if (isSelectedInRotation) {
            this.lineupService.rotationMove(lineup, selectedPlayer._id, spot)
        } else {
            this.lineupService.rotationAdd(lineup, selectedPlayer, spot)
        }

    }

    private getPlayer(id) {
        return this.teamViewModel?.players.find(p => p._id == id)
    }

    private addMissingLineupPlaceholders() {

        let order = this.teamViewModel.team.lineups[0].order
        let missingPositions = this.listMissingPositionsInLineup(order)

        for (let position of missingPositions) {
            let firstBlankSpot = order.find(o => !o.position)

            if (firstBlankSpot) {
                firstBlankSpot.position = position
            }
        }

    }



}

export {
    TeamComponentService
}