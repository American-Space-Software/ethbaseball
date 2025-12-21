import { inject, injectable } from "inversify"
import { io, Socket } from "socket.io-client"

@injectable()
class SocketWebService {

  private _gameSocket: Socket | null = null
  private watched = new Set<string>()

  constructor(
    @inject("env") private env: any
  ) {}

  public get gameSocket(): Socket {
    if (this._gameSocket) return this._gameSocket

    const s = io(`${this.env().WEB_SOCKET}/game`, {
      path: "/socket.io",
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 100,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"]
    })

    this._gameSocket = s

    const rejoin = () => {
      for (const gid of this.watched) {
        s.emit("watch-game", gid)
      }
    }

    s.on("connect", () => {
      console.log("[socket] connected", s.id)
      rejoin()
    })

    s.on("disconnect", (why) => {
      console.log("[socket] disconnect", why)
    })

    s.on("connect_error", (err) => {
      console.warn("[socket] connect_error", err?.message ?? err)
    })

    s.io.engine.on("upgrade", () => {
      console.log("[socket] upgraded to", s.io.engine.transport.name)
    })

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        if (!s.connected) s.connect()
        rejoin()
      }
    })

    return s
  }

  public watch(_id: string) {
    this.watched.add(_id)
    if (this.gameSocket.connected) {
      this.gameSocket.emit("watch-game", _id)
    }
  }

  public unwatch(_id: string) {
    this.watched.delete(_id)
    if (this.gameSocket.connected) {
      this.gameSocket.emit("unwatch-game", _id)
    }
  }
}

export {
  SocketWebService
}
