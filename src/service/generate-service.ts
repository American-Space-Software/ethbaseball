import { inject, injectable } from "inversify";
import { PlayerService } from "./player-service.js";
import { ImageService } from "./image-service.js";
import { AnimationService } from "./animation-service.js";

@injectable()
class GenerateService {

    constructor(
      private playerService:PlayerService,
      private animationService:AnimationService,
      private imageService:ImageService
    ) {}
    


}



export { GenerateService }
