import { inject, injectable } from "inversify";
import axios from "axios"

import { Player } from "../../dto/player.js";




@injectable()
class OfferWebService {

    constructor(

    ) { }


    async acceptBid(bidId:string) {

        let result = await fetch(`/api/player/accept-bid`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bidId
            })            
        })

        if (result.status != 200) {
            throw new Error(await result.text())
        }

        return result

    }

    async bid(player: Player, bidPrice: string) {

        let result = await fetch(`/api/player/bid/${player._id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bidPrice
            })
        })

        if (result.status != 200) {
            throw new Error(await result.text())
        }

        return result

    }


    async cancelBid(bidId:string) {

        let result = await fetch(`/api/player/cancel-bid/${bidId}`, {
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


    async getOffers(page:number = 1) {

        let result = await fetch(`/api/offer/list/${page}`, {
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
    
    
    async getUserOffers() {

        let result = await fetch(`/api/offer/user`, {
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