import { inject, injectable } from 'inversify';

import UserActivityComponent from '../components/user/activity.f7.html'
import UserOwnersComponent from '../components/user/owners.f7.html'
// import UserOwnersComponent from '../components/user/owners.f7.html'

import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';

@injectable()
class UserController {

    constructor(
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
        
        return new ModelView(async () => {
            return {
                discord: this.discord
            }
        }, UserActivityComponent)

    }


}

export { UserController }
