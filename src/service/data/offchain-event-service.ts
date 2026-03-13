import { inject, injectable } from "inversify";

import { Owner } from "../../dto/owner.js";
import { OffchainEvent } from "../../dto/offchain-event.js";
import { OffchainEventRepository } from "../../repository/offchain-event-repository.js";
import { v4 as uuidv4 } from 'uuid';
import { ContractType, OffChainEventSource, TeamSeasonId } from "../enums.js";
import { Season } from "../../dto/season.js";
import { TeamLeagueSeason } from "../../dto/team-league-season.js";
import { TeamLeagueSeasonService } from "./team-league-season-service.js";
import { TeamService } from "./team-service.js";
import { Team } from "../../dto/team.js";
import { TeamRepository } from "../../repository/team-repository.js";
import { SeasonService } from "./season-service.js";
import { PlayerService } from "./player-service.js";
import { Player } from "../../dto/player.js";



@injectable()
class OffchainEventService {

    @inject("OffchainEventRepository")
    private offchainEventRepository:OffchainEventRepository

    @inject("TeamRepository")
    private teamRepository:TeamRepository

    constructor(
        private teamLeagueSeasonService:TeamLeagueSeasonService,
        private playerService:PlayerService
    ) {}

    // async createMintEvent(toAddress:string, amount:string, options?:any) {

    //     let offChainEvent:OffchainEvent = new OffchainEvent()
    //     offChainEvent._id = uuidv4() 
    //     offChainEvent.contractType = ContractType.DIAMONDS
    //     offChainEvent.event = "Transfer"
    //     offChainEvent.fromAddress = "0x0000000000000000000000000000000000000000"
    //     offChainEvent.toAddress = toAddress
    //     offChainEvent.amount = amount

    //     await this.put(offChainEvent, options)
    // }

    // async createBurnEvent(fromAddress:string, amount:string, options?:any) {

    //     let offChainEvent:OffchainEvent = new OffchainEvent()
    //     offChainEvent._id = uuidv4() 
    //     offChainEvent.contractType = ContractType.DIAMONDS
    //     offChainEvent.event = "Transfer"
    //     offChainEvent.toAddress = "0x0000000000000000000000000000000000000000"
    //     offChainEvent.fromAddress = fromAddress
    //     offChainEvent.amount = amount

    //     await this.put(offChainEvent, options)
    // }

    async createTeamMintEvent(toTeamId:string, amount:string, source:OffChainEventSource, transactionId:string, options?:any) {

        if (BigInt(amount) < 0) throw new Error("Mint amount can not be negative.")

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.DIAMONDS
        offChainEvent.event = "Transfer"
        offChainEvent.fromAddress = "0x0000000000000000000000000000000000000000"
        offChainEvent.toTeamId = toTeamId
        offChainEvent.amount = amount
        offChainEvent.transactionId = transactionId
        offChainEvent.source = JSON.parse(JSON.stringify(source))

        await this.put(offChainEvent, options)

        return offChainEvent
    }

    async createTeamBurnEvent(fromTeamId:string, amount:string, transactionId:string, options?:any) {

        if (BigInt(amount) <= 0) throw new Error("Burn amount can not be negative.")

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.DIAMONDS
        offChainEvent.event = "Transfer"
        offChainEvent.toAddress = "0x0000000000000000000000000000000000000000"
        offChainEvent.fromTeamId = fromTeamId
        offChainEvent.amount = BigInt(amount).toString()
        offChainEvent.transactionId = transactionId

        await this.put(offChainEvent, options)

        return offChainEvent

    }

    async createPlayerTransferEvent(fromTeamId:string, toTeamId:string, playerId:string, transactionId:string, options?:any) {

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.PLAYERS
        offChainEvent.event = "Transfer"
        offChainEvent.toTeamId = toTeamId
        offChainEvent.fromTeamId = fromTeamId
        offChainEvent.playerId = playerId
        offChainEvent.transactionId = transactionId

        await this.put(offChainEvent, options)

        return offChainEvent

    }


    async createFreeAgentTransferEvent(toTeamId:string, playerId:string, transactionId:string, options?:any) {

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.PLAYERS
        offChainEvent.event = "Transfer"
        offChainEvent.toTeamId = toTeamId
        offChainEvent.playerId = playerId
        offChainEvent.transactionId = transactionId

        await this.put(offChainEvent, options)

        return offChainEvent

    }

    async createPlayerDropTransferEvent(fromTeamId:string, playerId:string, transactionId:string, options?:any) {

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.PLAYERS
        offChainEvent.event = "Transfer"
        offChainEvent.fromTeamId = fromTeamId
        offChainEvent.playerId = playerId
        offChainEvent.transactionId = transactionId

        await this.put(offChainEvent, options)

        return offChainEvent

    }
    


    async createPlayerExperienceEvent(toTeamId:string, playerId:string, amount:string, source:OffChainEventSource, transactionId:string, options?:any) {

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.EXPERIENCE
        offChainEvent.event = "Transfer"
        offChainEvent.toTeamId = toTeamId
        offChainEvent.playerId = playerId
        offChainEvent.transactionId = transactionId
        offChainEvent.amount = BigInt(amount).toString()
        offChainEvent.source = JSON.parse(JSON.stringify(source))

        await this.put(offChainEvent, options)

        return offChainEvent

    }


    async get(_id:string, options?:any) : Promise<OffchainEvent> {
        return this.offchainEventRepository.get(_id, options)
    }

    async put(ofcs:OffchainEvent, options?:any) {
        return this.offchainEventRepository.put(ofcs, options)
    }

    async getByOwner(contractType:string, owner:Owner, options?:any) : Promise<OffchainEvent[]> {
        return this.offchainEventRepository.getByOwner(contractType, owner, options)
    }

    async getByTeamId(teamId:string, options?:any) : Promise<OffchainEvent[]> {
        return this.offchainEventRepository.getByTeamId(teamId, options)
    }

    async getBalanceForTeamId(contractAddress:string, teamId:string, options?:any) {
        return this.offchainEventRepository.getBalanceByTeamIdAndContractType(contractAddress, teamId, options)
    }

    async getRewardsForTeamSeason(contractAddress:string,team:Team, season:Season, options?:any) {
        return this.offchainEventRepository.getRewardBalanceByTeamAndSeason(contractAddress, team, season, options)
    }


    async list(contractType:string, options?:any) : Promise<OffchainEvent[]> {
        return this.offchainEventRepository.list(contractType, options)
    }

    async listAll(options?:any) : Promise<OffchainEvent[]> {
        return this.offchainEventRepository.listAll(options)
    }

    async listByPage(options?:any) : Promise<OffchainEvent[]> {
        return this.offchainEventRepository.listByPage(options)
    }

    async getBalanceByPlayerIdAndContractType(contractType: string, playerId: string, options?: any): Promise<string> {
        return this.getBalanceByPlayerIdAndContractType(contractType, playerId, options)
    }

    async getOffChainEventViewModels(oce:OffchainEvent[], season:Season, options?:any) {

        let teamIds = oce.flatMap( e => [e.fromTeamId, e.toTeamId])
        let uniqueTeamIds = Array.from(new Set(teamIds.filter( i => i != undefined)))

        let tlssPlain:TeamLeagueSeason[] = []

        if (uniqueTeamIds?.length > 0) {

            let teams:Team[] = await this.teamRepository.getByIds(uniqueTeamIds, options)

            let teamSeasonIds:TeamSeasonId[] = teams.map( t => { return { teamId: t._id, seasonId: season._id } })

            let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.getByTeamSeasonIds(teamSeasonIds, options)
            tlssPlain = tlss?.map( tls => tls.get({ plain: true}))
        }


        let playerIds = oce.map( e => e.playerId).filter( i => i != undefined)
        let players:Player[] = await this.playerService.getByIds(playerIds, options)


        const transactions: OffchainTransactionViewModel[] = []
        const txMap = new Map<string, OffchainTransactionViewModel>()

        for (const e of oce) {

            const transactionId = (e.transactionId ?? e._id) as string

            let tx = txMap.get(transactionId)

            if (!tx) {
                tx = { transactionId, events: [] }
                txMap.set(transactionId, tx)
                transactions.push(tx) 
            }

            tx.events.push(e)
        }


        return {
            transactions:transactions,
            teams: tlssPlain?.map( tls => { return { _id: tls.team._id, name: tls.team.name, cityName: tls.city?.name, owner: { _id: tls.team.userId } } }),
            players: players?.map( p => { return { _id: p._id, fullName: p.fullName } })
        }
    }

    async getDailyDiamondRewardByTeamIdForDate( teamId: string, forDate: string,  options?: any ): Promise<OffchainEvent | null> {
        return this.offchainEventRepository.getDailyDiamondRewardByTeamIdForDate(teamId, forDate, options)
    }

    async getMostRecentDailyDiamondRewardByTeamId( teamId: string, options?: any ): Promise<OffchainEvent | null> {
        return this.offchainEventRepository.getMostRecentDailyDiamondRewardByTeamId(teamId, options)
    }

}

interface OffchainTransactionViewModel {
    transactionId: string
    events: OffchainEvent[]
}


export {
    OffchainEventService
}