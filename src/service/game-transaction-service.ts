import { inject, injectable } from "inversify";
import { v4 as uuidv4 } from 'uuid';

import { GameTransactionRepository } from "../repository/game-transaction-repository.js";
import { GameTransaction, SigningInfo } from "../dto/game-transaction.js";

import { PlayerContract } from "./enums.js";
import { Team } from "../dto/team.js";
import { TeamRepository } from "../repository/team-repository.js";
import { PlayerRepository } from "../repository/player-repository.js";
import { Player } from "../dto/player.js";
import { League } from "../dto/league.js";
import { Season } from "../dto/season.js";
import { TeamLeagueSeason } from "../dto/team-league-season.js";
import { TeamLeagueSeasonService } from "./team-league-season-service.js";
import { OffchainEventService } from "./offchain-event-service.js";


@injectable()
class GameTransactionService {

    @inject("GameTransactionRepository")
    private gameTransactionRepository:GameTransactionRepository

    @inject("TeamRepository")
    private teamRepository:TeamRepository

    @inject("PlayerRepository")
    private playerRepository:PlayerRepository

    constructor(
        private teamLeagueSeasonService:TeamLeagueSeasonService
    ) {}

    async get(_id:string, options?:any) : Promise<GameTransaction> {
        return this.gameTransactionRepository.get(_id, options)
    }

    async getByIds(ids:string[], options?:any) : Promise<GameTransaction[]> {
        return this.gameTransactionRepository.getByIds(ids, options)
    }


    async put(gt:GameTransaction, options?:any) {
        return this.gameTransactionRepository.put(gt, options)
    }

    async getReadyToFinalize(options?: any): Promise<GameTransaction[]> {
        return this.gameTransactionRepository.getReadyToFinalize(options)
    }

    async remove(gt:GameTransaction, options?:any) : Promise<GameTransaction> {
        return this.gameTransactionRepository.remove(gt, options)
    }

    async getGameTransactionViewModels(gts:GameTransaction[], options?:any) {

        let teamSeasonIds = gts.flatMap( gt => gt.events.flatMap( e => { return { teamId: e.team._id, seasonId: gt.seasonId }}) )
        let uniqueTeamSeasonIds = Array.from(new Set(teamSeasonIds))

        let tlss:TeamLeagueSeason[] = await this.teamLeagueSeasonService.getByTeamSeasonIds(uniqueTeamSeasonIds, options)
        let tlssPlain:TeamLeagueSeason[] = tlss.map( tls => tls.get({ plain: true}))

        let players:Player[] = await this.playerRepository.getByIds( gts.flatMap( gt => gt.events.flatMap( e => [e.dropping?.playerId, e.receiving?.playerId, e.sending?.playerId, e.receiving?.playerId, e.signing?.playerId])), options)

        return {
            transactions:gts,
            players: players.map( p => { return { _id: p._id, name: p.fullName } }),
            teams: tlssPlain.map( tls => { return { _id: tls.teamId, name: tls.team.name, cityName: tls.city.name } })
        }
    }

    async latest(options?: any) {

        let gts = await this.gameTransactionRepository.list(options)
        return this.getGameTransactionViewModels(gts)

    }

    async getByTeamSeason(team:Team, season:Season, options?: any) {

        let gts = await this.gameTransactionRepository.getByTeamSeason(team, season, options)
        return this.getGameTransactionViewModels(gts)


    }

    async getByLeagueSeason(league:League, season:Season, options?: any) {

        let gts = await this.gameTransactionRepository.getByLeagueSeason(league, season, options)
        return this.getGameTransactionViewModels(gts)

    }

    async getByPlayer(player:Player, options?: any) {

        let gts = await this.gameTransactionRepository.getByPlayer(player, options)
        return this.getGameTransactionViewModels(gts)

    }

    async signPlayer(league:League, team:Team, season:Season, player:Player, contract:PlayerContract, date:Date, options?:any) {

        let gt:GameTransaction = new GameTransaction()
        gt._id = uuidv4()
        gt.date = date
        gt.seasonId = season._id
        gt.isFinalized = true

        gt.events = [{ 
            team: { _id: team._id, tokenId: team.tokenId},
            signing: {
                isWaiver: false, 
                playerId: player._id,
                contract: contract
            }
        }]

        gt.links= {
            teamTokenIds: [team.tokenId],
            playerTokenIds: [player.tokenId],
            leagueRanks: [league.rank]
        }

        return this.gameTransactionRepository.put(gt, options)

    }

    async dropPlayer(league:League, team:Team, season:Season, player:Player, date:Date, options?:any, signingInfo?:SigningInfo) {

        let gt:GameTransaction = new GameTransaction()
        gt._id = uuidv4()
        gt.seasonId = season._id
        gt.isFinalized = true

        gt.date = date
        gt.events = [{ 
            team: { _id: team._id, tokenId: team.tokenId},
            dropping: {
                playerId: player._id
            }
        }]
        
        gt.links= {
            teamTokenIds: [team.tokenId],
            playerTokenIds: [player.tokenId],
            leagueRanks: [league.rank]
        }


        gt.signingInfo = signingInfo

        return this.gameTransactionRepository.put(gt, options)

    }

    // createWithdraw(league:League, team:Team, season:Season, amount:string, date:Date) {

    //     let gt:GameTransaction = new GameTransaction()
    //     gt._id = uuidv4()
    //     gt.seasonId = season._id
    //     gt.isFinalized = false

    //     gt.date = date
    //     gt.events = [{ 
    //         team: { _id: team._id, tokenId: team.tokenId},
    //         withdraw: {
    //             amount: amount
    //         }
    //     }]
        
    //     gt.links= {
    //         teamTokenIds: [team.tokenId],
    //         playerTokenIds: [],
    //         leagueRanks: [league.rank]
    //     }


    //     return gt

    // }

    // createDeposit(league:League, team:Team, season:Season, amount:string, date:Date) {

    //     let gt:GameTransaction = new GameTransaction()
    //     gt._id = uuidv4()
    //     gt.seasonId = season._id
    //     gt.isFinalized = false

    //     gt.date = date
    //     gt.events = [{ 
    //         team: { _id: team._id, tokenId: team.tokenId},
    //         deposit: {
    //             amount: amount
    //         }
    //     }]
        
    //     gt.links= {
    //         teamTokenIds: [team.tokenId],
    //         playerTokenIds: [],
    //         leagueRanks: [league.rank]
    //     }


    //     return gt

    // }

    // createMint(league:League, team:Team, season:Season, amount:string, date:Date) {

    //     let gt:GameTransaction = new GameTransaction()
    //     gt._id = uuidv4()
    //     gt.seasonId = season._id
    //     gt.isFinalized = false

    //     gt.date = date
    //     gt.events = [{ 
    //         team: { _id: team._id, tokenId: team.tokenId},
    //         deposit: {
    //             amount: amount
    //         }
    //     }]
        
    //     gt.links= {
    //         teamTokenIds: [team.tokenId],
    //         playerTokenIds: [],
    //         leagueRanks: [league.rank]
    //     }


    //     return gt

    // }


}




export {
    GameTransactionService, SigningInfo
}