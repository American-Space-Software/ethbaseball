import {  injectable } from "inversify"

import { AnimationRepository } from "../animation-repository.js"
import { Animation } from "../../dto/animation.js"


@injectable()
class AnimationRepositoryNodeImpl implements AnimationRepository {


    async get(id:string, options?:any): Promise<Animation> {
        return Animation.findByPk(id, options)
    }

    async put(animation:Animation, options?:any): Promise<Animation> {

        await animation.save(options)
        return animation

    }

}



export {
    AnimationRepositoryNodeImpl
}