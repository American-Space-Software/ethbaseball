import "regenerator-runtime/runtime.js"
import "reflect-metadata"

console.log(`Loading environment: ${process.env.ENV_NAME}`)

import { startWebServer } from "./web-server/start-server.js"
import { startEngine } from "./engine/start.js"

await startEngine()
await startWebServer()
