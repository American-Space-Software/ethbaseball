import "core-js/stable"
import "regenerator-runtime/runtime"
import "reflect-metadata"


import { getContainer } from "./inversify.config.js"


//Import CSS
import 'framework7/css/bundle'
import 'framework7-icons/css/framework7-icons.css'
import './html/css/app.css'

import { RoutingService } from "../service/routing-service.js"

export class GlobalEventTarget extends EventTarget {}

export default async () => {


    let container = await getContainer()

    let app:any = container.get("framework7")

    let routingService:RoutingService = container.get(RoutingService)

    //Initialize routing
    app.routes = routingService.buildRoutesForContainer(container)
   
}
