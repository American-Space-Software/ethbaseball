import { inject, injectable } from 'inversify';

import LeagueIndexComponent from '../components/league/index.f7.html'
import LeagueStandingsComponent from '../components/league/standings.f7.html'


import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';



@injectable()
class LeagueController {

    constructor(
        @inject("discord") private discord:Function
    ) {}


    @routeMap("/l/list/:rank")
    async showLeagueIndex(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, LeagueIndexComponent)

    }

    @routeMap("/l/standings/:rank")
    async showLeagueStandings(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, LeagueStandingsComponent)

    }




}

export { LeagueController }
