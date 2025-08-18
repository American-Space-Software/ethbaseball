import { LadderChallenge } from "../dto/ladder-challenge.js"
import { Team } from "../dto/team.js"

interface LadderChallengeRepository {
    get(id:string, options?:any): Promise<LadderChallenge>
    put(LadderChallenge:LadderChallenge, options?:any) : Promise<LadderChallenge>
    getSentByTeam(team:Team, options?:any): Promise<LadderChallenge[]>
    getReceivedByTeam(team:Team, options?:any): Promise<LadderChallenge[]>
}

export {
    LadderChallengeRepository
}
