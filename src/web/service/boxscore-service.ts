import { injectable } from "inversify"

interface BoxscorePlayerRow {
    player: any
    subNumber?: number
}

@injectable()
class BoxscoreService {

    getBoxscoreInfo(boxscoreViewModel: any) {

        let lineup = boxscoreViewModel.teamInfo.lineupIds

        let substitutions = boxscoreViewModel.teamInfo.substitutions || []

        let subNumberByPlayerId = this.getSubNumberByPlayerId(substitutions)

        let battingSubstitutions = substitutions.filter(substitution => !substitution.isPitchingChange)
        let pitchingSubstitutions = substitutions.filter(substitution => substitution.isPitchingChange)

        let batters = this.getRowsFromSubstitutions(
            lineup,
            boxscoreViewModel.teamInfo.players,
            battingSubstitutions,
            subNumberByPlayerId,
            p => lineup.includes(p._id) || this.hasBattingLine(p)
        )

        let pitcherSeedIds = boxscoreViewModel.teamInfo.players
            .filter(p => p._id == boxscoreViewModel.teamInfo.currentPitcherId || this.hasPitchingLine(p))
            .map(p => p._id)

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
        let subNumber = 1

        for (let playerId of seedIds) {

            let player = this.getPlayer(players, playerId)

            if (!player) {
                continue
            }

            if (!includePlayer(player)) {
                continue
            }

            rows.push({
                player: player
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
                subNumber: existingSubNumber || subNumber
            })

            used.add(player._id)

            if (!existingSubNumber) {
                subNumber++
            }

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

}

export {
    BoxscoreService,
    BoxscorePlayerRow
}