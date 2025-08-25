import "regenerator-runtime/runtime.js"
import "reflect-metadata"

console.log(`Loading environment: ${process.env.ENV_NAME}`)

import { createCar } from "./start.js"

await createCar()