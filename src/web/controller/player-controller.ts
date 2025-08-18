import { inject, injectable } from 'inversify';

import PlayerIndexComponent from '../components/player/index.f7.html'
import PlayersListComponent from '../components/player/list.f7.html'


import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';


@injectable()
class PlayerController {

    constructor(
        @inject("discord") private discord:Function
    ) {}

    @routeMap("/p/:id")
    async showIndex(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, PlayerIndexComponent)

    }



    @routeMap("/players/")
    async showList(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, PlayersListComponent)

    }


    
    // @routeMap("/players")
    // async showStats(): Promise<ModelView> {
        
    //     return new ModelView(async () => {
    //         return {
    //             discord: this.discord
    //         }
    //     }, PlayerStatsComponent)

    // }

    // @routeMap("/players/activity")
    // async showActivity(): Promise<ModelView> {
        
    //     return new ModelView(async () => {
    //         return {
    //             discord: this.discord
    //         }
    //     }, PlayerActivityComponent)

    // }

    // @routeMap("/players/league")
    // async showLeague(): Promise<ModelView> {
        
    //     return new ModelView(async () => {
    //         return {
    //             discord: this.discord
    //         }
    //     }, PlayersLeagueComponent)

    // }

}

export { PlayerController }
