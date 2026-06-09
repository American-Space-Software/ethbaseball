import { inject, injectable } from "inversify";

import { Server } from "socket.io"
import { Game } from "../dto/game.js";
import { GameService } from "./data/game-service.js";

@injectable()
class SocketService {

    private _gameNamespace
    private _queueNamespace

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



        this._queueNamespace = io.of("/queue")

        this._queueNamespace.on("connection", (socket) => {

            socket.on("watch-queue", async () => {

                const userId = socket.request.session?.passport?.user

                if (!userId) {
                    socket.disconnect()
                    return
                }

                socket.join(`queue-user-${userId}`)
            })

            socket.on("unwatch-queue", () => {

                const userId = socket.request.session?.passport?.user

                if (userId) {
                    socket.leave(`queue-user-${userId}`)
                }

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


    queueGameStarted(userIds: string[], game: Game) {

        for (const userId of userIds) {

            const room = `queue-user-${userId}`

            this._queueNamespace.to(room).emit("queue-game-started", {
                gameId: game._id
            })

            this._queueNamespace.in(room).socketsLeave(room)

        }

    }


}



export {
    SocketService
}