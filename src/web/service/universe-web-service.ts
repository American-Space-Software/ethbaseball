import { inject, injectable } from "inversify";
import axios from "axios"
import { ethers } from "ethers";
import { UniverseContractService } from "../../service/universe-contract-service.js";


@injectable()
class UniverseWebService {

    startDate:string
    rank:number

    constructor(
        @inject('env') private env,
        @inject('eventTarget') private eventTarget,
        private universeContractService:UniverseContractService
    ) {
        this.rank = 1
    }


    isCurrentSeason() {
        return (this.startDate == this.env().START_DATE)
    }

    showStartDateLink() {
        if (this.startDate && this.startDate != this.env().START_DATE) return true
        return false
    }


    setRank(rank) {
        this.rank = rank
    }


    setStartDate(startDate, currentRoute) {

        if (startDate) {
            this.startDate = startDate
        } else {
            this.startDate = this.env.START_DATE
        }
        
        this.eventTarget.dispatchEvent(new CustomEvent('set-start-date', {
            detail: {
              startDate: startDate,
              currentRoute: currentRoute
            }
        }))

    }

    getStartDate() {
        if (this.startDate) return this.startDate
        return this.env().START_DATE
    }

    getCurrentDate() {
        return this.env().CURRENT_DATE
    }


    getRank() {    
        return this.rank
    }

    getLeagues() {
        return this.env().LEAGUES
    }


    startDateLink(link:string) {

        if (link.indexOf("?") > -1) {
            return `${link}&startDate=${this.getStartDate()}`
        } else {
            return `${link}?startDate=${this.getStartDate()}`
        }

    }

    fullLink(link:string) {

        if (link.indexOf("?") > -1) {
            return `${link}&startDate=${this.getStartDate()}&rank=${this.getRank()}`
        } else {
            return `${link}?startDate=${this.getStartDate()}&rank=${this.getRank()}`
        }

    }



    async getHome(startDate:string) {
    
        //Download it.
        let result = await axios.get(`/api/home/${startDate}`)
        return result.data
    }

    async withdraw() {
        return this.universeContractService.withdraw()
    }

    async updateMetadata() {
        return this.universeContractService.update(this.env().IPFS_CID)
    }

    async getContractBalance() {
        return this.universeContractService.getContractBalance()
    }

    displayDiamonds(value) {
        if (!value) return
        let diamonds = ethers.formatUnits(value)

        return `${new Intl.NumberFormat( 'en-US', { maximumFractionDigits: 0 }).format(parseFloat(diamonds))} 🔷`
    }

    displayDiamondsNoSymbol(value) {
        if (!value) return
        let diamonds = ethers.formatUnits(value)

        return `${new Intl.NumberFormat( 'en-US', { maximumFractionDigits: 0 }).format(parseFloat(diamonds))}`
    }

    displayETH(value) {
        if (!value) return "0 ETH"

        return `${ethers.formatUnits(value)} ETH`
    }


    isAdmin(address) {
        if (address == this.env().ADMIN_ADDRESS) return true
        return false
    }

    setMetadata(title:string, url:string, imageUrl:string, description:string) {

        document.querySelector('title').innerHTML = `${title}`

        document.querySelector('meta[property="og:title"]')?.setAttribute("content", title)
        document.querySelector('meta[property="og:url"]')?.setAttribute("content", url)
        document.querySelector('meta[property="og:image"]')?.setAttribute("content", imageUrl)
        document.querySelector('meta[property="og:description"]')?.setAttribute("content", description)

        document.querySelector('meta[name="twitter:url"]')?.setAttribute("content", url)
        document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", title)
        document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", imageUrl)
        document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", description )
    }


}

export {
    UniverseWebService
}