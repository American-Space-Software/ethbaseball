import { inject, injectable } from "inversify";

import { Server } from "socket.io"
import { GameViewModel } from "./data/game-service.js";
import { Game } from "../dto/game.js";

@injectable()
class SocketService {

    private _gameNamespace

    constructor() {}

    init(server, sessionMiddleware) {

        const io = new Server(server)

        io.engine.use(sessionMiddleware)

        this._gameNamespace = io.of("/game")

        this._gameNamespace.on('connection', function(socket) {

            //@ts-ignore
            // let userId = socket.request.session?.passport?.user

            socket.on("watch-game", (arg) => {
                socket.join(`game-${arg}`)
            })

            socket.on("unwatch-game", (arg) => {
                socket.leave(`game-${arg}`)
            })


        })

    }

    gameUpdate(game:Game) {
        this._gameNamespace.to(`game-${game._id}`).emit('game', game)
    }

}



export {
    SocketService
}