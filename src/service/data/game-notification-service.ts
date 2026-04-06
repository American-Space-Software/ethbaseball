import { inject, injectable } from "inversify";

import { UserService } from "./user-service.js";
import { TeamService } from "./team-service.js";
import { Team } from "../../dto/team.js";
import { User } from "../../dto/user.js";
import { GameNotificationsRepository } from "../../repository/game-notifications-repository.js";
import { GameNotifications } from "../../dto/game-notifications.js";
import { DiscordService } from "../discord-service.js";
import { GameService } from "./game-service.js";
import { Game } from "../../dto/game.js";



@injectable()
class GameNotificationService {

    @inject("GameNotificationsRepository")
    private gameNotificationsRepository:GameNotificationsRepository

    private latestGameUpdateSentAt:Date = new Date(new Date().toUTCString())

    constructor(
        private userService:UserService,
        private teamService:TeamService,
        private discordService:DiscordService,
        private gameService:GameService
    ) {}


    async processGameNotifications() {

        const gameNotifications:GameNotifications[] = await this.getUpdatedSince(this.latestGameUpdateSentAt)

        if (gameNotifications?.length > 0) {

            console.log(`Processing discord notificatons for ${gameNotifications.length} games.`)

            for (const gn of gameNotifications) {
                await this.processNotificationsForGame(gn)
            }

        }

        this.latestGameUpdateSentAt = new Date(new Date().toUTCString())

    }

    async processNotificationsForGame(gameNotifications:GameNotifications) {

        let game:Game = await this.gameService.get(gameNotifications.gameId)

        const awayTeam: Team = await this.teamService.get(game.away._id)
        const homeTeam: Team = await this.teamService.get(game.home._id)

        const awayUser: User = await this.userService.get(awayTeam.userId)
        const homeUser: User = await this.userService.get(homeTeam.userId)


        if (game.isStarted && !gameNotifications.updatesSent.discordStarted) {

            await this.discordService.notifyGameStarted(
                game,
                { team: awayTeam, user: awayUser },
                { team: homeTeam, user: homeUser }
            )

            gameNotifications.updatesSent.discordStarted = true
            gameNotifications.changed("updatesSent", true)

            await this.gameNotificationsRepository.put(gameNotifications)

        }

        if (game.isFinished && !gameNotifications.updatesSent.discordEnded) {

            await this.discordService.notifyGameFinished(
                game,
                { team: awayTeam, user: awayUser },
                { team: homeTeam, user: homeUser }
            )

            gameNotifications.updatesSent.discordEnded = true
            gameNotifications.changed("updatesSent", true)

            await this.gameNotificationsRepository.put(gameNotifications)



        }



    }

    async getUpdatedSince(date:Date, options?:any) : Promise<GameNotifications[]> {

        let ids = await this.gameNotificationsRepository.getIdsUpdatedSince(date, options)
        if (ids.length == 0) return []

        let gns:GameNotifications[] = await this.gameNotificationsRepository.getByIds(ids, options)
        
        //Sort so it matches ids order
        gns.sort(function(a,b) {
            return ids.indexOf( a._id ) - ids.indexOf( b._id )
        })

        return gns

    }

    async put(gn: GameNotifications, options?: any): Promise<GameNotifications> {
        return this.gameNotificationsRepository.put(gn, options)
    }
    
}



export {
    GameNotificationService
}