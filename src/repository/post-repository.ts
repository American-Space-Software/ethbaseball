import { Post } from "../dto/post.js"

interface PostRepository {
    get(id:string, options?:any): Promise<Post>
    put(image:Post, options?:any) : Promise<Post>
    getFeatured(options?:any) : Promise<Post>
}

export {
    PostRepository
}
