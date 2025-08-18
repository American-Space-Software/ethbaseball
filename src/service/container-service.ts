
import { container } from "../web/inversify.config.js"

class ContainerService {

    static getInstance(clazz) {
        
        return container.get(clazz)
    }

    static getContainer() {
        return container
    }

}

export {
    ContainerService
}