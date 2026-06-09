import { inject, injectable } from 'inversify';

import IndexComponent from '../components/offer/index.f7.html'
import UserListingsComponent from '../components/offer/user.f7.html'


import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';
import { LoginWebService } from '../service/login-web-service.js';

import { OfferWebService } from '../service/offer-web-service.js';
import { RouteParameters } from '../service/routing-service.js';


@injectable()
class OfferController {

    constructor(
        private loginWebService:LoginWebService,
        private offerWebService:OfferWebService,
        @inject("framework7") public app:any
    ) {}

    @routeMap("/offers")
    async showOffers(): Promise<ModelView> {
          
        return new ModelView(async (routeParams:RouteParameters) => {

            let offers = await this.offerWebService.getOffers()

            return {
                offers: offers
            }

        }, IndexComponent)

    }

    @routeMap("/offers/user")
    async showListings(): Promise<ModelView> {
        
        let authInfo = await this.loginWebService.getAuthInfo(true)
  
        if (!authInfo?._id) {
            this.app.views.main.router.navigate("/", { reloadCurrent: true })
            return
        }


        return new ModelView(async (routeParams:RouteParameters) => {

            let offers = await this.offerWebService.getUserOffers()

            return {
                offers: offers,
                authInfo: authInfo,
            }

        }, UserListingsComponent)

    }

}

export { OfferController }
