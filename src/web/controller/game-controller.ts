import { inject, injectable } from 'inversify';

import GameListComponent from '../components/game/list.f7.html'
import GameIndexComponent from '../components/game/index.f7.html'

import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';



@injectable()
class GameController {

    constructor(
        @inject("discord") private discord:Function
    ) {}

    @routeMap("/games")
    async showGames(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, GameListComponent)

    }


    @routeMap("/g/:id")
    async showIndex(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, GameIndexComponent)

    }

}

export { GameController }
