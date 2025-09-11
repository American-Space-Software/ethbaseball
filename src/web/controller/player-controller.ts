import { inject, injectable } from 'inversify';

import PlayerIndexComponent from '../components/player/index.f7.html'
import PlayersListComponent from '../components/player/list.f7.html'


import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';
import { UniverseWebService } from '../service/universe-web-service.js';
import { PlayerWebService } from '../service/player-web-service.js';
import { LoginWebService } from '../service/login-web-service.js';


@injectable()
class PlayerController {

    constructor(
        private universeWebService:UniverseWebService,
        private playerWebService:PlayerWebService,
        private loginWebService:LoginWebService,
        @inject('env') private env,
        @inject('eventTarget') private eventTarget,
        @inject("discord") private discord:Function
    ) {}

    @routeMap("/p/:id")
    async showIndex(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            this.universeWebService.setStartDate(routeTo?.query?.startDate, routeTo)
            this.universeWebService.setRank(routeTo?.query?.rank || 1)

            let playerId = routeTo?.params?.id

            let player
            let authInfo

            if (playerId) {
                player = await this.playerWebService.get(playerId, this.universeWebService.getStartDate())
                authInfo = await this.loginWebService.getAuthInfo()
            }

            

            return {
                player: player,
                authInfo: authInfo,
                discord: this.discord
            }

        }, PlayerIndexComponent)

    }



    @routeMap("/players/")
    async showList(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            this.universeWebService.setStartDate(routeTo?.query?.startDate, routeTo)

            let rank = routeTo?.query?.rank || 0

            if (rank > 0) {
                this.universeWebService.setRank(routeTo?.query?.rank)
            } 

            let allPlayers = []

            allPlayers.length = 0
            let result = await this.playerWebService.getPlayers(this.universeWebService.getStartDate(), rank)

            allPlayers.push(...result)
            

            return {
                discord: this.discord,
                allPlayers: allPlayers,
                rank: rank
            }

        }, PlayersListComponent)

    }



}

export { PlayerController }
