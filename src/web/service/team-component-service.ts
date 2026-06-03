import { injectable } from "inversify";
import { LoginWebService } from "./login-web-service.js";
import { TeamWebService } from "./team-web-service.js";
import { LineupService } from "../../service/lineup-service.js";
import { GameWebService } from "./game-web-service.js";
import { PitchingRoleType, Position } from "../../baseball-sim-engine/index.js";
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

    get team() {
        return this.teamViewModel.team
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

    public getDisplayAvailableHitters(lineupIndex = 0) {

        if (!this.teamViewModel?.team) return []

        let lineup = this.teamViewModel.team.lineups[lineupIndex]
        let hitters = []

        for (let spot = 8; spot <= 12; spot++) {

            let benchIndex = this.getBenchIndexForSpot(spot)
            let hitter = lineup.availableHitters[benchIndex]

            if (hitter?._id) {
                hitters.push(this.getPlayer(hitter._id))
            } else {
                hitters.push({
                    fullName: this.loginWebService.userOwnsTeam(this.teamViewModel.team._id) ? "Sign a free agent." : "",
                    primaryPosition: "H"
                })
            }

        }

        return hitters

    }

    public getDisplayAvailablePitchers(lineupIndex = 0) {

        if (!this.teamViewModel?.team) return []

        let lineup = this.teamViewModel.team.lineups[lineupIndex]
        let pitchers = []

        for (let spot = 5; spot <= 12; spot++) {

            let bullpenIndex = this.getBullpenIndexForSpot(spot)
            let pitcher = lineup.availablePitchers[bullpenIndex]

            if (pitcher?.playerId) {
                pitchers.push({
                    ...this.getPlayer(pitcher.playerId),
                    role: pitcher.role,
                    priority: pitcher.priority
                })
            } else {
                pitchers.push({
                    fullName: this.loginWebService.userOwnsTeam(this.teamViewModel.team._id) ? "Sign a free agent." : "",
                    primaryPosition: Position.PITCHER,
                    role: pitcher?.role,
                    priority: pitcher?.priority
                })
            }

        }

        return pitchers

    }

    get offChainDiamondBalance() {
        return this.authInfo?.offChainDiamondBalance
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

    public moveToRoster(selectedId: string, currentPlayerId: string, spot: number, lineupIndex: number, isPitcher: boolean) {

        this.hasChanges = true

        let lineup = this.teamViewModel.team.lineups[lineupIndex]

        let selectedPlayer = this.getPlayer(selectedId)
        let currentPlayer = this.getPlayer(currentPlayerId)

        if (isPitcher) {
            this.movePitcherToRoster(lineup, selectedPlayer, currentPlayer, spot)
        } else {
            this.moveHitterToRoster(lineup, selectedPlayer, currentPlayer, spot)
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

    public getPlayerBySpot(spot: number, isPitcher: boolean, lineupIndex = 0) {

        let lineup = this.teamViewModel?.team?.lineups[lineupIndex]

        if (!lineup) return undefined

        if (isPitcher) {

            if (spot >= 0 && spot <= 4) {
                return lineup.rotation[spot]?._id
                    ? this.getPlayer(lineup.rotation[spot]._id)
                    : undefined
            }

            if (spot >= 5 && spot <= 12) {
                let bullpenIndex = this.getBullpenIndexForSpot(spot)

                return lineup.availablePitchers[bullpenIndex]?.playerId
                    ? this.getPlayer(lineup.availablePitchers[bullpenIndex].playerId)
                    : undefined
            }

        } else {

            if (spot >= 0 && spot <= 7) {
                return lineup.order[spot]?._id
                    ? this.getPlayer(lineup.order[spot]._id)
                    : undefined
            }

            if (spot >= 8 && spot <= 12) {
                let benchIndex = this.getBenchIndexForSpot(spot)

                return lineup.availableHitters[benchIndex]?._id
                    ? this.getPlayer(lineup.availableHitters[benchIndex]._id)
                    : undefined
            }

        }

        return undefined

    }

    public isBenchSpot(spot: number) {
        return spot >= 8 && spot <= 12
    }

    private getBullpenRoleForSpot(spot: number): PitchingRoleType {

        if (spot == 5) return PitchingRoleType.CLOSER
        if (spot == 6 || spot == 7) return PitchingRoleType.SETUP
        if (spot >= 8 && spot <= 10) return PitchingRoleType.MIDDLE
        if (spot == 11) return PitchingRoleType.LONG
        if (spot == 12) return PitchingRoleType.MOP_UP

        throw new Error(`Invalid bullpen spot: ${spot}`)

    }    


    public getBullpenRoleDisplyForSpot(spot: number): string {

        let role = this.getBullpenRoleForSpot(spot)

        if (role == PitchingRoleType.CLOSER) return "Closer"
        if (role == PitchingRoleType.SETUP) return "Setup"
        if (role == PitchingRoleType.MIDDLE) return "Middle Relief"
        if (role == PitchingRoleType.LONG) return "Long Relief"
        if (role == PitchingRoleType.MOP_UP) return "Mop Up"

    }  


    private getBullpenPriorityForSpot(spot: number): number {

        if (spot == 5) return 1
        if (spot == 6) return 1
        if (spot == 7) return 2
        if (spot == 8) return 1
        if (spot == 9) return 2
        if (spot == 10) return 3
        if (spot == 11) return 1
        if (spot == 12) return 1

        throw new Error(`Invalid bullpen spot: ${spot}`)

    }

    private getBenchIndexForSpot(spot: number): number {

        if (spot < 8 || spot > 12) {
            throw new Error(`Invalid bench spot: ${spot}`)
        }

        return spot - 8

    }

    private getBullpenIndexForSpot(spot: number): number {

        if (spot < 5 || spot > 12) {
            throw new Error(`Invalid bullpen spot: ${spot}`)
        }

        return spot - 5

    }


    private assertCanMoveHitterToLineupSpot(lineup, player, spot: number) {

        let targetPosition = lineup.order[spot]?.position

        if (!targetPosition) {
            throw new Error("Invalid lineup spot.")
        }

        if (targetPosition == Position.PITCHER) {
            throw new Error("Cannot move a hitter into the pitcher slot.")
        }

        if (player.primaryPosition != targetPosition) {
            throw new Error(`Cannot move ${player.primaryPosition} into ${targetPosition}.`)
        }

    }



    private buildDisplayHitters(lineup) {

        let hitters = []

        for (let lineupPlayer of lineup.order) {

            if (lineupPlayer._id) {
                hitters.push(this.getPlayer(lineupPlayer._id))
            } else if (lineupPlayer.position != Position.PITCHER) {
                hitters.push({
                    fullName: this.loginWebService.userOwnsTeam(this.teamViewModel.team._id) ? "Sign a free agent." : "",
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
                    fullName: this.loginWebService.userOwnsTeam(this.teamViewModel.team._id) ? "Sign a free agent." : "",
                    primaryPosition: Position.PITCHER
                })
            }

        }

        return pitchers

    }

    private moveHitterToRoster(lineup, selectedPlayer, currentPlayer, spot) {

        let isBenchSpot = spot >= 8

        let selectedLineupIndex = lineup.order.findIndex(p => p._id == selectedPlayer._id)
        let selectedBenchIndex = lineup.availableHitters.findIndex(p => p._id == selectedPlayer._id)

        let isSelectedInLineup = selectedLineupIndex >= 0
        let isSelectedOnBench = selectedBenchIndex >= 0

        if (!isBenchSpot && isSelectedOnBench) {
            this.assertCanMoveHitterToLineupSpot(lineup, selectedPlayer, spot)
        }

        if (isBenchSpot) {

            let benchIndex = this.getBenchIndexForSpot(spot)

            if (isSelectedOnBench) {
                let selectedBenchPlayer = lineup.availableHitters[selectedBenchIndex]
                let targetBenchPlayer = lineup.availableHitters[benchIndex]

                lineup.availableHitters[selectedBenchIndex] = targetBenchPlayer
                lineup.availableHitters[benchIndex] = selectedBenchPlayer

                return
            }

            if (isSelectedInLineup) {
                let targetBenchPlayerId = lineup.availableHitters[benchIndex]?._id
                let originalLineupPosition = lineup.order[selectedLineupIndex].position

                if (targetBenchPlayerId) {
                    let targetBenchPlayer = this.getPlayer(targetBenchPlayerId)

                    this.assertCanMoveHitterToLineupSpot(lineup, targetBenchPlayer, selectedLineupIndex)

                    lineup.order[selectedLineupIndex] = {
                        _id: targetBenchPlayer._id,
                        position: originalLineupPosition
                    }
                } else {
                    lineup.order[selectedLineupIndex] = {
                        position: originalLineupPosition
                    }
                }

                lineup.availableHitters[benchIndex] = {
                    _id: selectedPlayer._id
                }

                return
            }

            lineup.availableHitters[benchIndex] = {
                _id: selectedPlayer._id
            }

            return

        }

        if (isSelectedOnBench) {
            lineup.availableHitters[selectedBenchIndex] = currentPlayer ? {
                _id: currentPlayer._id
            } : undefined
        }

        if (currentPlayer) {

            if (isSelectedInLineup) {
                this.lineupService.lineupSwap(lineup, selectedPlayer._id, currentPlayer._id)
            } else {
                this.lineupService.lineupReplace(lineup, selectedPlayer, currentPlayer._id)
            }

        } else if (isSelectedInLineup) {
            this.lineupService.lineupMove(lineup, selectedPlayer._id, spot)
        } else {
            this.lineupService.lineupAdd(lineup, selectedPlayer, spot)
        }

        lineup.availableHitters = lineup.availableHitters.filter(p => p != undefined)

    }

    private movePitcherToRoster(lineup, selectedPlayer, currentPlayer, spot) {

        let isBullpenSpot = spot >= 5

        let selectedRotationIndex = lineup.rotation.findIndex(p => p._id == selectedPlayer._id)
        let selectedBullpenIndex = lineup.availablePitchers.findIndex(p => p.playerId == selectedPlayer._id)

        let isSelectedInRotation = selectedRotationIndex >= 0
        let isSelectedInBullpen = selectedBullpenIndex >= 0

        if (isBullpenSpot) {

            let bullpenIndex = this.getBullpenIndexForSpot(spot)
            let targetRole = this.getBullpenRoleForSpot(spot)
            let targetPriority = this.getBullpenPriorityForSpot(spot)

            if (isSelectedInBullpen) {
                let sourceSpot = selectedBullpenIndex + 5
                let sourceRole = this.getBullpenRoleForSpot(sourceSpot)
                let sourcePriority = this.getBullpenPriorityForSpot(sourceSpot)
                let targetBullpenPitcher = lineup.availablePitchers[bullpenIndex]

                lineup.availablePitchers[selectedBullpenIndex] = targetBullpenPitcher?.playerId ? {
                    playerId: targetBullpenPitcher.playerId,
                    role: sourceRole,
                    priority: sourcePriority
                } : {
                    role: sourceRole,
                    priority: sourcePriority
                }

                lineup.availablePitchers[bullpenIndex] = {
                    playerId: selectedPlayer._id,
                    role: targetRole,
                    priority: targetPriority
                }

                return
            }

            if (isSelectedInRotation) {
                let targetBullpenPlayerId = lineup.availablePitchers[bullpenIndex]?.playerId

                if (targetBullpenPlayerId) {
                    lineup.rotation[selectedRotationIndex] = {
                        _id: targetBullpenPlayerId
                    }
                } else {
                    lineup.rotation[selectedRotationIndex] = {}
                }

                lineup.availablePitchers[bullpenIndex] = {
                    playerId: selectedPlayer._id,
                    role: targetRole,
                    priority: targetPriority
                }

                return
            }

            lineup.availablePitchers[bullpenIndex] = {
                playerId: selectedPlayer._id,
                role: targetRole,
                priority: targetPriority
            }

            return

        }

        if (isSelectedInBullpen) {
            let sourceSpot = selectedBullpenIndex + 5
            let sourceRole = this.getBullpenRoleForSpot(sourceSpot)
            let sourcePriority = this.getBullpenPriorityForSpot(sourceSpot)

            lineup.availablePitchers[selectedBullpenIndex] = currentPlayer ? {
                playerId: currentPlayer._id,
                role: sourceRole,
                priority: sourcePriority
            } : {
                role: sourceRole,
                priority: sourcePriority
            }
        }

        if (currentPlayer) {

            if (isSelectedInRotation) {
                this.lineupService.rotationSwap(lineup, selectedPlayer._id, currentPlayer._id)
            } else {
                this.lineupService.rotationReplace(lineup, selectedPlayer, currentPlayer._id)
            }

        } else if (isSelectedInRotation) {
            this.lineupService.rotationMove(lineup, selectedPlayer._id, spot)
        } else {
            this.lineupService.rotationAdd(lineup, selectedPlayer, spot)
        }

    }

    public getPlayer(id) {
        return this.teamViewModel?.players.find(p => p._id == id)
    }

    public hasLineupPosition(position: Position, lineupIndex = 0): boolean {

        let lineup = this.teamViewModel?.team?.lineups[lineupIndex]

        if (!lineup) return false

        return lineup.order.some(p =>
            p?._id &&
            p.position == position
        )

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