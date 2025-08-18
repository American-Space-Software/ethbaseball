import axios from "axios";
import { inject, injectable } from "inversify";

@injectable()
class GameTransactionWebService {

    constructor() {}

    async latest(page:number) {
        let result = await axios.get(`/api/game-transaction/latest/${page}`)
        return result.data
    }


    // async getGameTransactionByLeagueSeason(leagueRank:number, date:string, page:number) {

    //   let result = await axios.get(`/api/game-transaction/league/${leagueRank}/${date}/${page}`)

    //   return result.data

    // }

    async getOnChain(page:number) {

      let result = await axios.get(`/api/game-transaction/on-chain/${page}`)

      return result.data

    }


    async getOffChain(page:number) {

      let result = await axios.get(`/api/game-transaction/off-chain/${page}`)

      return result.data

    }





    async latestByTeamSeason(tokenId:number, date:string, page:number) {

      let result = await axios.get(`/api/game-transaction/team/latest/${tokenId}/${date}/${page}`)

      return result.data

    }

    async getOffChainByTeam(tokenId:number, page:number) {

      let result = await axios.get(`/api/game-transaction/team/off-chain/${tokenId}/${page}`)

      return result.data

    }


    async getOnChainByTeam(tokenId:number, page:number) {

      let result = await axios.get(`/api/game-transaction/team/on-chain/${tokenId}/${page}`)

      return result.data

    }




    async getByPlayer(playerId:string, page:number) {

      let result = await axios.get(`/api/game-transaction/player/${playerId}/${page}`)

      return result.data

    }


    async getByOwner(address:string, page:number) {

      let result = await axios.get(`/api/game-transaction/owner/${address}/${page}`)

      return result.data

    }


  

}


export {
  GameTransactionWebService
}