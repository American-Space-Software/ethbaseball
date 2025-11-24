import { inject, injectable } from "inversify";
import { StatService } from "../../service/stat-service.js";

import { io } from "socket.io-client";


@injectable()
class SocketWebService {
    
    private _socket

    constructor(
        @inject('env') private env:any
    ) { 

        this.socket.on("connect", () => {
            console.log("HERE")
        })

    }


    public get socket() {

        if (!this._socket) {
            this._socket = io(this.env().WEB_SOCKET)
        }
            
        return this._socket
    }




}




export {
    SocketWebService
}