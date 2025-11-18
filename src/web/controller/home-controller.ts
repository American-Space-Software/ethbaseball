import { inject, injectable } from 'inversify';

import HomeComponent from '../components/home/home.f7.html'
import HomeLoggedInComponent from '../components/home/home-logged-in.f7.html'

import ConnectComponent from '../components/connect.f7.html'
import DraftComponent from '../components/draft.f7.html'
import AboutComponent from '../components/about.f7.html'

import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';
import { UniverseWebService } from '../service/universe-web-service.js';
import { WalletService } from '../../service/wallet-service.js';
import { LoginWebService } from '../service/login-web-service.js';



@injectable()
class HomeController {

    constructor(
        @inject("getFees") private fees:Function,
        @inject("discord") private discord:string,
        @inject("env") private env,
        @inject("eventTarget") private eventTarget,
        private universeWebService:UniverseWebService,
        private loginWebService:LoginWebService,
        @inject("WalletService") private walletService:WalletService
    ) {}

    @routeMap("/")
    async showIndex(): Promise<ModelView> {
        
        let authInfo = await this.loginWebService.getAuthInfo()

        let component = HomeComponent

        if (authInfo?._id) {
            component = HomeLoggedInComponent
        }

        return new ModelView(async (routeTo) => {

            this.universeWebService.setStartDate(routeTo?.query?.startDate, routeTo)

            let vm = await this.universeWebService.getHome(this.universeWebService.getStartDate())

            let contractBalance

            let walletAddresses = await this.walletService.getAddress()
            
            if (this.walletService.provider && walletAddresses) {
                contractBalance = await this.universeWebService.getContractBalance()
            }

            return {
                contractBalance: contractBalance,
                authInfo: authInfo,
                vm: vm,
                discord: this.discord
            }

        }, component)

    }


    @routeMap("/connect")
    async showConnectStarted(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, ConnectComponent)

    }


    @routeMap("/draft")
    async showDraft(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord,
                fees: this.fees()
            }
        }, DraftComponent)

    }

    @routeMap("/about")
    async showAbout(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord,
            }
        }, AboutComponent)

    }




}

export { HomeController }
