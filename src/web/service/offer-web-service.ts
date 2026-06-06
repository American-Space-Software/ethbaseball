import { inject, injectable } from "inversify";
import axios from "axios"

import { Player } from "../../dto/player.js";




@injectable()
class OfferWebService {

    constructor(

    ) { }

    async listPlayerForSale(player: Player, listPrice: string) {

        let result = await fetch(`/api/player/list-for-sale/${player._id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                listPrice
            })
        })

        if (result.status != 200) {
            throw new Error(await result.text())
        }

        return result

    }

    async cancelPlayerListing(player: Player) {

        let result = await fetch(`/api/player/cancel-sales-listing/${player._id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (result.status != 200) {
            throw new Error(await result.text())
        }

        return result

    }

    async getOffers() {

        let result = await fetch(`/api/offer/list`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (result.status != 200) {
            throw new Error(await result.text())
        }

        return result.json()

    }    


}




export {
    OfferWebService
}