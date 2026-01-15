import "core-js/stable"
import "regenerator-runtime/runtime"
import "reflect-metadata"


import { getContainer } from "./inversify.config.js"


//Import CSS
import 'framework7/css/bundle'
import 'framework7-icons/css/framework7-icons.css'
import './html/css/app.css'



import { RoutingService } from "./service/routing-service.js"
import {Workbox} from 'workbox-window'

export class GlobalEventTarget extends EventTarget {}

export default async (env, footerRoutes) => {

    let container = await getContainer(env, footerRoutes)

    let baseURI = '/'

    const wb = new Workbox(`${env.WEB}${baseURI}sw-${env.BUILD_ID}.js?baseURI=${baseURI}`, {
        scope: `${env.WEB}${baseURI}`
    })


    let app:any = container.get("framework7")
    let routingService:RoutingService = container.get(RoutingService)

    //Initialize routing
    app.routes = routingService.getFooterRoutes(footerRoutes)
    app.routes = app.routes.concat(routingService.buildRoutesForContainer(container))

    
    // if (navigator.serviceWorker.controller) {
    //     app.init()
    // } else {
    //     wb.addEventListener('controlling', e => {
    //         app.init()
    //     })
    // }

    wb.register()


}
