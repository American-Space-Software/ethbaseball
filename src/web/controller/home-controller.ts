import { inject, injectable } from 'inversify';

import HomeComponent from '../components/home/home.f7.html'
import ConnectComponent from '../components/connect.f7.html'
import DraftComponent from '../components/draft.f7.html'
import AboutComponent from '../components/about.f7.html'

import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';



@injectable()
class HomeController {

    constructor(
        @inject("getFees") private fees:Function,
        @inject("discord") private discord:string
    ) {}

    @routeMap("/")
    async showIndex(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
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
