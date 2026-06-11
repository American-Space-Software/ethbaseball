import { inject, injectable } from "inversify"

import { NotificationRepository } from "../../repository/notification-repository.js"
import { Notification } from "../../dto/notification.js"
import { NotificationChannel, NotificationEntityType, NotificationEventType, NotificationStatus } from "../enums.js"
import { DiscordService } from "../discord-service.js"
import { GameService } from "./game-service.js"
import { TeamService } from "./team-service.js"
import { UserService } from "./user-service.js"
import { Game } from "../../dto/game.js"
import { Team } from "../../dto/team.js"
import { User } from "../../dto/user.js"
import { TeamMarketOfferService } from "./team-market-offer-service.js"
import { PlayerService } from "./player-service.js"
import { TeamMarketOffer } from "../../dto/team-market-offer.js"
import { Player } from "../../dto/player.js"

@injectable()
class NotificationService {

    @inject("NotificationRepository")
    private notificationRepository: NotificationRepository

    constructor(
        private discordService: DiscordService,
        private gameService: GameService,
        private teamService: TeamService,
        private userService: UserService,
        private teamMarketOfferService: TeamMarketOfferService,
        private playerService: PlayerService
    ) { }

    async processPending(options?: any): Promise<void> {

        const notifications: Notification[] = await this.notificationRepository.getPending(options)

        if (!notifications?.length) {
            return
        }

        console.log(`Processing ${notifications.length} pending notifications.`)

        for (const notification of notifications) {
            await this.processNotification(notification, options)
        }

    }

    async processNotification(notification: Notification, options?: any): Promise<void> {

        notification.attempts = (notification.attempts ?? 0) + 1
        notification.lastAttemptedAt = new Date()

        notification.changed("attempts", true)
        notification.changed("lastAttemptedAt", true)

        try {

            if (notification.channel == NotificationChannel.DISCORD) {
                await this.processDiscordNotification(notification, options)
            } else {
                throw new Error(`Unsupported notification channel: ${notification.channel}`)
            }

            notification.status = NotificationStatus.SENT
            notification.processedAt = new Date()
            notification.lastError = null

            notification.changed("status", true)
            notification.changed("processedAt", true)
            notification.changed("lastError", true)

            await this.notificationRepository.put(notification, options)

        } catch (e) {

            notification.lastError = e?.message ?? String(e)

            notification.changed("lastError", true)

            await this.notificationRepository.put(notification, options)

            console.error(`Failed to process notification ${notification._id}`, e)

        }

    }

    async processDiscordNotification(notification: Notification, options?: any): Promise<void> {

        if (notification.entityType == NotificationEntityType.GAME) {
            await this.processDiscordGameNotification(notification, options)
            return
        }

        if (notification.entityType == NotificationEntityType.TEAM_MARKET_OFFER) {
            await this.processDiscordTeamMarketOfferNotification(notification, options)
            return
        }

        if (notification.entityType == NotificationEntityType.TEAM) {
            await this.processDiscordTeamNotification(notification, options)
            return
        }

        throw new Error(`Unsupported discord notification entity type: ${notification.entityType}`)

    }

    async processDiscordTeamNotification(notification: Notification, options?: any): Promise<void> {

        let team: Team = await this.teamService.get(notification.entityId, options)
        let user: User = await this.userService.get(team.userId, options)

        if (notification.eventType == NotificationEventType.FRANCHISE_CREATED) {
            await this.discordService.notifyTeamCreated(team, user)
            return
        }

        throw new Error(`Unsupported discord team notification event type: ${notification.eventType}`)

    }


    async processDiscordGameNotification(notification: Notification, options?: any): Promise<void> {

        let game: Game = await this.gameService.get(notification.entityId, options)

        const awayTeam: Team = await this.teamService.get(game.away._id, options)
        const homeTeam: Team = await this.teamService.get(game.home._id, options)

        const awayUser: User = await this.userService.get(awayTeam.userId, options)
        const homeUser: User = await this.userService.get(homeTeam.userId, options)

        if (notification.eventType == NotificationEventType.GAME_STARTED) {
            await this.discordService.notifyGameStarted(game, { team: awayTeam, user: awayUser }, { team: homeTeam, user: homeUser })
            return
        }

        if (notification.eventType == NotificationEventType.GAME_FINISHED) {
            await this.discordService.notifyGameFinished(game, { team: awayTeam, user: awayUser }, { team: homeTeam, user: homeUser })
            return
        }

        throw new Error(`Unsupported discord game notification event type: ${notification.eventType}`)

    }

    async processDiscordTeamMarketOfferNotification(notification: Notification, options?: any): Promise<void> {

        let tmo: TeamMarketOffer = await this.teamMarketOfferService.get(notification.entityId, options)

        let player: Player = await this.playerService.get(tmo.salePlayerId, options)

        let buyerTeam: Team = tmo.buyerPaymentTeamId
            ? await this.teamService.get(tmo.buyerPaymentTeamId, options)
            : undefined

        let sellerTeam: Team = await this.teamService.get(tmo.sellerPaymentTeamId, options)

        let buyerUser: User = tmo.buyerUserId
            ? await this.userService.get(tmo.buyerUserId, options)
            : undefined

        let sellerUser: User = await this.userService.get(tmo.sellerUserId, options)

        if (notification.eventType == NotificationEventType.TEAM_MARKET_OFFER_CREATED) {
            await this.discordService.notifyPlayerBuyOfferCreated(
                player,
                tmo.diamondAmount,
                { team: buyerTeam, user: buyerUser },
                { team: sellerTeam, user: sellerUser }
            )
            return
        }

        if (notification.eventType == NotificationEventType.TEAM_MARKET_OFFER_ACCEPTED) {
            await this.discordService.notifyPlayerBuyOfferAccepted(
                player,
                tmo.diamondAmount,
                { team: buyerTeam, user: buyerUser },
                { team: sellerTeam, user: sellerUser }
            )
            return
        }

        if (notification.eventType == NotificationEventType.TEAM_MARKET_OFFER_CANCELLED) {
            await this.discordService.notifyPlayerBuyOfferCancelled(
                player,
                tmo.diamondAmount,
                { team: buyerTeam, user: buyerUser }
            )
            return
        }

        if (notification.eventType == NotificationEventType.TEAM_MARKET_OFFER_LISTED) {
            await this.discordService.notifyPlayerSaleListed(
                player,
                tmo.diamondAmount,
                { team: sellerTeam, user: sellerUser }
            )
            return
        }

        throw new Error(`Unsupported discord team market offer notification event type: ${notification.eventType}`)

    }

    async get(id: string, options?: any): Promise<Notification> {
        return this.notificationRepository.get(id, options)
    }

    async put(notification: Notification, options?: any): Promise<Notification> {
        return this.notificationRepository.put(notification, options)
    }

    async getPending(options?: any): Promise<Notification[]> {
        return this.notificationRepository.getPending(options)
    }

    async getPendingByChannel(channel: NotificationChannel, options?: any): Promise<Notification[]> {
        return this.notificationRepository.getPendingByChannel(channel, options)
    }

    async getByEntity(entityType: NotificationEntityType, entityId: string, options?: any): Promise<Notification[]> {
        return this.notificationRepository.getByEntity(entityType, entityId, options)
    }

    async getByEntityEventChannel(entityType: NotificationEntityType, entityId: string, eventType: NotificationEventType, channel: NotificationChannel, options?: any): Promise<Notification> {
        return this.notificationRepository.getByEntityEventChannel(entityType, entityId, eventType, channel, options)
    }

    async getByIds(ids: string[], options?: any): Promise<Notification[]> {
        return this.notificationRepository.getByIds(ids, options)
    }

}

export {
    NotificationService
}