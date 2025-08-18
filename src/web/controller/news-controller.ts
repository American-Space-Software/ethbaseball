import { inject, injectable } from 'inversify';

import NewsComponent from '../components/news/index.f7.html'

import { ModelView } from '../../util/model-view.js';
import { routeMap } from '../../util/route-map.js';



@injectable()
class NewsController {

    constructor(
    ) {}

    @routeMap("/news")
    async showIndex(): Promise<ModelView> {
        
        return new ModelView(async () => {
        }, NewsComponent)

    }

}

export { NewsController }
