import { inject, injectable } from 'inversify';

import OnchainActivityComponent from '../components/activity/onchain-activity.f7.html'
import OffchainActivityComponent from '../components/activity/offchain-activity.f7.html'
import GameTransactionActivityComponent from '../components/activity/game-transaction-activity.f7.html'



import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';


@injectable()
class ActivityController {

    constructor(
        @inject("discord") private discord:Function
    ) {}

    @routeMap("/activity")
    async showOnChain(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
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
        
        return new ModelView(async () => {
            return {
                discord: this.discord,
            }
        }, GameTransactionActivityComponent)

    }


}

export { ActivityController }
