import { inject, injectable } from "inversify";
import axios from "axios"
import { ContractYear, PlayerContract, Position } from "../../service/enums.js";
import dayjs from "dayjs";
import { WalletService } from "../../service/wallet-service.js";
import { Player } from "../../dto/player.js";
import { UniverseWebService } from "./universe-web-service.js";



@injectable()
class PlayerWebService {

    constructor(
        @inject("WalletService") private walletService: WalletService,
        private universeWebService:UniverseWebService
    ) { }

    async getDropPlayerToken(player:Player) {

        await this.walletService.connect()
    
        let wallet = await this.walletService.getWallet()
    
        let sResult:any = await axios.get(`/auth/token/drop-player/${wallet.address}/${player._id}`)
        let signatureToken:any = sResult.data

        let message = `Dropping player '${player.fullName}'. \n\n @ ${signatureToken.token}`
    
        const signature = await wallet.signMessage(message)
    
        let result = await fetch(`/api/player/drop/${player._id}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                signature: signature
            })
        })

        return result


    }


    async get(_id: number, startDate:string) {
        try {
            //Download it.
            let result = await axios.get(`/api/player/${_id}/${startDate}`)
            return result.data
        } catch (ex) {
            console.log(ex)
        }

    }

    async getPlayers(startDate:string, rank:number) {
        try {
            //Download it.
            let result = await axios.get(`/api/player/list/${rank}/${startDate}`)
            return result.data
        } catch (ex) {
            console.log(ex)
        }

    }


    // async getAnimation(_id: number) {
    //     try {
    //         //Download it.
    //         let result = await axios.get(`/animations/${_id}.html`)
    //         return result.data
    //     } catch (ex) {
    //         console.log(ex)
    //     }

    // }





    // async getTransactions(startDate:string, pageNumber:number) {
    //     try {
    //         //Download it.
    //         let result = await axios.get(`/player/${startDate}`)
    //         return result.data
    //     } catch (ex) {
    //         console.log(ex)
    //     }

    // }


    // async getGlobalStats() {
    //     try {
    //         //Download it.
    //         let result = await axios.get(`/player/stats`)
    //         return result.data
    //     } catch (ex) {
    //         console.log(ex)
    //     }

    // }

    // async getPlayersByOwner(_id: string) {
    //     try {
    //         //Download it.
    //         let result = await axios.get(`/o/${_id}/players`)
    //         return result.data
    //     } catch (ex) {
    //         console.log(ex)
    //     }

    // }



    async ownerItemPage(address: string, pageNumber: number): Promise<ItemPage> {
        return this.getRowItemViewModelsByOwner(address, pageNumber)
    }




    async getRowItemViewModelsByAttribute(traitType: string, value: string, pageNumber: number): Promise<ItemPage> {

        const escape = (s) => {
            return s.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        }

        let itemPage: ItemPage

        const response = await axios.get(`/attributes/items/${escape(traitType)}/${escape(value)}/${pageNumber}.json`)

        itemPage = response.data

        return itemPage
    }

    async getRowItemViewModelsByOwner(address: string, pageNumber: number): Promise<ItemPage> {

        let itemPage: ItemPage

        const response = await axios.get(`/sync/tokenOwner/${address}/tokens/${pageNumber}.json`)

        itemPage = response.data

        return itemPage
    }

    // async getRowItemViewModelsByTokenIds(tokenIds: number[]): Promise<RowItemViewModel[]> {

    //     let items: RowItemViewModel[] = []

    //     for (let tokenId of tokenIds) {
    //         const response = await axios.get(`/t/${tokenId}/rowItemViewModel.json`)
    //         items.push(response.data)
    //     }

    //     return items
    // }

    // async getRowItemViewModelsByTokenId(tokenId: number): Promise<RowItemViewModel> {

    //     const response = await axios.get(`/t/${tokenId}/rowItemViewModel.json`)
    //     return response.data

    // }


    getPositionFull(position: Position) {

        switch (position) {
            case Position.PITCHER:
                return "Pitcher"
            case Position.CATCHER:
                return "Catcher"
            case Position.FIRST_BASE:
                return "First Base"
            case Position.SECOND_BASE:
                return "Second Base"
            case Position.THIRD_BASE:
                return "Third Base"
            case Position.SHORTSTOP:
                return "Shortstop"
            case Position.LEFT_FIELD:
                return "Left Field"
            case Position.CENTER_FIELD:
                return "Center Field"
            case Position.RIGHT_FIELD:
                return "Right Field"
        }
    }

    sort($, e, elementClass, items) {

        $(`${elementClass} th`).removeClass("sort-active")
        $(e.srcElement).addClass('sort-active')

        let sortAttribute = $(e.srcElement).data('sort')

        //Get current sort.
        let currentSort = $(e.srcElement).data('direction') ? $(e.srcElement).data('direction') : "desc"

        //Flip it.
        if (currentSort == "desc") {
            currentSort = "asc"
        } else {
            currentSort = "desc"
        }

        $(e.srcElement).data('direction', currentSort)

        items.sort((first, second) => {

            // Dynamically evaluate the sort attribute expression in the context of the current item
            let aV = new Function('item', `return item.${sortAttribute}`)(first)
            let bV = new Function('item', `return item.${sortAttribute}`)(second)
    
            if (!aV) aV = 0
            if (!bV) bV = 0

            if (typeof (aV) == "number") {

                if (currentSort == "desc") {
                    return aV - bV
                } else {
                    return bV - aV
                }

            } else if (typeof (aV) == "string") {

                if (currentSort == "desc") {
                    if (bV < aV) return -1
                    else return 1
                } else {
                    if (aV < bV) return -1
                    else return 1
                }

            }

            return 0

        })

    }


    sortMultiple($, e, elementClass, itemLists) {

        $(`${elementClass} th`).removeClass("sort-active")
        $(e.srcElement).addClass('sort-active')

        let sortAttribute = $(e.srcElement).data('sort')

        //Get current sort.
        let currentSort = $(e.srcElement).data('direction') ? $(e.srcElement).data('direction') : "desc"

        //Flip it.
        if (currentSort == "desc") {
            currentSort = "asc"
        } else {
            currentSort = "desc"
        }

        $(e.srcElement).data('direction', currentSort)

        for (let items of itemLists) {

            items.sort((first, second) => {

                // Dynamically evaluate the sort attribute expression in the context of the current item
                let aV = new Function('item', `return item.${sortAttribute}`)(first)
                let bV = new Function('item', `return item.${sortAttribute}`)(second)
        
                if (!aV) aV = 0
                if (!bV) bV = 0
    
                if (typeof (aV) == "number") {
    
                    if (currentSort == "desc") {
                        return aV - bV
                    } else {
                        return bV - aV
                    }
    
                } else if (typeof (aV) == "string") {
    
                    if (currentSort == "desc") {
                        if (bV < aV) return -1
                        else return 1
                    } else {
                        if (aV < bV) return -1
                        else return 1
                    }
    
                }
    
                return 0
    
            })

        }

    }



    autoComplete(query, allPlayers) {

        if (query.length === 0) {
            return []
        }

        let matches = []

        matches.push(...allPlayers.filter(h => h.fullName.toLowerCase().indexOf(query.toLowerCase()) >= 0))

        matches.sort((a,b) => a.lastName.localeCompare(b) )

        return matches
    }


    getActiveContractYear(contract:PlayerContract) : ContractYear {
        
        if (!contract?.startDate) return

        let today = new Date(new Date().toUTCString())

        return contract.years.find( y => dayjs(y.startDate).toDate() <= today && dayjs(y.endDate).toDate() >= today)

    }

    displayRestDays(player, universeDate) {

        let compareDate = dayjs(universeDate).subtract(4, 'days').toDate()
        compareDate.setHours(0, 0, 0)

        let lastGamePitched = dayjs(player.lastGamePitched).toDate()

        if (player.lastGamePitched == undefined || lastGamePitched <= compareDate) {
            return `Available` 
        }

        return dayjs(compareDate).to(player.lastGamePitched)

    }

    getFutureContractValue(futureContract, index:number) {

        if (!futureContract) return ""

        let year = futureContract[index]

        if (year) {

            if (year.salary) {
                return this.universeWebService.displayDiamonds(futureContract[index].salary)
            } else {
                if (year.isPreArbitration) return "Minimum"
                if (year.isArbitration) return "Arbitration"
            }

        }

// p?.futureContract && p.futureContract[0] ? universeWebService.displayDiamonds(p.futureContract[0].salary) : ''


    }

    getPlayerDisplayRating(overallRating:number, age:number) {
        return (overallRating * this.getAgeModifier(age)).toFixed(1)
    }

    getAgeModifier(yearsOld: number): number {

        switch (yearsOld) {

            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
                return .50
            case 17:
                return .75
            case 18:
                return .77
            case 19:
                return .79
            case 20:
                return .85
            case 21:
                return .87
            case 22:
                return .89
            case 23:
                return .91
            case 24:
                return .92
            case 25:
                return .94
            case 26:
                return .97
            case 27:
                return 1
            case 28:
                return .97
            case 29:
                return .96
            case 30:
                return .95
            case 31:
                return .93
            case 32:
                return .9
            case 33:
                return .87
            case 34:
                return .85
            case 35:
                return .8
            case 36:
                return .75
            case 37:
                return .74
            case 38:
                return .73
            case 39:
                return .72
            case 40:
                return .70
            case 41:
                return .68
            case 42:
                return .65
            case 43:
                return .60
            case 44:
                return .1

        }

    }


}

interface ItemPage {
    items?: RowItemViewModel[]
}

interface ItemResults {
    items?: RowItemViewModel[]
    totalMatches?: number
    limit?: number
    skip?: number
}

interface RowItemViewModel {
    _id: string
    title: string
    coverImageId: string
    coverImageGenerated: boolean
    tokenId: number

}


export {
    PlayerWebService
}