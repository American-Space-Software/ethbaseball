import { inject, injectable } from 'inversify';

import GameListComponent from '../components/game/list.f7.html'
import GameInProgressComponent from '../components/game/full-in-progress.f7.html'
import GameCompletedComponent from '../components/game/full-complete.f7.html'
import GamelogComponent from '../components/game/gamelog.f7.html'

import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';
import { UniverseWebService } from '../service/universe-web-service.js';
import dayjs from 'dayjs';
import { GameWebService } from '../service/game-web-service.js';
import { QuillWebService } from '../service/quill-web-service.js';



@injectable()
class GameController {

    constructor(
        private gameWebService:GameWebService,
        private universeWebService:UniverseWebService,
        private quillWebService:QuillWebService,
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


            let games = await this.gameWebService.getGames(this.universeWebService.getRank())


            return {
                lastGameUpdate: new Date(new Date().toUTCString()),
                games: games,
                leagues: leagues,

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
        
        let gameViewModel = this.gameWebService.getGameViewModel(game)

        return new ModelView(async (routeTo) => {
            
            return {
                gameViewModel: gameViewModel,
                summary: await this.quillWebService.translateContent(gameViewModel.game.summary),
                discord: this.discord
            }

        }, component)

    }

    @routeMap("/g/:id/gamelog")
    async showGamelog(): Promise<ModelView> {

        return new ModelView(async (routeTo) => {
            
            let id = routeTo?.params?.id

            let game = await this.gameWebService.get(id)

            let playByPlay = this.gameWebService.getPlayByPlay(game).filter( p => p.play?.result != undefined)
            
            let gamePlayers = this.gameWebService.gamePlayers(game)
            let gameViewModel = this.gameWebService.getGameViewModel(game)

            return {
                gameViewModel: gameViewModel,
                gamePlayers: gamePlayers,
                playByPlay: playByPlay,
                discord: this.discord
            }

        }, GamelogComponent)

    }

}

export { GameController }
