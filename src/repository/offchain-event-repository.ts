import { OffchainEvent } from "../dto/offchain-event.js"
import { Owner } from "../dto/owner.js"
import { Season } from "../dto/season.js"
import { Team } from "../dto/team.js"


interface OffchainEventRepository {
    get(id:string, options?:any): Promise<OffchainEvent> 
    put(offchainEvent:OffchainEvent, options?:any): Promise<OffchainEvent>
    getByOwner(contractAddress:string, owner:Owner, options?:any) : Promise<OffchainEvent[]>
    getByTeamIdAndContractType(contractAddress:string, teamId:string, options?:any) : Promise<OffchainEvent[]>
    getRewardsByTeamAndSeason(contractType: string, team: Team, season: Season, options?: any): Promise<OffchainEvent[]>
    list(contractType:string, options?:any) : Promise<OffchainEvent[]>
    getByTeamId(teamId:string, options?:any) : Promise<OffchainEvent[]> 
    listAll(options?:any) : Promise<OffchainEvent[]>
    getDailyDiamondRewardByTeamIdForDate( teamId: string, forDate: string,  options?: any ): Promise<OffchainEvent | null>
    getMostRecentDailyDiamondRewardByTeamId( teamId: string, options?: any ): Promise<OffchainEvent | null>
}

export {
    OffchainEventRepository
}
