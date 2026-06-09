import { inject, injectable } from "inversify";

import { TeamMarketOfferRepository } from "../../repository/team-market-offer-repository.js";
import { TeamMarketOffer } from "../../dto/team-market-offer.js";
import { TeamMarketOfferStatus } from "../enums.js";
import { UserService } from "./user-service.js";
import { TeamService } from "./team-service.js";
import { PlayerService } from "./player-service.js";
import { User } from "../../dto/user.js";
import { Team } from "../../dto/team.js";
import { Player } from "../../dto/player.js";
import { UserRepository } from "../../repository/user-repository.js";

@injectable()
class TeamMarketOfferService {

    @inject("TeamMarketOfferRepository")
    private teamMarketOfferRepository: TeamMarketOfferRepository

    @inject("UserRepository")
    private userRepository:UserRepository
    

    constructor(
        private teamService:TeamService,
        private playerService:PlayerService
    ) { }

    async get(id:string, options?:any): Promise<TeamMarketOffer> {
        return this.teamMarketOfferRepository.get(id, options)
    }

    async put(tmo:TeamMarketOffer, options?:any): Promise<TeamMarketOffer> {
        return this.teamMarketOfferRepository.put(tmo, options)
    }

    async getPendingSaleListingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined> {
        return this.teamMarketOfferRepository.getPendingSaleListingByPlayerId(playerId, options)
    }

    async listPendingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer[]> {
        return this.teamMarketOfferRepository.listPendingByPlayerId(playerId, options)
    }

    async getHighestPendingByPlayerId(playerId:string, options?:any): Promise<TeamMarketOffer | undefined> {
        return this.teamMarketOfferRepository.getHighestPendingByPlayerId(playerId, options)
    }

    async listPendingByBuyerUserId(buyerUserId:string, options?:any): Promise<TeamMarketOffer[]> {
        return this.teamMarketOfferRepository.listPendingByBuyerUserId(buyerUserId, options)
    }


    async listPendingByBuyerUserIdAndPlayerId(buyerUserId:string, playerId:string, options?:any): Promise<TeamMarketOffer[]> {
        return this.teamMarketOfferRepository.listPendingByBuyerUserIdAndPlayerId(buyerUserId, playerId, options)
    }    

    async listSaleListingsBySellerUserId(sellerUserId:string, options?:any) {
        return this.teamMarketOfferRepository.listSaleListingsBySellerUserId(sellerUserId)
    }

    async listPendingSaleListings(options?:any): Promise<TeamMarketOffer[]> {
        return this.teamMarketOfferRepository.listPendingSaleListings(options)
    }    

    async getTeamMarketOfferViewModels(tmos:TeamMarketOffer[], options?:any): Promise<TeamMarketOfferViewModel[]> {

        let userIds:string[] = []
        let teamIds:string[] = []
        let playerIds:string[] = []

        for (let tmo of tmos) {

            if (tmo.buyerUserId) userIds.push(tmo.buyerUserId)
            if (tmo.sellerUserId) userIds.push(tmo.sellerUserId)

            if (tmo.buyerPaymentTeamId) teamIds.push(tmo.buyerPaymentTeamId)
            if (tmo.sellerPaymentTeamId) teamIds.push(tmo.sellerPaymentTeamId)

            if (tmo.salePlayerId) playerIds.push(tmo.salePlayerId)

        }

        userIds = [...new Set(userIds)]
        teamIds = [...new Set(teamIds)]
        playerIds = [...new Set(playerIds)]

        let users:User[] = userIds.length ? await this.userRepository.getByIds(userIds, options) : []
        let teams:Team[] = teamIds.length ? await this.teamService.getByIds(teamIds, options) : []
        let players:Player[] = playerIds.length ? await this.playerService.getByIds(playerIds, options) : []

        let usersById:Map<string, User> = new Map(users.map((user) => [user._id, user]))
        let teamsById:Map<string, Team> = new Map(teams.map((team) => [team._id, team]))
        let playersById:Map<string, Player> = new Map(players.map((player) => [player._id, player]))

        return tmos.map((tmo) => this.translateTeamMarketOfferToViewModel(
            tmo,
            tmo.buyerUserId ? usersById.get(tmo.buyerUserId) : undefined,
            usersById.get(tmo.sellerUserId),
            tmo.buyerPaymentTeamId ? teamsById.get(tmo.buyerPaymentTeamId) : undefined,
            teamsById.get(tmo.sellerPaymentTeamId),
            playersById.get(tmo.salePlayerId)
        ))

    }

    private translateTeamMarketOfferToViewModel(tmo:TeamMarketOffer, buyerUser?:User, sellerUser?:User, buyerPaymentTeam?:Team, sellerPaymentTeam?:Team, salePlayer?:Player): TeamMarketOfferViewModel {

        return {

            _id: tmo._id,

            buyerUser: buyerUser ? {
                _id: buyerUser._id,
                name: buyerUser?.discordProfile?.global_name
            } : undefined,

            sellerUser: {
                _id: sellerUser?._id ?? tmo.sellerUserId,
                name: sellerUser ? buyerUser?.discordProfile?.global_name : ""
            },

            buyerPaymentTeam: buyerPaymentTeam ? {
                _id: buyerPaymentTeam._id,
                name: buyerPaymentTeam?.name
            } : undefined,

            sellerPaymentTeam: {
                _id: sellerPaymentTeam?._id ?? tmo.sellerPaymentTeamId,
                name: sellerPaymentTeam?.name ?? ""
            },

            salePlayer: {
                _id: salePlayer?._id ?? tmo.salePlayerId,
                name: salePlayer ? salePlayer?.fullName : ""
            },

            diamondAmount: tmo.diamondAmount,
            status: tmo.status,
            expires: tmo.expires,
            escrowTransactionId: tmo.escrowTransactionId,
            settlementTransactionId: tmo.settlementTransactionId,
            lastUpdated: tmo.lastUpdated,
            dateCreated: tmo.dateCreated

        }

    }

    async getHighestBidsForUserPlayers(userId:string, options?:any): Promise<TeamMarketOffer[]> {
        return this.teamMarketOfferRepository.getHighestBidsForUserPlayers(userId, options)
    }

}

interface TeamMarketOfferViewModel {

    _id:string

    buyerUser?:{
        _id:string
        name:string
    }
    sellerUser:{
        _id:string
        name:string
    }

    buyerPaymentTeam?:{
        _id:string
        name:string
    }
    sellerPaymentTeam:{
        _id:string
        name:string
    }

    salePlayer:{
        _id:string
        name:string
    }

    diamondAmount:string
    status:TeamMarketOfferStatus
    expires?:Date
    escrowTransactionId?:string
    settlementTransactionId?:string
    lastUpdated?:Date
    dateCreated?:Date

}

export {
    TeamMarketOfferService, TeamMarketOfferViewModel
}