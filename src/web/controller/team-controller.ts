import { inject, injectable } from 'inversify';

import TeamMintComponent from '../components/team/mint.f7.html'
import TeamIndexComponent from '../components/team/index.f7.html'

import TeamGameTransactionActivityComponent from '../components/team/game-transaction-activity.f7.html'
import TeamOffChainActivityComponent from '../components/team/offchain-activity.f7.html'
import TeamOnChainActivityComponent from '../components/team/onchain-activity.f7.html'



import TeamScheduleComponent from '../components/team/schedule.f7.html'



import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';



@injectable()
class TeamController {

    constructor(
        @inject("discord") private discord:Function
    ) {}



    @routeMap("/t/:tokenId")
    async showIndex(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, TeamIndexComponent)

    }

    @routeMap("/t/schedule/:tokenId")
    async showSchedule(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, TeamScheduleComponent)

    }


    @routeMap("/t/activity/:tokenId")
    async showActivity(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, TeamOnChainActivityComponent)

    }

    @routeMap("/t/activity/off/:tokenId")
    async showOffchainActivity(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, TeamOffChainActivityComponent)

    }

    @routeMap("/t/activity/game/:tokenId")
    async showOnchainActivity(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, TeamGameTransactionActivityComponent)

    }




    @routeMap("/t/mint/:tokenId")
    async showCreate(): Promise<ModelView> {
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, TeamMintComponent)

    }




}

export { TeamController }
