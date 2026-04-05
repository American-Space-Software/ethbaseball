import { inject, injectable } from "inversify";

import { DiscordService } from "../discord-service.js";
import { GameService } from "./game-service.js";

import { UserService } from "./user-service.js";
import { TeamService } from "./team-service.js";
import { Team } from "../../dto/team.js";
import { User } from "../../dto/user.js";
import { Game } from "../../dto/game.js";
import { GameNotificationsRepository } from "../../repository/game-notifications-repository.js";



@injectable()
class GameNotificationService {

    @inject("GameNotificationsRepository")
    private gameNotificationsRepository:GameNotificationsRepository

    private latestGameUpdateSentAt:Date = new Date(new Date().toUTCString())



    constructor(
        private discordService:DiscordService,
        private userService:UserService,
        private teamService:TeamService,
        private gameService:GameService
    ) {}


    async processGameNotifications() {

        const games = await this.gameService.getCreatedSince(this.latestGameUpdateSentAt)

        if (games?.length > 0) {

            console.log(`Processing discord notificatons for ${games.length} games.`)

            for (const game of games) {
                await this.processNotificationsForGame(game)
            }

        }

        this.latestGameUpdateSentAt = new Date(new Date().toUTCString())

    }

    async processNotificationsForGame(game:Game) {

        const awayTeam: Team = await this.teamService.get(game.away._id)
        const homeTeam: Team = await this.teamService.get(game.home._id)

        const awayUser: User = await this.userService.get(awayTeam.userId)
        const homeUser: User = await this.userService.get(homeTeam.userId)


        if (game.isStarted && !game.isFinished) {
            await this.discordService.notifyGameStarted(
                game,
                { team: awayTeam, user: awayUser },
                { team: homeTeam, user: homeUser }
            )
        }

        // if (game.isFinished) {
        //     await this.notifyGameFinished(
        //         game,
        //         { team: awayTeam, user: awayUser },
        //         { team: homeTeam, user: homeUser }
        //     )
        // }
    }
}



export {
    GameNotificationService
}