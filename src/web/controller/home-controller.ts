import { inject, injectable } from 'inversify';

import HomeComponent from '../components/home/home.f7.html'
import HomeLoggedInComponent from '../components/home/home-logged-in.f7.html'

import ConnectComponent from '../components/connect.f7.html'
import AboutComponent from '../components/about.f7.html'

import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';
import { UniverseWebService } from '../service/universe-web-service.js';
import { WalletService } from '../../service/wallet-service.js';
import { LoginWebService } from '../service/login-web-service.js';
import { GameWebService } from '../service/game-web-service.js';

import { TeamComponentService } from '../service/team-component-service.js';


@injectable()
class HomeController {

    constructor(
        @inject("discord") private discord:string,
        private universeWebService:UniverseWebService,
        private loginWebService:LoginWebService,
        private gameWebService:GameWebService,
        private teamComponentService:TeamComponentService,
        @inject("WalletService") private walletService:WalletService
    ) {}

    @routeMap("/")
    async showIndex(): Promise<ModelView> {
        
        let authInfo = await this.loginWebService.getAuthInfo()

        if (authInfo?._id) {

            return new ModelView(async (routeTo) => {

                this.universeWebService.setStartDate(routeTo?.query?.startDate, routeTo)

                let vm = await this.universeWebService.getHome(this.universeWebService.getStartDate())

                console.log(vm)

                let contractBalance

                let walletAddresses = await this.walletService.getAddress()
                
                if (this.walletService.provider && walletAddresses) {
                    contractBalance = await this.universeWebService.getContractBalance()
                }


                await this.teamComponentService.setLoadedTeam(vm.teamInfo, authInfo, this.universeWebService.getStartDate())


                return {
                    contractBalance: contractBalance,
                    authInfo: authInfo,
                    vm: vm,
                    discord: this.discord
                }

            }, HomeLoggedInComponent)

        }

        return new ModelView(async (routeTo) => {
            return {}
        }, HomeComponent)

    }


    @routeMap("/connect")
    async showConnectStarted(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, ConnectComponent)

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
