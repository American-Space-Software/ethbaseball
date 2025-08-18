import { User } from "../dto/user.js"

interface UserRepository {
    get(id:string, options?:any): Promise<User>
    put(user:User, options?:any) : Promise<void> 
    getByAddress(address:string, options?:any): Promise<User>
    delete(user:User, options?:any): Promise<void>
}

export {
    UserRepository
}
