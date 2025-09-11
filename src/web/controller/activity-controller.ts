import { inject, injectable } from 'inversify';

import OnchainActivityComponent from '../components/activity/onchain-activity.f7.html'
import OffchainActivityComponent from '../components/activity/offchain-activity.f7.html'
import GameTransactionActivityComponent from '../components/activity/game-transaction-activity.f7.html'



import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';
import { UniverseWebService } from '../service/universe-web-service.js';
import { GameTransactionWebService } from '../service/game-transaction-web-service.js';


@injectable()
class ActivityController {

    constructor(
        @inject("discord") private discord:Function,
        @inject("env") private env,
        @inject("eventTarget") private eventTarget,
         private universeWebService:UniverseWebService,
         private gameTransactionWebService:GameTransactionWebService
    ) {}

    @routeMap("/activity")
    async showOnChain(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {


            let rank = routeTo?.query?.rank || 0

            if (rank > 0) {
                this.universeWebService.setRank(routeTo?.query?.rank)
            } 

            let page = parseInt(routeTo?.query?.page || 1)
            let previousPage
            let nextPage

            let onChainEvents = await this.gameTransactionWebService.getOnChain(page)


            if (page > 1) {
                previousPage = page - 1
            }

            if (onChainEvents?.length == 25 ) {
                nextPage = page + 1
            }


            return {
                rank:rank,
                page: page,
                previousPage: previousPage,
                nextPage: nextPage,
                onChainEvents: onChainEvents,
                discord: this.discord,
            }
        }, OnchainActivityComponent)

    }

    @routeMap("/activity/off")
    async showOffChain(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord,
            }
        }, OffchainActivityComponent)

    }


    @routeMap("/activity/game")
    async showGame(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {


                let rank = routeTo?.query?.rank || 0

                if (rank > 0) {
                    this.universeWebService.setRank(routeTo?.query?.rank)
                } 

                let page = parseInt(routeTo?.query?.page || 1)

                let model = await this.gameTransactionWebService.latest(page)

                let previousPage
                let nextPage

                if (page > 1) {
                    previousPage = page - 1
                }

                if (model.transactions?.length == 25 ) {
                    nextPage = page + 1
                }


            return {
                page: page,
                previousPage: previousPage,
                nextPage: nextPage,
                model: model,
                rank: rank,
                discord: this.discord,
            }
        }, GameTransactionActivityComponent)

    }


}

export { ActivityController }
