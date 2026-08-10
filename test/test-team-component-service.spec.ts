import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { SchemaService } from "../src/service/data/schema-service.js"
import { TeamComponentService } from "../src/web/service/team-component-service.js"
import { LineupService } from "../src/service/lineup-service.js"

import { v4 as uuidv4 } from "uuid"
import { PitchingRoleType, Position } from "baseball-sim-engine"

describe("TeamComponentService", async () => {

    let service: TeamComponentService
    let lineupService: LineupService
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
        assert.equal(service.team._id, teamViewModel.team._id)
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

    it("should build display available hitters from available hitters", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        let hitters = service.getDisplayAvailableHitters()

        assert.equal(hitters.length, 5)
        assert.equal(hitters[0]._id, "bench-1")
        assert.equal(hitters[0].fullName, "Bench One")

    })

    it("should build display pitchers from rotation", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        let pitchers = service.getDisplayPitchers()

        assert.equal(pitchers.length, 5)
        assert.equal(pitchers[0]._id, "pitcher-1")
        assert.equal(pitchers[0].fullName, "Pitcher One")

    })

    it("should build display available pitchers from available pitchers", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        let pitchers = service.getDisplayAvailablePitchers()

        assert.equal(pitchers.length, 8)
        assert.equal(pitchers[0]._id, "pitcher-6")
        assert.equal(pitchers[0].fullName, "Pitcher Six")

    })

    it("should report empty spots when lineup or rotation is incomplete", async () => {

        let teamViewModel = createTeamViewModel()

        teamViewModel.team.lineups[0].order[0] = {
            position: Position.CATCHER
        } as any

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

    it("should move an existing hitter to an open lineup spot", async () => {

        let teamViewModel = createTeamViewModel()

        teamViewModel.team.lineups[0].order[0] = {
            position: Position.CATCHER
        } as any

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("hitter-2", undefined, 0, 0, false)

        assert.equal(service.hasChanges, true)
        assert.equal(service.teamViewModel.team.lineups[0].order[0]._id, "hitter-2")

    })

    it("should swap two existing hitters in the lineup", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("hitter-1", "hitter-2", 1, 0, false)

        assert.equal(service.hasChanges, true)
        assert.equal(service.teamViewModel.team.lineups[0].order[0]._id, "hitter-2")
        assert.equal(service.teamViewModel.team.lineups[0].order[1]._id, "hitter-1")

    })

    it("should replace a lineup hitter with a bench hitter", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("bench-1", "hitter-1", 0, 0, false)

        let lineup = service.teamViewModel.team.lineups[0]

        assert.equal(service.hasChanges, true)
        assert.equal(lineup.order[0]._id, "bench-1")
        assert.equal(lineup.availableHitters.some(p => p._id == "bench-1"), false)
        assert.equal(lineup.availableHitters.some(p => p._id == "hitter-1"), true)

    })

    it("should move a lineup hitter to a bench spot and move the replaced bench hitter into the lineup", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("hitter-1", undefined, 8, 0, false)

        let lineup = service.teamViewModel.team.lineups[0]

        assert.equal(service.hasChanges, true)
        assert.equal(lineup.order[0]._id, "bench-1")
        assert.equal(lineup.availableHitters[0]._id, "hitter-1")

    })

    it("should move a bench hitter to an empty lineup spot", async () => {

        let teamViewModel = createTeamViewModel()

        teamViewModel.team.lineups[0].order[0] = {
            position: Position.CATCHER
        } as any

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("bench-1", undefined, 0, 0, false)

        let lineup = service.teamViewModel.team.lineups[0]

        assert.equal(service.hasChanges, true)
        assert.equal(lineup.order[0]._id, "bench-1")
        assert.equal(lineup.availableHitters.some(p => p._id == "bench-1"), false)

    })

    it("should move an existing pitcher to an open rotation spot", async () => {

        let teamViewModel = createTeamViewModel()

        teamViewModel.team.lineups[0].rotation[0] = {} as any

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("pitcher-2", undefined, 0, 0, true)

        assert.equal(service.hasChanges, true)
        assert.equal(service.teamViewModel.team.lineups[0].rotation[0]._id, "pitcher-2")

    })

    it("should swap two existing pitchers in the rotation", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("pitcher-1", "pitcher-2", 1, 0, true)

        assert.equal(service.hasChanges, true)
        assert.equal(service.teamViewModel.team.lineups[0].rotation[0]._id, "pitcher-2")
        assert.equal(service.teamViewModel.team.lineups[0].rotation[1]._id, "pitcher-1")

    })

    it("should replace a rotation pitcher with a bullpen pitcher", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("pitcher-6", "pitcher-1", 0, 0, true)

        let lineup = service.teamViewModel.team.lineups[0]

        assert.equal(service.hasChanges, true)
        assert.equal(lineup.rotation[0]._id, "pitcher-6")
        assert.equal(lineup.availablePitchers.some(p => p.playerId == "pitcher-6"), false)

        let movedToBullpen = lineup.availablePitchers.find(p => p.playerId == "pitcher-1")

        assert.notEqual(movedToBullpen, undefined)
        assert.equal(movedToBullpen.role, PitchingRoleType.CLOSER)
        assert.equal(movedToBullpen.priority, 1)

    })

    it("should move a rotation pitcher to a bullpen spot and move the replaced bullpen pitcher into the rotation", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("pitcher-1", undefined, 5, 0, true)

        let lineup = service.teamViewModel.team.lineups[0]

        assert.equal(service.hasChanges, true)
        assert.equal(lineup.rotation[0]._id, "pitcher-6")
        assert.equal(lineup.availablePitchers[0].playerId, "pitcher-1")
        assert.equal(lineup.availablePitchers[0].role, PitchingRoleType.CLOSER)
        assert.equal(lineup.availablePitchers[0].priority, 1)

    })

    it("should move a bullpen pitcher to an empty rotation spot", async () => {

        let teamViewModel = createTeamViewModel()

        teamViewModel.team.lineups[0].rotation[0] = {} as any

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("pitcher-6", undefined, 0, 0, true)

        let lineup = service.teamViewModel.team.lineups[0]

        assert.equal(service.hasChanges, true)
        assert.equal(lineup.rotation[0]._id, "pitcher-6")
        assert.equal(lineup.availablePitchers.some(p => p.playerId == "pitcher-6"), false)

    })

    it("should put a pitcher in the correct setup bullpen slot", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("pitcher-1", undefined, 7, 0, true)

        let lineup = service.teamViewModel.team.lineups[0]

        assert.equal(lineup.availablePitchers[2].playerId, "pitcher-1")
        assert.equal(lineup.availablePitchers[2].role, PitchingRoleType.SETUP)
        assert.equal(lineup.availablePitchers[2].priority, 2)

    })

    it("should put a pitcher in the correct middle bullpen slot", async () => {

        let teamViewModel = createTeamViewModel()

        service.setLoadedTeam(teamViewModel, { _id: teamViewModel.team.owner._id }, "2026-06-01")

        service.moveToRoster("pitcher-1", undefined, 10, 0, true)

        let lineup = service.teamViewModel.team.lineups[0]

        assert.equal(lineup.availablePitchers[5].playerId, "pitcher-1")
        assert.equal(lineup.availablePitchers[5].role, PitchingRoleType.MIDDLE)
        assert.equal(lineup.availablePitchers[5].priority, 3)

    })

    it("should add an available hitter", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availableHitters = []

        lineupService.availableHitterAdd(lineup, "bench-1")

        assert.equal(lineup.availableHitters.length, 1)
        assert.equal(lineup.availableHitters[0]._id, "bench-1")

    })

    it("should not duplicate an available hitter", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availableHitters = [
            { _id: "bench-1" }
        ]

        lineupService.availableHitterAdd(lineup, "bench-1")

        assert.equal(lineup.availableHitters.length, 1)

    })

    it("should remove an available hitter", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availableHitters = [
            { _id: "bench-1" },
            { _id: "bench-2" }
        ]

        lineupService.availableHitterRemove(lineup, "bench-1")

        assert.equal(lineup.availableHitters.length, 1)
        assert.equal(lineup.availableHitters[0]._id, "bench-2")

    })

    it("should move a lineup player to available hitters", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.availableHitters = []

        lineupService.moveLineupPlayerToAvailableHitters(lineup, "hitter-1")

        assert.equal(lineup.order[0]._id, undefined)
        assert.equal(lineup.availableHitters.length, 1)
        assert.equal(lineup.availableHitters[0]._id, "hitter-1")

    })

    it("should move an available hitter to the lineup", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        lineup.order[0] = {
            position: Position.CATCHER
        } as any

        lineup.availableHitters = [
            { _id: "bench-1" }
        ]

        lineupService.moveAvailableHitterToLineup(
            lineup,
            {
                _id: "bench-1",
                primaryPosition: Position.CATCHER
            },
            0
        )

        assert.equal(lineup.order[0]._id, "bench-1")
        assert.equal(lineup.order[0].position, Position.CATCHER)
        assert.equal(lineup.availableHitters.length, 0)

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

    it("should remove lineup player by position and return the removed player id", async () => {

        let lineup = createTeamViewModel().team.lineups[0]

        let removedId = lineupService.lineupRemoveByPosition(lineup, Position.CATCHER)

        assert.equal(removedId, "hitter-1")
        assert.equal(lineup.order[0]._id, undefined)

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
                            { _id: "bench-1" },
                            { _id: "bench-2" },
                            { _id: "bench-3" },
                            { _id: "bench-4" },
                            { _id: "bench-5" }
                        ],
                        availablePitchers: [
                            {
                                playerId: "pitcher-6",
                                role: PitchingRoleType.CLOSER,
                                priority: 1
                            },
                            {
                                playerId: "pitcher-7",
                                role: PitchingRoleType.SETUP,
                                priority: 1
                            },
                            {
                                playerId: "pitcher-8",
                                role: PitchingRoleType.SETUP,
                                priority: 2
                            },
                            {
                                playerId: "pitcher-9",
                                role: PitchingRoleType.MIDDLE,
                                priority: 1
                            },
                            {
                                playerId: "pitcher-10",
                                role: PitchingRoleType.MIDDLE,
                                priority: 2
                            },
                            {
                                playerId: "pitcher-11",
                                role: PitchingRoleType.MIDDLE,
                                priority: 3
                            },
                            {
                                playerId: "pitcher-12",
                                role: PitchingRoleType.LONG,
                                priority: 1
                            },
                            {
                                playerId: "pitcher-13",
                                role: PitchingRoleType.MOP_UP,
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
                { _id: "bench-2", fullName: "Bench Two", primaryPosition: Position.FIRST_BASE },
                { _id: "bench-3", fullName: "Bench Three", primaryPosition: Position.SECOND_BASE },
                { _id: "bench-4", fullName: "Bench Four", primaryPosition: Position.LEFT_FIELD },
                { _id: "bench-5", fullName: "Bench Five", primaryPosition: Position.CENTER_FIELD },
                { _id: "pitcher-1", fullName: "Pitcher One", primaryPosition: Position.PITCHER },
                { _id: "pitcher-2", fullName: "Pitcher Two", primaryPosition: Position.PITCHER },
                { _id: "pitcher-3", fullName: "Pitcher Three", primaryPosition: Position.PITCHER },
                { _id: "pitcher-4", fullName: "Pitcher Four", primaryPosition: Position.PITCHER },
                { _id: "pitcher-5", fullName: "Pitcher Five", primaryPosition: Position.PITCHER },
                { _id: "pitcher-6", fullName: "Pitcher Six", primaryPosition: Position.PITCHER },
                { _id: "pitcher-7", fullName: "Pitcher Seven", primaryPosition: Position.PITCHER },
                { _id: "pitcher-8", fullName: "Pitcher Eight", primaryPosition: Position.PITCHER },
                { _id: "pitcher-9", fullName: "Pitcher Nine", primaryPosition: Position.PITCHER },
                { _id: "pitcher-10", fullName: "Pitcher Ten", primaryPosition: Position.PITCHER },
                { _id: "pitcher-11", fullName: "Pitcher Eleven", primaryPosition: Position.PITCHER },
                { _id: "pitcher-12", fullName: "Pitcher Twelve", primaryPosition: Position.PITCHER },
                { _id: "pitcher-13", fullName: "Pitcher Thirteen", primaryPosition: Position.PITCHER }
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