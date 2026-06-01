import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { SchemaService } from "../src/service/data/schema-service.js"
import { TeamComponentService } from "../src/web/service/team-component-service.js"

import { v4 as uuidv4 } from "uuid"
import { Position } from "../src/baseball-sim-engine/index.js"
import { LineupService } from "../src/service/lineup-service.js"
import { PitchingRoleType } from "../src/baseball-sim-engine/service/enums.js"

describe("TeamComponentService", async () => {

    let service: TeamComponentService
    let lineupService:LineupService
    let schemaService: SchemaService

    before("", async () => {

        let container = getContainer()

        schemaService = container.get(SchemaService)
        service = container.get(TeamComponentService)
        lineupService = container.get(LineupService)

        await schemaService.load()

    })

    it("should load team view model state", async () => {

        let teamViewModel = createTeamViewModel()
        let authInfo = { _id: teamViewModel.team.owner._id }

        service.setLoadedTeam(teamViewModel, authInfo, "2026-06-01")

        assert.equal(service.teamViewModel.team._id, teamViewModel.team._id)
        assert.equal(service.startDate, "2026-06-01")
        assert.equal(service.teamViewModel.players.length, teamViewModel.players.length)
        assert.equal(service.completedGames.length, teamViewModel.completedGames.length)
        assert.equal(service.teamViewModel.eventsViewModel, teamViewModel.eventsViewModel)
        assert.equal(service.hasChanges, false)

    })

    it("should identify team owner", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        assert.equal(service.isTeamOwner(), true)

        service.setLoadedTeam(teamViewModel, { _id: uuidv4() }, "2026-06-01")

        assert.equal(service.isTeamOwner(), false)

    })

    it("should build display hitters from lineup order", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        let hitters = service.getDisplayHitters()

        assert.equal(hitters.length, 8)
        assert.equal(hitters[0]._id, "hitter-1")
        assert.equal(hitters[0].fullName, "Hitter One")

    })

    it("should build display pitchers from rotation", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        let pitchers = service.getDisplayPitchers()

        assert.equal(pitchers.length, 5)
        assert.equal(pitchers[0]._id, "pitcher-1")
        assert.equal(pitchers[0].fullName, "Pitcher One")

    })

    it("should report empty spots when lineup or rotation is incomplete", async () => {

        let teamViewModel = createTeamViewModel()

        teamViewModel.team.lineups[0].order[0] = {
            position: Position.CATCHER
        }

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        assert.equal(service.hasEmptySpots, true)

    })

    it("should determine whether a player can be dropped based on diamond balance", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(
            teamViewModel,
            {
                _id: teamViewModel.team.owner._id,
                offChainDiamondBalance: "100"
            },
            "2026-06-01"
        )

        assert.equal(service.canAffordDrop(), true)

        service.authInfo.offChainDiamondBalance = "49"

        assert.equal(service.canAffordDrop(), false)

    })

    it("should mark changes when dropping a player", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.dropPlayer("hitter-1")

        assert.equal(service.hasChanges, true)

    })

    it("should move an existing hitter to an open lineup spot", async () => {

        let teamViewModel = createTeamViewModel()

        teamViewModel.team.lineups[0].order[0] = {
            position: Position.CATCHER
        } as any

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("hitter-2", undefined, 0, 0)

        assert.equal(service.hasChanges, true)
        assert.equal(service.teamViewModel.team.lineups[0].order[0]._id, "hitter-2")

    })

    it("should swap two existing hitters in the lineup", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("hitter-1", "hitter-2", 1, 0)

        assert.equal(service.hasChanges, true)
        assert.equal(service.teamViewModel.team.lineups[0].order[0]._id, "hitter-2")
        assert.equal(service.teamViewModel.team.lineups[0].order[1]._id, "hitter-1")

    })

    it("should move an existing pitcher to an open rotation spot", async () => {

        let teamViewModel = createTeamViewModel()

        teamViewModel.team.lineups[0].rotation[0] = {} as any

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("pitcher-2", undefined, 0, 0)

        assert.equal(service.hasChanges, true)
        assert.equal(service.teamViewModel.team.lineups[0].rotation[0]._id, "pitcher-2")

    })

    it("should swap two existing pitchers in the rotation", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("pitcher-1", "pitcher-2", 1, 0)

        assert.equal(service.hasChanges, true)
        assert.equal(service.teamViewModel.team.lineups[0].rotation[0]._id, "pitcher-2")
        assert.equal(service.teamViewModel.team.lineups[0].rotation[1]._id, "pitcher-1")

    })

    it("should add an available pitcher", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availablePitchers = []

        lineupService.availablePitcherAdd(
            lineup,
            "pitcher-6",
            PitchingRoleType.CLOSER,
            1
        )

        assert.equal(lineup.availablePitchers.length, 1)
        assert.equal(lineup.availablePitchers[0].playerId, "pitcher-6")
        assert.equal(lineup.availablePitchers[0].role, PitchingRoleType.CLOSER)
        assert.equal(lineup.availablePitchers[0].priority, 1)

    })

    it("should not duplicate an available pitcher", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availablePitchers = [
            {
                playerId: "pitcher-6",
                role: PitchingRoleType.CLOSER,
                priority: 1
            }
        ]

        lineupService.availablePitcherAdd(
            lineup,
            "pitcher-6",
            PitchingRoleType.MIDDLE,
            2
        )

        assert.equal(lineup.availablePitchers.length, 1)
        assert.equal(lineup.availablePitchers[0].role, PitchingRoleType.CLOSER)
        assert.equal(lineup.availablePitchers[0].priority, 1)

    })

    it("should remove an available pitcher", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availablePitchers = [
            {
                playerId: "pitcher-6",
                role: PitchingRoleType.CLOSER,
                priority: 1
            },
            {
                playerId: "pitcher-7",
                role: PitchingRoleType.MIDDLE,
                priority: 1
            }
        ]

        lineupService.availablePitcherRemove(lineup, "pitcher-6")

        assert.equal(lineup.availablePitchers.length, 1)
        assert.equal(lineup.availablePitchers[0].playerId, "pitcher-7")

    })

    it("should move a rotation pitcher to available pitchers", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availablePitchers = []

        lineupService.moveRotationPitcherToAvailablePitchers(
            lineup,
            "pitcher-1",
            PitchingRoleType.MIDDLE,
            1
        )

        assert.equal(lineup.rotation[0]._id, undefined)
        assert.equal(lineup.availablePitchers.length, 1)
        assert.equal(lineup.availablePitchers[0].playerId, "pitcher-1")
        assert.equal(lineup.availablePitchers[0].role, PitchingRoleType.MIDDLE)
        assert.equal(lineup.availablePitchers[0].priority, 1)

    })

    it("should move an available pitcher to the rotation", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.rotation[0] = {} as any

        lineup.availablePitchers = [
            {
                playerId: "pitcher-6",
                role: PitchingRoleType.CLOSER,
                priority: 1
            }
        ]

        lineupService.moveAvailablePitcherToRotation(
            lineup,
            {
                _id: "pitcher-6",
                primaryPosition: Position.PITCHER
            },
            0
        )

        assert.equal(lineup.rotation[0]._id, "pitcher-6")
        assert.equal(lineup.availablePitchers.length, 0)

    })

    it("should add an available pitcher", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availablePitchers = []

        lineupService.availablePitcherAdd(
            lineup,
            "pitcher-6",
            PitchingRoleType.CLOSER,
            1
        )

        assert.equal(lineup.availablePitchers.length, 1)
        assert.equal(lineup.availablePitchers[0].playerId, "pitcher-6")
        assert.equal(lineup.availablePitchers[0].role, PitchingRoleType.CLOSER)
        assert.equal(lineup.availablePitchers[0].priority, 1)

    })

    it("should not duplicate an available pitcher", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availablePitchers = [
            {
                playerId: "pitcher-6",
                role: PitchingRoleType.CLOSER,
                priority: 1
            }
        ]

        lineupService.availablePitcherAdd(
            lineup,
            "pitcher-6",
            PitchingRoleType.MIDDLE,
            2
        )

        assert.equal(lineup.availablePitchers.length, 1)
        assert.equal(lineup.availablePitchers[0].role, PitchingRoleType.CLOSER)
        assert.equal(lineup.availablePitchers[0].priority, 1)

    })

    it("should remove an available pitcher", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availablePitchers = [
            {
                playerId: "pitcher-6",
                role: PitchingRoleType.CLOSER,
                priority: 1
            },
            {
                playerId: "pitcher-7",
                role: PitchingRoleType.MIDDLE,
                priority: 1
            }
        ]

        lineupService.availablePitcherRemove(lineup, "pitcher-6")

        assert.equal(lineup.availablePitchers.length, 1)
        assert.equal(lineup.availablePitchers[0].playerId, "pitcher-7")

    })

    it("should move a rotation pitcher to available pitchers", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availablePitchers = []

        lineupService.moveRotationPitcherToAvailablePitchers(
            lineup,
            "pitcher-1",
            PitchingRoleType.MIDDLE,
            1
        )

        assert.equal(lineup.rotation[0]._id, undefined)
        assert.equal(lineup.availablePitchers.length, 1)
        assert.equal(lineup.availablePitchers[0].playerId, "pitcher-1")
        assert.equal(lineup.availablePitchers[0].role, PitchingRoleType.MIDDLE)
        assert.equal(lineup.availablePitchers[0].priority, 1)

    })

    it("should move an available pitcher to the rotation", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.rotation[0] = {} as any

        lineup.availablePitchers = [
            {
                playerId: "pitcher-6",
                role: PitchingRoleType.CLOSER,
                priority: 1
            }
        ]

        lineupService.moveAvailablePitcherToRotation(
            lineup,
            {
                _id: "pitcher-6",
                primaryPosition: Position.PITCHER
            },
            0
        )

        assert.equal(lineup.rotation[0]._id, "pitcher-6")
        assert.equal(lineup.availablePitchers.length, 0)

    })
    
    function createTeamViewModel() {

        let ownerId = uuidv4()

        return {
            team: {
                _id: uuidv4(),
                owner: {
                    _id: ownerId
                },
                minimumPlayerSalary: "50",
                lineups: [
                    {
                        order: [
                            { _id: "hitter-1", position: Position.CATCHER },
                            { _id: "hitter-2", position: Position.FIRST_BASE },
                            { _id: "hitter-3", position: Position.SECOND_BASE },
                            { _id: "hitter-4", position: Position.SHORTSTOP },
                            { _id: "hitter-5", position: Position.THIRD_BASE },
                            { _id: "hitter-6", position: Position.LEFT_FIELD },
                            { _id: "hitter-7", position: Position.RIGHT_FIELD },
                            { _id: "hitter-8", position: Position.CENTER_FIELD },
                            { position: Position.PITCHER }
                        ],
                        rotation: [
                            { _id: "pitcher-1" },
                            { _id: "pitcher-2" },
                            { _id: "pitcher-3" },
                            { _id: "pitcher-4" },
                            { _id: "pitcher-5" }
                        ],
                        availableHitters: [
                            { _id: "bench-1" }
                        ],
                        availablePitchers: [
                            {
                                playerId: "pitcher-6",
                                role: PitchingRoleType.CLOSER,
                                priority: 1
                            }
                        ],
                        valid: true
                    }
                ]
            },
            players: [
                { _id: "hitter-1", fullName: "Hitter One", primaryPosition: Position.CATCHER },
                { _id: "hitter-2", fullName: "Hitter Two", primaryPosition: Position.FIRST_BASE },
                { _id: "hitter-3", fullName: "Hitter Three", primaryPosition: Position.SECOND_BASE },
                { _id: "hitter-4", fullName: "Hitter Four", primaryPosition: Position.SHORTSTOP },
                { _id: "hitter-5", fullName: "Hitter Five", primaryPosition: Position.THIRD_BASE },
                { _id: "hitter-6", fullName: "Hitter Six", primaryPosition: Position.LEFT_FIELD },
                { _id: "hitter-7", fullName: "Hitter Seven", primaryPosition: Position.RIGHT_FIELD },
                { _id: "hitter-8", fullName: "Hitter Eight", primaryPosition: Position.CENTER_FIELD },
                { _id: "bench-1", fullName: "Bench One", primaryPosition: Position.CATCHER },
                { _id: "pitcher-1", fullName: "Pitcher One", primaryPosition: Position.PITCHER },
                { _id: "pitcher-2", fullName: "Pitcher Two", primaryPosition: Position.PITCHER },
                { _id: "pitcher-3", fullName: "Pitcher Three", primaryPosition: Position.PITCHER },
                { _id: "pitcher-4", fullName: "Pitcher Four", primaryPosition: Position.PITCHER },
                { _id: "pitcher-5", fullName: "Pitcher Five", primaryPosition: Position.PITCHER },
                { _id: "pitcher-6", fullName: "Pitcher Six", primaryPosition: Position.PITCHER }
            ],
            completedGames: [
                { _id: uuidv4() }
            ],
            eventsViewModel: {
                events: []
            }
        }

    }

    after("After", async () => {
    })

})