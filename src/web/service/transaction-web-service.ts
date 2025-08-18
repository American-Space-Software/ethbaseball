import axios from "axios";
import { inject, injectable } from "inversify";
import { TransactionsViewModel } from "../../service/processed-transaction-service.js";

@injectable()
class TransactionWebService {

    constructor() {}

    async getHomeViewModel() {

        let result = await axios.get(`/sync/home.json`, {
            // query URL without using browser cache
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
        })

        return result.data
    }


    async list(page?:number) : Promise<TransactionsViewModel> {

        let result = await axios.get(`/transactions/${page}`)

        return result.data

    }


    async listByAddress(address:string, page:number) : Promise<TransactionsViewModel> {
        
        let result = await axios.get(`/o/${address}/activity/${page}`)

        let transactionsViewModel = result.data

        return transactionsViewModel

    }


    async getLatest() {
        let result = await axios.get(`/transactions/latest`, {
            // query URL without using browser cache
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          })
        return result.data
    }

    async getRecentActivity() : Promise<TransactionsViewModel> {

        let result = await axios.get(`/sync/transactions/recentActivity.json`, {
            // query URL without using browser cache
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          })

        let transactionsViewModel:TransactionsViewModel = result.data


        return transactionsViewModel

    }


    abbreviateDollars(number, digits) {

        if (!number) return "$0"

        var SI_SYMBOL = ["", "", "M", "G", "T", "P", "E"]


        // what tier? (determines SI symbol)
        var tier = Math.log10(Math.abs(number)) / 3 | 0

        // if zero or thousands, we don't need a suffix
        if(tier == 0 || tier == 1) {
          let result = new Intl.NumberFormat('en-US', { currency: "USD", style:"currency" }).format(number)
          return result
        }

        // get suffix and determine scale
        var suffix = SI_SYMBOL[tier]
        var scale = Math.pow(10, tier * 3)

        // scale the number
        var scaled = number / scale

        // format number and add suffix
        return new Intl.NumberFormat('en-US', { currency: "USD", style:"currency" }).format(scaled) + suffix
    }


}

interface LatestTransactionInfo {
    _id: string
    lastUpdated:string
}



export {
    TransactionWebService
}