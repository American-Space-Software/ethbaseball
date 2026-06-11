import { injectable } from "inversify"
import { GameSubstitution } from "../../baseball-sim-engine/service/interfaces.js"

interface BoxscorePlayerRow {
    player: any
    subNumber?: number
}

@injectable()
class BoxscoreService {

    getBoxscoreInfo(substitutions: GameSubstitution[], boxscoreViewModel: any) {

        let lineup = boxscoreViewModel.teamInfo.lineupIds
        let teamId = boxscoreViewModel.teamInfo._id

        let teamSubstitutions = substitutions
            .filter(substitution => substitution.teamId == teamId)
            .sort((a, b) => (a.playIndex ?? 0) - (b.playIndex ?? 0))

        let subNumberByPlayerId = this.getSubNumberByPlayerId(teamSubstitutions)

        let pitchingSubstitutions = teamSubstitutions.filter(substitution => substitution.isPitchingChange)
        let lineupSubstitutions = teamSubstitutions.filter(substitution => substitution.lineupIndex !== undefined)

        let batterSeedIds = this.getBatterAppearanceIds(
            lineup,
            lineupSubstitutions
        )

        let batters = this.getRowsFromSubstitutions(
            batterSeedIds,
            boxscoreViewModel.teamInfo.players,
            lineupSubstitutions,
            subNumberByPlayerId,
            p => lineup.includes(p._id) || this.hasBattingLine(p)
        )

        let pitcherSeedIds = this.getPitcherAppearanceIds(
            pitchingSubstitutions
        )

        let pitchers = this.getRowsFromSubstitutions(
            pitcherSeedIds,
            boxscoreViewModel.teamInfo.players,
            pitchingSubstitutions,
            subNumberByPlayerId,
            p => p._id == boxscoreViewModel.teamInfo.currentPitcherId || this.hasPitchingLine(p)
        )

        let doubles = boxscoreViewModel.teamInfo.players
            .filter(p => p.hitResult.doubles > 0)
            .map(p => {
                return {
                    _id: p._id,
                    name: p.fullName,
                    value: p.hitResult.doubles
                }
            })

        let triples = boxscoreViewModel.teamInfo.players
            .filter(p => p.hitResult.triples > 0)
            .map(p => {
                return {
                    _id: p._id,
                    name: p.fullName,
                    value: p.hitResult.triples
                }
            })

        let hr = boxscoreViewModel.teamInfo.players
            .filter(p => p.hitResult.homeRuns > 0)
            .map(p => {
                return {
                    _id: p._id,
                    name: p.fullName,
                    value: p.hitResult.homeRuns
                }
            })

        let tb = boxscoreViewModel.teamInfo.players
            .filter(p => p.hitResult.tb > 0)
            .map(p => {
                return {
                    _id: p._id,
                    name: p.fullName,
                    value: p.hitResult.tb
                }
            })

        let rbi = boxscoreViewModel.teamInfo.players
            .filter(p => p.hitResult.rbi > 0)
            .map(p => {
                return {
                    name: p.fullName,
                    value: p.hitResult.rbi
                }
            })

        return {
            lineup: lineup,
            batters: batters,
            pitchers: pitchers,
            doubles: doubles,
            triples: triples,
            hr: hr,
            tb: tb,
            rbi: rbi
        }

    }


    getSubNumberByPlayerId(substitutions: any[]): Map<string, number> {

        let subNumberByPlayerId = new Map<string, number>()
        let subNumber = 1

        for (let substitution of substitutions) {

            if (!substitution.inPlayerId) {
                continue
            }

            if (subNumberByPlayerId.has(substitution.inPlayerId)) {
                continue
            }

            subNumberByPlayerId.set(substitution.inPlayerId, subNumber)

            subNumber++

        }

        return subNumberByPlayerId

    }

    getRowsFromSubstitutions(seedIds: string[], players: any[], substitutions: any[], subNumberByPlayerId: Map<string, number>, includePlayer: (player: any) => boolean): BoxscorePlayerRow[] {

        let rows: BoxscorePlayerRow[] = []
        let used = new Set<string>()

        for (let playerId of seedIds) {

            let player = this.getPlayer(players, playerId)

            if (!player) {
                continue
            }

            if (!includePlayer(player)) {
                continue
            }

            let existingSubNumber = subNumberByPlayerId.get(player._id)

            rows.push({
                player: player,
                subNumber: existingSubNumber
            })

            used.add(player._id)

        }

        for (let player of players) {

            if (used.has(player._id)) {
                continue
            }

            if (!includePlayer(player)) {
                continue
            }

            let existingSubNumber = subNumberByPlayerId.get(player._id)

            rows.push({
                player: player,
                subNumber: existingSubNumber
            })

            used.add(player._id)

        }

        return rows

    }

    getPlayer(players: any[], playerId: string) {
        return players.find(p => p._id == playerId)
    }

    hasBattingLine(p: any): boolean {
        return p?.hitResult && (
            p.hitResult.atBats > 0 ||
            p.hitResult.runs > 0 ||
            p.hitResult.hits > 0 ||
            p.hitResult.doubles > 0 ||
            p.hitResult.triples > 0 ||
            p.hitResult.homeRuns > 0 ||
            p.hitResult.rbi > 0 ||
            p.hitResult.bb > 0 ||
            p.hitResult.hbp > 0 ||
            p.hitResult.so > 0
        )
    }

    hasPitchingLine(p: any): boolean {
        return p?.pitchResult && (
            p.pitchResult.battersFaced > 0 ||
            p.pitchResult.pitches > 0 ||
            p.pitchResult.strikes > 0 ||
            p.pitchResult.hits > 0 ||
            p.pitchResult.runs > 0 ||
            p.pitchResult.er > 0 ||
            p.pitchResult.homeRuns > 0 ||
            p.pitchResult.bb > 0 ||
            p.pitchResult.so > 0 ||
            p.pitchResult.hbp > 0
        )
    }

    getPitcherAppearanceIds(pitchingSubstitutions: any[]): string[] {

        let sortedPitchingSubstitutions = [...pitchingSubstitutions].sort((a, b) => {
            return (a.playIndex ?? 0) - (b.playIndex ?? 0)
        })

        let ids: string[] = []
        let used = new Set<string>()

        const add = (playerId?: string) => {

            if (!playerId) {
                return
            }

            if (used.has(playerId)) {
                return
            }

            ids.push(playerId)
            used.add(playerId)

        }

        if (sortedPitchingSubstitutions.length > 0) {
            add(sortedPitchingSubstitutions[0].outPlayerId)
        }

        for (let substitution of sortedPitchingSubstitutions) {
            add(substitution.inPlayerId)
        }

        return ids

    }

    getBatterAppearanceIds(lineup: string[], substitutions: any[]): string[] {

        let lineupSubstitutions = substitutions
            .filter(substitution => substitution.lineupIndex !== undefined)
            .sort((a, b) => (a.playIndex ?? 0) - (b.playIndex ?? 0))

        let originalLineup = [...lineup]

        for (let substitution of [...lineupSubstitutions].reverse()) {

            if (originalLineup[substitution.lineupIndex] === substitution.inPlayerId) {
                originalLineup[substitution.lineupIndex] = substitution.outPlayerId
            }

        }

        let ids: string[] = []
        let used = new Set<string>()

        const add = (playerId?: string) => {

            if (!playerId) {
                return
            }

            if (used.has(playerId)) {
                return
            }

            ids.push(playerId)
            used.add(playerId)

        }

        for (let lineupIndex = 0; lineupIndex < originalLineup.length; lineupIndex++) {

            add(originalLineup[lineupIndex])

            for (let substitution of lineupSubstitutions) {

                if (substitution.lineupIndex !== lineupIndex) {
                    continue
                }

                add(substitution.inPlayerId)

            }

        }

        return ids

    }

}

export {
    BoxscoreService,
    BoxscorePlayerRow
}