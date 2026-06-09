import { inject, injectable } from "inversify"
import { io, Socket } from "socket.io-client"

@injectable()
class SocketWebService {

  private _instantNextUpdate = false

  private _game: WatchedSocket
  private _queue: WatchedSocket

  constructor(
    @inject("env") private env: any
  ) {

    this._game = new WatchedSocket(
      () => this.env().WEB_SOCKET,
      "game",
      "watch-game",
      "unwatch-game",
      "socket",
      () => {
        this._instantNextUpdate = true
      }
    )

    this._queue = new WatchedSocket(
      () => this.env().WEB_SOCKET,
      "queue",
      "watch-queue",
      "unwatch-queue",
      "queue socket"
    )

  }

  public consumeInstantNextUpdate() {
    const v = this._instantNextUpdate
    this._instantNextUpdate = false
    return v
  }

  public get gameSocket(): Socket {
    return this._game.socket
  }

  public get queueSocket(): Socket {
    return this._queue.socket
  }

  public watchGame(_id: string) {
    this._game.watch(_id)
  }

  public unwatchGame(_id: string) {
    this._game.unwatch(_id)
  }

  public watchQueue() {
    this._queue.watch()
  }

  public unwatchQueue() {
    this._queue.unwatch()
  }

  public onQueueGameStarted(cb: ({ gameId }: { gameId: string }) => void) {
    this._queue.on("queue-game-started", cb)
  }

  public offQueueGameStarted(cb: ({ gameId }: { gameId: string }) => void) {
    this._queue.off("queue-game-started", cb)
  }

}

class WatchedSocket {

  private _socket: Socket | null = null
  private _watched = new Set<string>()
  private _handlers: { event: string, cb: (...args: any[]) => void }[] = []

  constructor(
    private url: () => string,
    private namespace: string,
    private watchEvent: string,
    private unwatchEvent: string,
    private logPrefix: string,
    private onConnect?: () => void
  ) {}

  public get socket(): Socket {

    if (this._socket) return this._socket

    const s = io(`${this.url()}/${this.namespace}`, {
      path: "/socket.io",
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"]
    })

    this._socket = s

    for (const handler of this._handlers) {
      s.on(handler.event, handler.cb)
    }

    const rejoin = () => {
      for (const id of this._watched) {
        this.emitWatch(id)
      }
    }

    s.on("connect", () => {
      console.log(`[${this.logPrefix}] connected`, s.id)
      this.onConnect?.()
      rejoin()
    })

    s.on("disconnect", (why) => {
      console.log(`[${this.logPrefix}] disconnect`, why)
    })

    s.on("connect_error", (err) => {
      console.warn(`[${this.logPrefix}] connect_error`, err?.message ?? err)
    })

    s.io.engine.on("upgrade", () => {
      console.log(`[${this.logPrefix}] upgraded to`, s.io.engine.transport.name)
    })

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this._watched.size > 0) {
        this.onConnect?.()
        if (!s.connected) s.connect()
        rejoin()
      }
    })

    return s
  }

  public watch(id: string = "") {
    this._watched.add(id)

    if (this.socket.connected) {
      this.emitWatch(id)
    }
  }

  public unwatch(id: string = "") {
    this._watched.delete(id)

    if (this.socket.connected) {
      this.emitUnwatch(id)
    }

    if (this._watched.size == 0) {
      this.socket.close()
      delete this._socket
    }
  }

  public on(event: string, cb: (...args: any[]) => void) {
    this._handlers.push({ event, cb })

    if (this._socket) {
      this._socket.on(event, cb)
    }
  }

  public off(event: string, cb: (...args: any[]) => void) {
    this._handlers = this._handlers.filter(h => {
      return h.event != event || h.cb != cb
    })

    if (this._socket) {
      this._socket.off(event, cb)
    }
  }

  private emitWatch(id: string) {
    if (id) {
      this.socket.emit(this.watchEvent, id)
      return
    }

    this.socket.emit(this.watchEvent)
  }

  private emitUnwatch(id: string) {
    if (id) {
      this.socket.emit(this.unwatchEvent, id)
      return
    }

    this.socket.emit(this.unwatchEvent)
  }

}

export {
  SocketWebService
}