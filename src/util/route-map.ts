function routeMap(value: string, routeOptions?:any) {

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!globalThis.mappedRoutes) globalThis.mappedRoutes = []

        globalThis.mappedRoutes.push({
            path: value,
            controllerClass: target.constructor,
            action: propertyKey,
            routeOptions: routeOptions

        })
    }
}

export {
    routeMap
}