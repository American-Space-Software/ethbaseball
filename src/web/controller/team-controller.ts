import { inject, injectable } from 'inversify';

import TeamMintComponent from '../components/team/mint.f7.html'
import TeamIndexComponent from '../components/team/index.f7.html'

import TeamGameTransactionActivityComponent from '../components/team/game-transaction-activity.f7.html'
import TeamOffChainActivityComponent from '../components/team/offchain-activity.f7.html'
import TeamOnChainActivityComponent from '../components/team/onchain-activity.f7.html'



import TeamScheduleComponent from '../components/team/schedule.f7.html'



import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';
import { LoginWebService } from '../service/login-web-service.js';
import { UniverseWebService } from '../service/universe-web-service.js';
import { TeamComponentService } from '../service/team-component-service.js';
import { TeamWebService } from '../service/team-web-service.js';
import { GameTransactionWebService } from '../service/game-transaction-web-service.js';



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



    @routeMap("/t/:tokenId")
    async showIndex(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let authInfo = await this.loginWebService.getAuthInfo()

            let startDate = routeTo?.query?.startDate
            let tokenId = routeTo?.params?.tokenId

            this.universeWebService.setStartDate(startDate, routeTo)

            let team = await this.teamComponentService.loadTeam(tokenId, this.universeWebService.getStartDate(), { forceRefresh: true })

            this.universeWebService.setRank(team.leagueRank)


            this.eventTarget.dispatchEvent(new CustomEvent('main-nav', {
                detail: {
                tabLink: "/l/standings", breadcrumbs: [
                    {
                    text: "Standings",
                    path: this.universeWebService.startDateLink(`/l/standings/${this.teamComponentService.team?.leagueRank}`)
                    }, { text: this.teamWebService.getTeamName(this.teamComponentService.team) }]
                }
            }))


            this.universeWebService.setMetadata(
                `${team.city.name} ${team.name} - Ethereum Baseball League`, 
                window.location.href, 
                `${this.env().WEB}/image/thumbnail/1024/${this.teamComponentService.team.logoId}`, 
                `${this.teamComponentService.team.city.name} ${this.teamComponentService.team.name} is a franchise in Ethereum Baseball League.`
            ) 

            return {
                tokenId: team.tokenId,
                team: team,
                games: this.teamComponentService.games,
                authInfo: authInfo,
                env: this.env(),
                discord: this.discord
            }
        }, TeamIndexComponent)

    }

    @routeMap("/t/schedule/:tokenId")
    async showSchedule(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let startDate = routeTo?.query?.startDate
            let tokenId = routeTo?.params?.tokenId
            let date = routeTo?.query?.date

            this.universeWebService.setStartDate(startDate, routeTo)

            let team = await this.teamComponentService.loadTeam(tokenId, this.universeWebService.getStartDate(), { forceRefresh: true })

            this.universeWebService.setRank(team.leagueRank)


            //If we're showing an old season use the startDate as the date
            if (!this.universeWebService.isCurrentSeason() && !date) {
                date = this.universeWebService.startDate
            }

            let gameLogs = await this.teamWebService.getGameLog(tokenId, date)

            this.eventTarget.dispatchEvent(new CustomEvent('main-nav', {
                detail: {
                tabLink: "/l/standings", breadcrumbs: [
                    {
                    text: "Standings",
                    path: this.universeWebService.startDateLink(`/l/standings/${team.leagueRank}`)
                    }, 
                    { 
                        text: this.teamWebService.getTeamName(team), 
                        path: this.universeWebService.startDateLink(`/t/${team.tokenId}`) 
                    }, { text: 'Schedule'}]
                }
            }))

            this.universeWebService.setMetadata(
                    `${team.city.name} ${team.name} Schedule - Ethereum Baseball League`, 
                    window.location.href, 
                    `${this.env().WEB}/image/thumbnail/1024/${this.teamComponentService.team.logoId}`, 
                    `View the schedule for ${this.teamComponentService.team.city.name} ${this.teamComponentService.team.name} in Ethereum Baseball League.`
            ) 


            return {
                tokenId: tokenId,
                date: date,
                gameLogs: gameLogs,
                discord: this.discord
            }
        }, TeamScheduleComponent)

    }


    @routeMap("/t/activity/:tokenId")
    async showActivity(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let startDate = routeTo?.query?.startDate
            let tokenId = routeTo?.params?.tokenId
            let page = parseInt(routeTo?.query?.page || 1)

            this.universeWebService.setStartDate(startDate, routeTo)

            let team = await this.teamComponentService.loadTeam(tokenId, this.universeWebService.getStartDate(), { forceRefresh: true })

            this.universeWebService.setRank(team.leagueRank)



            let onChainEvents = await this.gameTransactionWebService.getOnChainByTeam(tokenId, page)

            let previousPage
            let nextPage

            if (page > 1) {
                previousPage = page - 1
            }

            if (onChainEvents?.transactions?.length == 25 ) {
                nextPage = page + 1
            }


            this.eventTarget.dispatchEvent(new CustomEvent('main-nav', {
                detail: {
                    tabLink: "/l/standings", 
                    breadcrumbs: [
                        {
                            text: "Standings",
                            path: this.universeWebService.startDateLink(`/l/standings/${team.leagueRank}`)
                        }, 
                        { 
                            text: this.teamWebService.getTeamName(team), 
                            path: this.universeWebService.startDateLink(`/t/${team.tokenId}`) 
                        }, { text: 'Activity'}
                    ]
                }
            }))


            this.universeWebService.setMetadata(
                `${team.city.name} ${team.name} Activity - Ethereum Baseball League`, 
                window.location.href, 
                `${this.env().WEB}/image/thumbnail/1024/${this.teamComponentService.team.logoId}`, 
                `View the activity for ${this.teamComponentService.team.city.name} ${this.teamComponentService.team.name} in Ethereum Baseball League.`
            ) 


            return {
                onChainEvents: onChainEvents,
                page: page,
                previousPage: previousPage,
                nextPage: nextPage, 
                tokenId: tokenId,
                discord: this.discord
            }

        }, TeamOnChainActivityComponent)

    }

    @routeMap("/t/activity/off/:tokenId")
    async showOffchainActivity(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let startDate = routeTo?.query?.startDate
            let tokenId = routeTo?.params?.tokenId
            let page = parseInt(routeTo?.query?.page || 1)

            this.universeWebService.setStartDate(startDate, routeTo)

            let team = await this.teamComponentService.loadTeam(tokenId, this.universeWebService.getStartDate(), { forceRefresh: true })

            this.universeWebService.setRank(team.leagueRank)

            let eventsViewModel = await this.gameTransactionWebService.getOffChainByTeam(tokenId, page)
            let previousPage
            let nextPage

            if (page > 1) {
                previousPage = page - 1
            }

            if (eventsViewModel?.events?.length == 25 ) {
                nextPage = page + 1
            }


            this.eventTarget.dispatchEvent(new CustomEvent('main-nav', {
                detail: {
                tabLink: "/l/standings", breadcrumbs: [
                    {
                    text: "Standings",
                    path: this.universeWebService.startDateLink(`/l/standings/${team.leagueRank}`)
                    }, 
                    { 
                        text: this.teamWebService.getTeamName(team), 
                        path: this.universeWebService.startDateLink(`/t/${team.tokenId}`) 
                    }, { text: 'Activity'}]
                }
            }))


            this.universeWebService.setMetadata(
                    `${team.city.name} ${team.name} Activity - Ethereum Baseball League`, 
                    window.location.href, 
                    `${this.env().WEB}/image/thumbnail/1024/${this.teamComponentService.team.logoId}`, 
                    `View the activity for ${this.teamComponentService.team.city.name} ${this.teamComponentService.team.name} in Ethereum Baseball League.`
            ) 


            return {
                tokenId: tokenId,
                eventsViewModel: eventsViewModel,
                page: page,
                previousPage: previousPage,
                nextpage: nextPage,
                discord: this.discord
            }
        }, TeamOffChainActivityComponent)

    }

    @routeMap("/t/activity/game/:tokenId")
    async showOnchainActivity(): Promise<ModelView> {
        
        return new ModelView(async (routeTo) => {

            let startDate = routeTo?.query?.startDate
            let tokenId = routeTo?.params?.tokenId
            let page = parseInt(routeTo?.query?.page || 1)

            this.universeWebService.setStartDate(startDate, routeTo)

            let team = await this.teamComponentService.loadTeam(tokenId, this.universeWebService.getStartDate(), { forceRefresh: true })

            this.universeWebService.setRank(team.leagueRank)

            let model = await this.gameTransactionWebService.latestByTeamSeason(tokenId, this.universeWebService.getStartDate(), page)

            let previousPage
            let nextPage

            if (page > 1) {
                previousPage = page - 1
            }

            if (model?.transactions?.length == 25 ) {
                nextPage = page + 1
            }


            this.eventTarget.dispatchEvent(new CustomEvent('main-nav', {
                detail: {
                tabLink: "/l/standings", breadcrumbs: [
                    {
                    text: "Standings",
                    path: this.universeWebService.startDateLink(`/l/standings/${team.leagueRank}`)
                    }, 
                    { 
                        text: this.teamWebService.getTeamName(team), 
                        path: this.universeWebService.startDateLink(`/t/${team.tokenId}`) 
                    }, { text: 'Activity'}]
                }
            }))


            this.universeWebService.setMetadata(
                    `${team.city.name} ${team.name} Activity - Ethereum Baseball League`, 
                    window.location.href, 
                    `${this.env().WEB}/image/thumbnail/1024/${this.teamComponentService.team.logoId}`, 
                    `View the activity for ${this.teamComponentService.team.city.name} ${this.teamComponentService.team.name} in Ethereum Baseball League.`
            ) 


            return {
                model: model,
                tokenId: tokenId,
                page: page,
                previousPage: previousPage,
                nextPage: nextPage,
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
