import { inject, injectable } from 'inversify';

import GameListComponent from '../components/game/list.f7.html'
import GameInProgressComponent from '../components/game/full-in-progress.f7.html'
import GameCompletedComponent from '../components/game/full-complete.f7.html'

import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';
import { UniverseWebService } from '../service/universe-web-service.js';
import dayjs from 'dayjs';
import { GameWebService } from '../service/game-web-service.js';



@injectable()
class GameController {

    constructor(
        private gameWebService:GameWebService,
        private universeWebService:UniverseWebService,
        @inject("env") private env,
        @inject("eventTarget") private eventTarget,
        @inject("discord") private discord:Function
    ) {}

    @routeMap("/games")
    async showGames(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let leagues = this.universeWebService.getLeagues()

            this.universeWebService.setStartDate(routeTo?.query?.startDate, routeTo)
            this.universeWebService.setRank(routeTo?.query?.rank || 1)



            let gameDate = routeTo?.query?.gameDate || this.env().CURRENT_DATE

            if (!gameDate) {

                if (this.universeWebService.isCurrentSeason) {
                    gameDate = dayjs(new Date(new Date().toUTCString())).format('YYYY-MM-DD')
                } else {
                    gameDate = dayjs(this.universeWebService.getStartDate()).format('YYYY-MM-DD')
                }
            
            }


            let games = await this.gameWebService.getGames(gameDate, this.universeWebService.getRank())







            return {
                lastGameUpdate: new Date(new Date().toUTCString()),
                games: games,
                leagues: leagues,
                gameDate: gameDate,
                discord: this.discord
            }
        }, GameListComponent)

    }


    @routeMap("/g/:id")
    async showIndex(to): Promise<ModelView> {
        
        let id = to?.params?.id

        let game = await this.gameWebService.get(id)

        let component = GameInProgressComponent

        if (game.isComplete) {
            component = GameCompletedComponent
        }
        
        let gameViewModel = await this.gameWebService.getGameViewModel(game)

        return new ModelView(async (routeTo) => {
            
            return {
                gameViewModel: gameViewModel,
                discord: this.discord
            }

        }, component)

    }

}

export { GameController }
