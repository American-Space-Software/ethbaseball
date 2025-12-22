import { inject, injectable } from "inversify";

import { Server } from "socket.io"
import { Game } from "../dto/game.js";
import { GameService } from "./data/game-service.js";

@injectable()
class SocketService {

    private _gameNamespace

    constructor(
        private gameService:GameService
    ) {}

    init(server, sessionMiddleware) {

        const io = new Server(server, {
            maxHttpBufferSize: 10 * 1024 * 1024, // allow up to 10 MB messages
            perMessageDeflate: { threshold: 1024 },
        })


        io.engine.use(sessionMiddleware)

        this._gameNamespace = io.of("/game")

        this._gameNamespace.on('connection', (socket) => {

            socket.on("watch-game", async (_id: string) => {
                
                socket.join(`game-${_id}`)

                const game = await this.gameService.get(_id)
                socket.emit("game", game) // send immediately on (re)watch
            })

            socket.on("unwatch-game", (_id: string) => {
                socket.leave(`game-${_id}`)
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