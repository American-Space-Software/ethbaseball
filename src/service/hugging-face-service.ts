import { HfInference } from "@huggingface/inference";
import { inject, injectable } from "inversify";
import { Team } from "../dto/team.js";

@injectable()
class HuggingFaceService {

    inference:HfInference

    constructor(
    ) {}

    async init(huggingFaceApiKey) {
        this.inference = new HfInference(huggingFaceApiKey)
    }

    async generateImage(model:string, prompt:string, negativePrompt?:string) : Promise<Blob> {

        let options:any = {
            inputs: prompt,
            parameters: {
                width: 1200,
                height: 1200
            },
            model: model
        }

        if (negativePrompt) {
            options.parameters.negative_prompt = negativePrompt
        }

        return this.inference.textToImage(options)

    }

    async generateTeamName(cityName:string) {

        let options:any = {
            inputs: `Please create a name for a fictional baseball team that plays in ${cityName}. 
            It should be a reference that is appreciated locally but does not use the intellectual property of any existing or historical entity. 
            Also return the name of a fictional stadium where this team will play. Just return a simple text result that contains JSON in the format:
            
            {
               cityName: ${cityName},
               teamName: "<generated team name>",
               stadiumName: "<generated stadium name>"
            }
            `,
        }

        return this.inference.textGeneration(options)


    }


}

export {
    HuggingFaceService
}

