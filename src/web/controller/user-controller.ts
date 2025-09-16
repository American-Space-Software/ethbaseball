import { inject, injectable } from 'inversify';

import UserActivityComponent from '../components/user/activity.f7.html'
import UserOwnersComponent from '../components/user/owners.f7.html'
// import UserOwnersComponent from '../components/user/owners.f7.html'

import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';
import { GameTransactionWebService } from '../service/game-transaction-web-service.js';

@injectable()
class UserController {

    constructor(
        private gameTransactionWebService:GameTransactionWebService,
        @inject("discord") private discord:Function
    ) {}



    // @routeMap("/u/owners")
    // async showOwners(): Promise<ModelView> {
        
    //     return new ModelView(async () => {
    //         return {
    //             discord: this.discord
    //         }
    //     }, UserOwnersComponent)

    // }


    @routeMap("/u/owners")
    async showTeamOwners(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, UserOwnersComponent)

    }


    @routeMap("/u/activity")
    async showActivity(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let page = parseInt(routeTo?.query?.page || 1)
            let address = routeTo?.query?.address

            let model = await this.gameTransactionWebService.getByOwner(address, page)

            let previousPage
            let nextPage

            if (page > 1) {
                previousPage = page - 1
            }

            if (model.offChainEvents?.length == 25 || model.onChainEvents?.transactions?.length == 25 ) {
                nextPage = page + 1
            }


            return {
                page: page,
                address: address,
                model: model,
                previousPage: previousPage,
                nextPage: nextPage,
                discord: this.discord
            }
        }, UserActivityComponent)

    }


}

export { UserController }
