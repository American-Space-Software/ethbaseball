import { Animation } from "../dto/animation.js"

interface AnimationRepository {
    get(id:string, options?:any): Promise<Animation>
    put(animation:Animation, options?:any) : Promise<Animation>
}

export {
    AnimationRepository
}
