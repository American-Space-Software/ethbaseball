import { inject, injectable } from "inversify";
import { v4 as uuidv4 } from 'uuid';


import { TeamQueueRepository } from "../../repository/team-queue-repository.js";
import { TeamQueue, TeamQueueMatchup } from "../../dto/team-queue.js";
import { Team } from "../../dto/team.js";
import { League } from "../../dto/league.js";


@injectable()
class TeamQueueService {

    @inject("TeamQueueRepository")
    private teamQueueRepository:TeamQueueRepository

    constructor(
    ) {}

    async get(_id:string, options?:any) : Promise<TeamQueue> {
        return this.teamQueueRepository.get(_id, options)
    }

    async put(tq:TeamQueue, options?:any) {
        return this.teamQueueRepository.put(tq, options)
    }

    async list(limit:number, offset:number, options?:any) : Promise<TeamQueue[]> {
        return this.teamQueueRepository.list(limit, offset, options)
    }

    async listByLeague(league:League, limit:number, offset:number, options?: any): Promise<TeamQueue[]> {
        return this.teamQueueRepository.listByLeague(league, limit, offset, options)
    }

    async clear(options?:any) {
        return this.teamQueueRepository.clear(options)
    }

    async queueTeam(team:Team, league:League, teamRating:number, maxRatingDiff:number, expandRange:boolean, options?: any): Promise<TeamQueue> {

        const tq = Object.assign(new TeamQueue(), {
            _id: uuidv4(),
            teamId: team._id,
            leagueId: league._id,
            maxRatingDiff: maxRatingDiff,
            teamRating: teamRating,
            expandRange: expandRange,
            dateCreated: null,
            lastUpdated: null
        })

        return this.teamQueueRepository.put(tq, options)
    }

    async dequeueTeam(team:Team, options?: any): Promise<void> {

        let existing = await this.teamQueueRepository.getByTeam(team, options)

        if (existing) {
            await this.teamQueueRepository.delete(existing, options)
        }

    }


    async isTeamQueued(team:Team, options?: any): Promise<boolean> {
        return this.teamQueueRepository.isTeamQueued(team, options)
    }

    async count(options?: any): Promise<number> {
        return this.teamQueueRepository.count(options)
    }

    async processQueuePairs( league: League, options?: any ): Promise<TeamQueueMatchup[]> {

        const pairs: { team1: TeamQueue, team2: TeamQueue, ratingDiff: number }[] = []
        const queue = await this.teamQueueRepository.listByLeagueTeamRatingDesc(league, 10000, 0, options)

        const used = new Set<string>()

        const isUsed = (tq: TeamQueue) => used.has(tq._id)

        const ratingDiff = (a: TeamQueue, b: TeamQueue) =>
            Math.abs(a.teamRating - b.teamRating)

        const isCompatible = (a: TeamQueue, b: TeamQueue) => {
            const diff = ratingDiff(a, b)
            const aMax = this.getEffectiveMaxRatingDiff(a)
            const bMax = this.getEffectiveMaxRatingDiff(b)

            return diff <= aMax && diff <= bMax
        }

        for (let i = 0; i < queue.length; i++) {
            const team1 = queue[i]
            if (isUsed(team1)) continue

            let best: TeamQueue = null
            let bestDiff = Infinity

            for (let j = i + 1; j < queue.length; j++) {
                const team2 = queue[j]
                if (isUsed(team2)) continue

                const diff = ratingDiff(team1, team2)

                // Because queue is sorted by rating, gaps only increase
                if (diff > bestDiff) break

                if (!isCompatible(team1, team2)) continue

                best = team2
                bestDiff = diff
            }

            if (!best) continue

            pairs.push({
                team1,
                team2: best,
                ratingDiff: bestDiff
            })

            used.add(team1._id)
            used.add(best._id)
        }

        return pairs
    }


    private getEffectiveMaxRatingDiff(teamQueue: TeamQueue): number {

        if (!teamQueue.expandRange) {
            return teamQueue.maxRatingDiff 
        }

        const createdAt = new Date(teamQueue.dateCreated).getTime()
        const now = Date.now()

        if (Number.isNaN(createdAt) || now <= createdAt) {
            return Math.min(teamQueue.maxRatingDiff , 250)
        }

        const elapsedMs = now - createdAt
        const fiveMinuteBlocks = Math.floor(elapsedMs / (5 * 60 * 1000))
        const expanded = teamQueue.maxRatingDiff  + (fiveMinuteBlocks * 5)

        return Math.min(expanded, 250)
    }



}


export {
    TeamQueueService
}