import { inject, injectable } from 'inversify';

// import TeamCreateComponent from '../components/team/create.f7.html'
// import TeamMintComponent from '../components/team/mint.f7.html'

import TeamIndexComponent from '../components/team/index.f7.html'

import TeamOffChainActivityComponent from '../components/team/offchain-activity.f7.html'
import TeamOnChainActivityComponent from '../components/team/onchain-activity.f7.html'



import TeamResultsComponent from '../components/team/results.f7.html'



import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';
import { LoginWebService } from '../service/login-web-service.js';
import { UniverseWebService } from '../service/universe-web-service.js';
import { TeamComponentService } from '../service/team-component-service.js';
import { TeamWebService } from '../service/team-web-service.js';
import { GameTransactionWebService } from '../service/game-transaction-web-service.js';
import dayjs from 'dayjs';



@injectable()
class TeamController {

    constructor(
        private gameTransactionWebService:GameTransactionWebService,
        private teamWebService:TeamWebService,
        private teamComponentService:TeamComponentService,
        private universeWebService: UniverseWebService,
        private loginWebService:LoginWebService,
        @inject("discord") private discord:Function,
        @inject("env") private env,
        @inject("eventTarget") private eventTarget
    ) {}



    @routeMap("/t/index/:teamId")
    async showIndex(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let authInfo = await this.loginWebService.getAuthInfo()

            let startDate = routeTo?.query?.startDate
            let teamId = routeTo?.params?.teamId

            this.universeWebService.setStartDate(startDate, routeTo)

            let team = await this.teamComponentService.loadTeam(teamId, this.universeWebService.getStartDate(), { forceRefresh: true })

            this.universeWebService.setRank(team.leagueRank)

            return {
                tokenId: team.tokenId,
                team: team,
                games: this.teamComponentService.games,
                authInfo: authInfo,
                discord: this.discord
            }
        }, TeamIndexComponent)

    }

    @routeMap("/t/results/:teamId")
    async showResults(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let startDate = routeTo?.query?.startDate
            let teamId = routeTo?.params?.teamId
            let date = routeTo?.query?.date

            this.universeWebService.setStartDate(startDate, routeTo)

            let team = await this.teamComponentService.loadTeam(teamId, this.universeWebService.getStartDate(), { forceRefresh: true })

            this.universeWebService.setRank(team.leagueRank)


            //If we're showing an old season use the startDate as the date
            if (!this.universeWebService.isCurrentSeason() && !date) {
                date = this.universeWebService.startDate
            }

            let gameLogs = await this.teamWebService.getGameLog(teamId, date)


            const todayMonth = dayjs.utc().startOf('month')

            const previousPage = true
            const nextPage = dayjs(date).isBefore(todayMonth, 'day')

            return {
                teamId: teamId,
                date: date,
                gameLogs: gameLogs,
                previousPage: previousPage,
                nextPage: nextPage,
                discord: this.discord
            }
        }, TeamResultsComponent)

    }


    @routeMap("/t/activity/on/:teamId")
    async showActivity(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let startDate = routeTo?.query?.startDate
            let teamId = routeTo?.params?.teamId
            let page = parseInt(routeTo?.query?.page || 1)

            this.universeWebService.setStartDate(startDate, routeTo)

            let team = await this.teamComponentService.loadTeam(teamId, this.universeWebService.getStartDate(), { forceRefresh: true })

            this.universeWebService.setRank(team.leagueRank)



            let onChainEvents = await this.gameTransactionWebService.getOnChainByTeam(teamId, page)

            let previousPage
            let nextPage

            if (page > 1) {
                previousPage = page - 1
            }

            if (onChainEvents?.transactions?.length == 25 ) {
                nextPage = page + 1
            }

            return {
                onChainEvents: onChainEvents,
                page: page,
                previousPage: previousPage,
                nextPage: nextPage, 
                teamId: teamId,
                discord: this.discord
            }

        }, TeamOnChainActivityComponent)

    }

    @routeMap("/t/activity/index/:teamId")
    async showOffchainActivity(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let startDate = routeTo?.query?.startDate
            let teamId = routeTo?.params?.teamId
            let page = parseInt(routeTo?.query?.page || 1)

            this.universeWebService.setStartDate(startDate, routeTo)

            let team = await this.teamComponentService.loadTeam(teamId, this.universeWebService.getStartDate(), { forceRefresh: true })

            this.universeWebService.setRank(team.leagueRank)

            let eventsViewModel = await this.gameTransactionWebService.getOffChainByTeam(teamId, page)
            let previousPage
            let nextPage

            if (page > 1) {
                previousPage = page - 1
            }

            if (eventsViewModel?.events?.length == 25 ) {
                nextPage = page + 1
            }


            return {
                teamId: teamId,
                eventsViewModel: eventsViewModel,
                page: page,
                previousPage: previousPage,
                nextpage: nextPage,
                discord: this.discord
            }
        }, TeamOffChainActivityComponent)

    }



    // @routeMap("/t/mint/:tokenId")
    // async showMint(): Promise<ModelView> {
        
    //     return new ModelView(async () => {
    //         return {
    //             discord: this.discord
    //         }
    //     }, TeamMintComponent)

    // }

    // @routeMap("/t/create/index")
    // async showCreate(): Promise<ModelView> {
        
    //     return new ModelView(async () => {

    //         return {
    //             discord: this.discord
    //         }
    //     }, TeamCreateComponent)

    // }


}

export { TeamController }
