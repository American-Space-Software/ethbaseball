import { inject, injectable } from "inversify";


import { PostRepository } from "../../repository/post-repository.js";
import { Post } from "../../dto/post.js";


@injectable()
class PostService {


    @inject("PostRepository")
    private postRepository:PostRepository

    constructor(
    ) {}

    async get(_id:string, options?:any) {
        return this.postRepository.get(_id, options)
    }

    async put(post:Post, options?:any) {
        return this.postRepository.put(post, options)
    }

    async getFeatured(options?:any) {
        return this.postRepository.getFeatured(options)
    }




}




export {
    PostService
}