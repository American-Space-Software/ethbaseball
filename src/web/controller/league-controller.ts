import { inject, injectable } from 'inversify';

import LeagueIndexComponent from '../components/league/index.f7.html'
import LeagueStandingsComponent from '../components/league/standings.f7.html'


import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';
import { UniverseWebService } from '../service/universe-web-service.js';
import { LeagueWebService } from '../service/league-web-service.js';



@injectable()
class LeagueController {

    constructor(
        private leagueWebService:LeagueWebService,
        private universeWebService:UniverseWebService,
        @inject("discord") private discord:Function,
        @inject("eventTarget") private eventTarget,
        @inject("env") private env
    ) {}


    @routeMap("/l/list/:rank")
    async showLeagueIndex(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, LeagueIndexComponent)

    }

    @routeMap("/l/standings/:rank/:page")
    async showLeagueStandings(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let currentStartDate = routeTo?.query?.startDate

            this.universeWebService.setStartDate(currentStartDate, routeTo)
            this.universeWebService.setRank(routeTo?.params?.rank || 1)

            let page = routeTo.params?.page || 1

            let viewModel = await this.leagueWebService.getStandings(this.universeWebService.getRank(), this.universeWebService.getStartDate(), page)

            return {
                viewModel: viewModel,
                discord: this.discord
            }
        }, LeagueStandingsComponent)

    }




}

export { LeagueController }
