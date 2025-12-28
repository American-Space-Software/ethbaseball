import { inject, injectable } from "inversify"
import { io, Socket } from "socket.io-client"

@injectable()
class SocketWebService {

  private _gameSocket: Socket | null = null
  private _watched = new Set<string>()
  private _instantNextUpdate = false

  constructor(
    @inject("env") private env: any
  ) {}

  public consumeInstantNextUpdate() {
    const v = this._instantNextUpdate
    this._instantNextUpdate = false
    return v
  }

  public get gameSocket(): Socket {

    if (this._gameSocket) return this._gameSocket

    const s = io(`${this.env().WEB_SOCKET}/game`, {
      path: "/socket.io",
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"]
    })

    this._gameSocket = s

    const rejoin = () => {
      for (const gid of this._watched) {
        s.emit("watch-game", gid)
      }
    }

    s.on("connect", () => {
      console.log("[socket] connected", s.id)
      this._instantNextUpdate = true
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
        this._instantNextUpdate = true
        if (!s.connected) s.connect()
        rejoin()
      }
    })

    return s
  }

  public watch(_id: string) {
    this._watched.add(_id)
    if (this.gameSocket.connected) {
      this.gameSocket.emit("watch-game", _id)
    }
  }

  public unwatch(_id: string) {

    this._watched.delete(_id)
    
    if (this.gameSocket.connected) {
      this.gameSocket.emit("unwatch-game", _id)
    }

    if (this._watched.size == 0) {
      this.gameSocket.close()
      delete this._gameSocket
    }

  }
}

export {
  SocketWebService
}
