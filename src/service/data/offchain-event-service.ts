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

    async createMintEvent(toAddress:string, amount:string, options?:any) {

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.DIAMONDS
        offChainEvent.event = "Transfer"
        offChainEvent.fromAddress = "0x0000000000000000000000000000000000000000"
        offChainEvent.toAddress = toAddress
        offChainEvent.amount = amount

        await this.put(offChainEvent, options)
    }

    async createBurnEvent(fromAddress:string, amount:string, options?:any) {

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.DIAMONDS
        offChainEvent.event = "Transfer"
        offChainEvent.toAddress = "0x0000000000000000000000000000000000000000"
        offChainEvent.fromAddress = fromAddress
        offChainEvent.amount = amount

        await this.put(offChainEvent, options)
    }

    async createTeamMintEvent(toTeamId:string, amount:string, source:OffChainEventSource, options?:any) {

        if (BigInt(amount) < 0) throw new Error("Mint amount can not be negative.")

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.DIAMONDS
        offChainEvent.event = "Transfer"
        offChainEvent.fromAddress = "0x0000000000000000000000000000000000000000"
        offChainEvent.toTeamId = toTeamId
        offChainEvent.amount = amount
        offChainEvent.source = JSON.parse(JSON.stringify(source))

        await this.put(offChainEvent, options)

        return offChainEvent
    }

    async createTeamBurnEvent(fromTeamId:string, amount:string, options?:any) {

        if (BigInt(amount) >= 0) throw new Error("Burn amount can not be positive.")

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.DIAMONDS
        offChainEvent.event = "Transfer"
        offChainEvent.toAddress = "0x0000000000000000000000000000000000000000"
        offChainEvent.fromTeamId = fromTeamId
        offChainEvent.amount = (BigInt(0) - BigInt(amount)).toString()

        await this.put(offChainEvent, options)

        return offChainEvent

    }

    async createPlayerTransferEvent(fromTeamId:string, toTeamId:string, playerId:string, options?:any) {

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.PLAYERS
        offChainEvent.event = "Transfer"
        offChainEvent.toTeamId = toTeamId
        offChainEvent.fromTeamId = fromTeamId
        offChainEvent.playerId = playerId

        await this.put(offChainEvent, options)

        return offChainEvent

    }


    async createFreeAgentTransferEvent(toTeamId:string, playerId:string, options?:any) {

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.PLAYERS
        offChainEvent.event = "Transfer"
        offChainEvent.toTeamId = toTeamId
        offChainEvent.playerId = playerId

        await this.put(offChainEvent, options)

        return offChainEvent

    }

    async createPlayerDropTransferEvent(fromTeamId:string, playerId:string, options?:any) {

        let offChainEvent:OffchainEvent = new OffchainEvent()
        offChainEvent._id = uuidv4() 
        offChainEvent.contractType = ContractType.PLAYERS
        offChainEvent.event = "Transfer"
        offChainEvent.fromTeamId = fromTeamId
        offChainEvent.playerId = playerId

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

    async getBalanceForOwner(contractType:string, owner:Owner, options?:any) {

        let events:OffchainEvent[] = await this.getByOwner(contractType, owner, options)

        return this.getBalanceForOwnerFromEvents(owner, events)

    }

    getBalanceForOwnerFromEvents(owner:Owner, events:OffchainEvent[]) {

        let diamondBalance = "0"

        //Look through events
        for (let event of events) {

            if (event.toAddress && event.amount) {
                if (event.toAddress == owner._id) {
                    diamondBalance = (  BigInt(diamondBalance || 0) + BigInt(event.amount) ).toString() 
                } else {
                    diamondBalance = (  BigInt(diamondBalance || 0) - BigInt(event.amount) ).toString() 
                }
            }
        }

        return diamondBalance

    }

    async getBalanceForTeamId(contractAddress:string, teamId:string, options?:any) {

        let events:OffchainEvent[] = await this.offchainEventRepository.getByTeamIdAndContractType(contractAddress, teamId, options)

        let diamondBalance = "0"

        //Look through events
        for (let event of events) {

            if (event.amount) {
                if (event.toTeamId == teamId) {
                    diamondBalance = (  BigInt(diamondBalance || 0) + BigInt(event.amount) ).toString() 
                } else if (event.fromTeamId == teamId) {
                    diamondBalance = (  BigInt(diamondBalance || 0) - BigInt(event.amount) ).toString() 
                }

            }

        }

        return diamondBalance


    }

    async getRewardsForTeamSeason(contractAddress:string,team:Team, season:Season, options?:any) {

        let events:OffchainEvent[] = await this.offchainEventRepository.getRewardsByTeamAndSeason(contractAddress, team, season, options)

        let diamondBalance = "0"

        //Look through events
        for (let event of events) {

            if (event.amount) {
                if (event.toTeamId == team._id) {
                    diamondBalance = (  BigInt(diamondBalance || 0) + BigInt(event.amount) ).toString() 
                } else if (event.fromTeamId == team._id) {
                    diamondBalance = (  BigInt(diamondBalance || 0) - BigInt(event.amount) ).toString() 
                }
            }
        }

        return diamondBalance


    }


    async list(contractType:string, options?:any) : Promise<OffchainEvent[]> {
        return this.offchainEventRepository.list(contractType, options)
    }

    async listAll(options?:any) : Promise<OffchainEvent[]> {
        return this.offchainEventRepository.listAll(options)
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


        return {
            events:oce,
            teams: tlssPlain?.map( tls => { return { _id: tls.team._id, name: tls.team.name, cityName: tls.city?.name } }),
            players: players?.map( p => { return { _id: p._id, fullName: p.fullName } })
        }
    }

}




export {
    OffchainEventService
}