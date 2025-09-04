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

            let breadcrumbs:any[] = [{ text: 'Players', path: this.universeWebService.startDateLink("/players/") }]

            if (player.team?._id) {
                breadcrumbs.push({ text: `${player.team.cityName} ${player.team.name}`, path: this.universeWebService.startDateLink(`/t/${player.team.tokenId}`) })
            }

            breadcrumbs.push({ text: player.fullName })

            this.eventTarget.dispatchEvent(new CustomEvent('main-nav', {
                detail: { tabLink: "/players/", breadcrumbs: breadcrumbs }
            }))


            this.universeWebService.setMetadata(
                    `${player.fullName} - Ethereum Baseball League`, 
                    window.location.href, 
                    `${this.env().WEB}/player/image/${player._id}`, 
                    `View ${player.fullName} in Ethereum Baseball League.`
            ) 


            return {
                player: player,
                authInfo: authInfo,
                env: this.env(),
                discord: this.discord
            }

        }, PlayerIndexComponent)

    }



    @routeMap("/players/")
    async showList(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            this.universeWebService.setStartDate(routeTo?.query?.startDate, routeTo)

            let rank = routeTo?.query?.rank

            if (rank > 0) {
                this.universeWebService.setRank(routeTo?.query?.rank)
            } 

            let allPlayers = []

            allPlayers.length = 0
            let result = await this.playerWebService.getPlayers(this.universeWebService.getStartDate(), rank)

            allPlayers.push(...result)
            

            this.eventTarget.dispatchEvent(new CustomEvent('main-nav', {
                detail: { tabLink: "/players/", breadcrumbs:[{ text: "Players" }] }
            }))


            this.universeWebService.setMetadata(
                    `Players - Ethereum Baseball League`, 
                    window.location.href, 
                    `${this.env().WEB}/ebl-512.png`,
                    `View players in Ethereum Baseball League.`
            ) 

            return {
                discord: this.discord,
                allPlayers: allPlayers,
                rank: rank
            }

        }, PlayersListComponent)

    }



}

export { PlayerController }
