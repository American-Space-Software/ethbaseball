import { ModelView } from "../util/model-view.js";
import { injectable, inject, Container } from "inversify";
import { Router } from "framework7";
import { UiService } from "../../service/ui-service.js";
import { container } from "../inversify.config.js"
import FooterContentTemplate from "../components/common/footer-content.f7.html"


@injectable()
class RoutingService {

    constructor(
        private uiService:UiService,
        @inject("framework7") public app,
     ) {}


    public navigate(navigateParams:Router.NavigateParameters, routeOptions?: Router.RouteOptions, viewName:string='main') {

        console.log(`${viewName}: navigating to ${navigateParams.path}`)

        if (!routeOptions) routeOptions = {
            reloadCurrent: true,
            ignoreCache: false,
            browserHistory: true
        }

        let view = this.app.view[viewName]

        if (view) {
            view.router.navigate( navigateParams, routeOptions)
        } else {
            console.log(`Could not find view ${viewName}`)
        }

    }

    public navigateUrl(url:string, routeOptions?:Router.RouteOptions, viewName:string='main') {

        console.log(`${viewName}: navigating to ${url}`)

        let view = this.app.view[viewName]

        if (view) {
            view.router.navigate( url, routeOptions)
        } else {
            console.log(`Could not find view ${viewName}`)
        }

    }

    public buildRoutesForContainer(container:Container) : Router.RouteParameters[]  {

        let routes:Router.RouteParameters[] = []

        //Look up requestMappings 
        for (let mappedRoute of globalThis.mappedRoutes) {

            //Look up matching bean
            let controllerBean = container.get(mappedRoute.controllerClass)

            let route

            if (mappedRoute.routeOptions) {

                route = Object.assign({
                    path: mappedRoute.path,
                }, mappedRoute.routeOptions)

            } else {

                route = {
                    path: mappedRoute.path,
                    name: mappedRoute.path,
                    async: async (ctx: Router.RouteCallbackCtx) => {
                        try {
                            this.app.preloader.show()
                            await this.resolveRoute(ctx.to, ctx.resolve, controllerBean[mappedRoute.action]())
                            this.app.preloader.hide()
                        } catch (ex) {
                            this.uiService.showExceptionPopup(ex)
                        }
                    }
                }

            }

            routes.push(route )
        }


        //Needs to be last
        routes.push({
            path: '(.*)',
            // url: 'pages/404.html',
            async async(ctx: Router.RouteCallbackCtx) {
                // this.uiService.showPopup("Page was not found")
                console.log(`404 error: ${ctx.to.path}`)
            }
        })

        return routes

    }

    public async resolveRoute(routeTo, resolve, controller_promise: Promise<ModelView>) {

        let modelView: ModelView = await controller_promise;
        if (!modelView) return

        let model:Function = await modelView.model
        let modelResult:any = await model(routeTo)


        //Attach container to props.
        let props = Object.assign({}, modelResult)
        props.container = container

        if (modelView.view) {
            
            //Load the new component if it's given to us. 
            resolve({
                component: modelView.view
            },Object.assign({ props: props }, routingOptions))    

        } 

    }

    public getFooterRoutes(footerRoutes) {

        let routes = []

        for (let r of footerRoutes.filter( r => r.link.startsWith("/"))) {

            routes.push({
                path: r.link,
                name: r.link,
                async: async (ctx) => {
                    try {

                        ctx.resolve(
                            {
                            component: FooterContentTemplate
                            }, Object.assign({ props: r}, routingOptions)
                            
                        )  

                    } catch (ex) {}
                }
            })
        }

        return routes
    }

}

interface RouteTo {
    context: any 
    params: any 
    url: string 
    path: string 
    query: any 
    name: string 
    hash: string 
    route: any 

}


interface Route {
    path: string 
    method: string 
}


const routingOptions = {
    history: true,
    browserHistory: true,
}


export {
    RoutingService, Route, RouteTo
}
