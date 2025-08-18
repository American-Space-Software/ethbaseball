import { Image } from "../dto/image.js"

interface ImageRepository {
    get(id:string, options?:any): Promise<Image>
    put(image:Image, options?:any) : Promise<Image>
}

export {
    ImageRepository
}
