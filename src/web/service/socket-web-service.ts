import { inject, injectable } from "inversify";
import { StatService } from "../../service/stat-service.js";

import { io } from "socket.io-client";


@injectable()
class SocketWebService {
    
    private _gameSocket

    constructor(
        @inject('env') private env:any
    ) { 

        // this.gameSocket.on("connect", () => {})

    }


    public get gameSocket() {

        if (!this._gameSocket) {
            this._gameSocket = io(`${this.env().WEB_SOCKET}/game`, {})
        }
            
        return this._gameSocket
    }



}




export {
    SocketWebService
}