import { inject, injectable } from "inversify";

import { Server } from "socket.io"
import { Game } from "../dto/game.js";

@injectable()
class SocketService {

    private _gameNamespace

    constructor() {}

    init(server, sessionMiddleware) {

        const io = new Server(server, {
            maxHttpBufferSize: 10 * 1024 * 1024, // allow up to 10 MB messages
            perMessageDeflate: { threshold: 1024 },
        })



        io.engine.use(sessionMiddleware)

        this._gameNamespace = io.of("/game")

        this._gameNamespace.on('connection', (socket) => {

            socket.on("watch-game", (gid: string, ack?: (resp: any) => void) => {
                const room = `game-${gid}`
                socket.join(room)
            })

            
            socket.on("watch-game", (arg) => {
                socket.join(`game-${arg}`)
            })

            socket.on("unwatch-game", (arg) => {
                socket.leave(`game-${arg}`)
            })

        })



    }

    gameUpdate(game:Game) {

        const room = `game-${game._id}`

        // // how many listeners?
        // const sz = this._gameNamespace.adapter.rooms.get(room)?.size ?? 0

        // // approximate payload bytes (JSON over ws)
        // const bytes = Buffer.byteLength(JSON.stringify(game))

        // console.log("[emit] game", { room, listeners: sz, bytes })

        this._gameNamespace.to(room).emit("game", game)


    }

}



export {
    SocketService
}