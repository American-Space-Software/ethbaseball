import {  injectable } from "inversify"

import { ImageRepository } from "../image-repository.js"
import { Image } from "../../dto/image.js"


@injectable()
class ImageRepositoryNodeImpl implements ImageRepository {

    async get(id:string, options?:any): Promise<Image> {
        return Image.findByPk(id, options)
    }

    async put(image:Image, options?:any): Promise<Image> {

        await image.save(options)
        return image

    }

}



export {
    ImageRepositoryNodeImpl
}