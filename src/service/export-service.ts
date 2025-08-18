// import { inject, injectable } from "inversify";
// import { GameLevel, PlayerLevel } from "./enums.js"
// import { Player } from "../dto/player.js";
// import { ProcessedTransactionService, TransactionsViewModel } from "./processed-transaction-service.js";
// import { Image } from "../dto/image.js"
// import { Animation } from "../dto/animation.js"

// import fs from "fs"
// import { ImageService } from "./image-service.js";
// import { GameHitResultRepository } from "../repository/game-hit-result-repository.js";
// import { GamePitchResultRepository } from "../repository/game-pitch-result-repository.js";
// import { AnimationService } from "./animation-service.js";
// import { ProcessedTransaction } from "../dto/processed-transaction.js";


// @injectable()
// class ExportService {


//     @inject("GameHitResultRepository")
//     private gameHitResultRepository: GameHitResultRepository

//     @inject("GamePitchResultRepository")
//     private gamePitchResultRepository: GamePitchResultRepository

//     constructor(
//         private imageService:ImageService,
//         private animationService:AnimationService,
//         private processedTransactionService:ProcessedTransactionService,
//         @inject("config") private _config:Function
//     ) {}

//     async exportStatLeadersJSON(hitterViewModels:any[], pitcherViewModels:any[]) {

//         let filepath = `${this._config().publicPath}/stats`

//         fs.mkdirSync(filepath, { recursive: true })

//         fs.writeFileSync(`${filepath}/hitters.json`, Buffer.from(JSON.stringify(hitterViewModels)))
//         fs.writeFileSync(`${filepath}/pitchers.json`, Buffer.from(JSON.stringify(pitcherViewModels)))

//     }

//     async exportPlayerRatingsJSON(hitterViewModels:any[], pitcherViewModels:any[]) {

//         let filepath = `${this._config().publicPath}/ratings`

//         fs.mkdirSync(filepath, { recursive: true })

//         fs.writeFileSync(`${filepath}/hitters.json`, Buffer.from(JSON.stringify(hitterViewModels)))
//         fs.writeFileSync(`${filepath}/pitchers.json`, Buffer.from(JSON.stringify(pitcherViewModels)))

//     }

//     async exportPlayerFull(player:Player, animation:Animation, image:Image, transactionsViewModel:TransactionsViewModel, options?:any) {

//         let imageContent = await this.imageService.getImageContent(image)

//         //Write animation if it doesn't exist
//         if (!fs.existsSync(`${this._config().publicPath}/animations/${animation.cid}.html`)) {
//             fs.writeFileSync(`${this._config().publicPath}/animations/${animation.cid}.html`, new TextEncoder().encode(animation.content))

//             // //Create PNG from animation
//             // if (!fs.existsSync(`${this._config().publicPath}/animations/png/${animation.cid}.png`)) {
//             //     await this.generatePNGFromHTML(animation.content, `${this._config().publicPath}/animations/png/${animation.cid}.png`, 500, 500)
//             // }

//         }

//         //Write image if it doesn't exist
//         if (!fs.existsSync(`${this._config().publicPath}/images/${image.cid}.svg`)) {
//             fs.writeFileSync(`${this._config().publicPath}/images/${image.cid}.svg`,imageContent)
//         }

//         if (!fs.existsSync(`${this._config().publicPath}/sync/tokens/${player._id}`)) {
//             fs.mkdirSync(`${this._config().publicPath}/sync/tokens/${player._id}`, { recursive: true })
//         }
        
//         //Write token json
//         await this.exportPlayerJSON(player, animation, image, transactionsViewModel, options)

//     }


//     async exportPlayerJSONFUll(player:Player, options?:any) {

//         let coverImage:Image = await this.imageService.get(player.coverImageId, options)
//         let animation:Animation = await this.animationService.get(player.animationId, options)

//         let transactionIds:string[] = await this.processedTransactionService.listIdByToken(player._id, options)
//         let transactions:ProcessedTransaction[] = []

//         for (let id of transactionIds) {
//             let transaction = await this.processedTransactionService.get(id, options)
//             transaction.ercEvents = transaction.ercEvents.filter( e => e.namedArgs.tokenId == player._id)
//             transaction.tokenIds = [player._id]
//             transactions.push(transaction)        
//         }


//         let transactionsViewModel:TransactionsViewModel = await this.processedTransactionService.translateTransactionsToViewModels(transactions, new Date().toUTCString(), options)

//         return this.exportPlayerJSON(player, animation, coverImage, transactionsViewModel, options)
//     }

//     async exportPlayerJSON(player:Player, animation:Animation, image:Image, transactionsViewModel:TransactionsViewModel, options?:any) {

//         let hitterGameLog = await this.gameHitResultRepository.getByPlayer(player._id, options)
//         let pitcherGameLog = await this.gamePitchResultRepository.getByPlayer(player._id, options)

//         if (!fs.existsSync(`${this._config().publicPath}/sync/tokens/${player._id}`)) {
//             fs.mkdirSync(`${this._config().publicPath}/sync/tokens/${player._id}`, { recursive: true })
//         }

//         //Write token json
//         fs.writeFileSync(`${this._config().publicPath}/sync/tokens/${player._id}/token.json`, Buffer.from(JSON.stringify(Object.assign({
//             coverImageCid: image.cid,
//             animationCid: animation.cid,
//             hitterGameLog: hitterGameLog,
//             pitcherGameLog: pitcherGameLog,
//             fullName: `${player.firstName} ${player.lastName}`,
//             displayName: `${player.firstName.substring(0,1).toUpperCase()}. ${player.lastName}`,
//             transactionsViewModel: transactionsViewModel
//         }, player.dataValues))))
//     }

//     async exportPlayerRowItemViewModel(player:Player, image:Image) {

//         if (!fs.existsSync(`${this._config().publicPath}/t/${player._id}`)) {
//             fs.mkdirSync(`${this._config().publicPath}/t/${player._id}`, { recursive: true })
//         }
  

//         fs.writeFileSync(`${this._config().publicPath}/t/${player._id}/rowItemViewModel.json`, Buffer.from(JSON.stringify({
//             _id: player._id,
//             coverImageId: image.cid,
//             title: `${player.fullName} #${player._id}`,
//             tokenId: player._id
//         })))
//     }

// }


// export {
//     ExportService
// }