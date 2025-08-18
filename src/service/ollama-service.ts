import { inject, injectable } from "inversify";


@injectable()
class OllamaService {

    constructor(
        @inject("ollama") private ollama
    ) { }

      
    async chat() {
    }
      


}


export {
    OllamaService
}