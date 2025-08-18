import "regenerator-runtime/runtime.js"
import "reflect-metadata"

import { getContainer } from "./cli-inversify.config.js"
import { ProcessConfig } from "../process-config.js"
import { MainController } from "./controller/main-controller.js"

// console.log(index)

let run = async () => {

  let config: any = await ProcessConfig.getConfig()

  let container = await getContainer()

  let controller:MainController = container.get(MainController)

  await controller.start()

  // console.log(index)

}


run()



export {
  run
}

