import {  injectable } from "inversify"

import { PostRepository } from "../post-repository.js"
import { Post } from "../../dto/post.js"



@injectable()
class PostRepositoryNodeImpl implements PostRepository {

    async get(id:string, options?:any): Promise<Post> {
        return Post.findByPk(id, options)
    }

    async put(post:Post, options?:any): Promise<Post> {

        await post.save(options)
        return post

    }

    async getFeatured(options?:any): Promise<Post> {

        let queryOptions = {
            where: {
                isFeatured: true,
                // publishDate: {
                //     [Op.gte]: dayjs().toDate()
                // }

            },
            order: [
                ['publishDate', 'desc']
            ],
            offset: 0,
            limit: 1
        }

        return Post.findOne(Object.assign(queryOptions, options))

    }

}



export {
    PostRepositoryNodeImpl
}