import { inject, injectable } from "inversify";
import axios from "axios"
import { ethers } from "ethers";


@injectable()
class UniverseWebService {

    startDate:string
    rank:number

    constructor(
        @inject('env') private env,
        @inject('eventTarget') private eventTarget,
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

    formatDiamondValue(value) {

        if (value == null) return

        const trimZeros = (s) => s.replace(/\.?0+$/, '')

        const diamonds = ethers.formatUnits(value)
        const num = Number(diamonds)
        if (!Number.isFinite(num)) return diamonds

        if (num === 0) return "0"

        const abs = Math.abs(num)

        const fitPlain = (n) => {
            const intLen = Math.floor(Math.abs(n)).toString().length
            const remaining = 7 - intLen - 1
            let decimals = 1
            if (remaining > 0) decimals = Math.min(remaining, 6)
            let s = n.toFixed(decimals)
            if (s.length > 7 && decimals > 1) s = n.toFixed(decimals - 1)
            if (s.length > 7) s = n.toFixed(1)
            return s.length <= 7 ? s : null
        }

        const plain = fitPlain(num)
        if (plain) return trimZeros(plain)

        const formatAbbrev = (n, suffix, div) => {
            const v = n / div
            const intLen = Math.floor(v).toString().length
            const remaining = 7 - intLen - 1
            let decimals = 1
            if (remaining > 0) decimals = Math.min(remaining, 6)
            let s = v.toFixed(decimals)
            if (s.length > 7 && decimals > 1) s = v.toFixed(decimals - 1)
            if (s.length > 7) s = v.toFixed(1)
            if (s.length > 7) s = v.toFixed(0)
            return `${trimZeros(s)}${suffix}`
        }

        if (abs >= 1e9) return formatAbbrev(abs, 'B', 1e9)
        if (abs >= 1e6) return formatAbbrev(abs, 'M', 1e6)
        return formatAbbrev(abs, 'K', 1e3)
    }

    displayDiamonds(value) {
        const formatted = this.formatDiamondValue(value)
        if (formatted == null) return
        return `${formatted} 🔷`
    }

    displayDiamondsNoSymbol(value) {
        return this.formatDiamondValue(value)
    }


    private countDecimalPlaces(diamonds:string) {
        const [, decimals = ""] = diamonds.split(".")
        const trimmedDecimals = decimals.replace(/0+$/, "")
        return trimmedDecimals.length
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


    getPWADisplayMode() {

        if (document.referrer.startsWith('android-app://'))
            return 'twa'
        if (window.matchMedia('(display-mode: browser)').matches)
            return 'browser'
        if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone)
            return 'standalone'
        if (window.matchMedia('(display-mode: minimal-ui)').matches)
            return 'minimal-ui'
        if (window.matchMedia('(display-mode: fullscreen)').matches)
            return 'fullscreen'
        if (window.matchMedia('(display-mode: window-controls-overlay)').matches)
            return 'window-controls-overlay'

        return 'unknown'
    }


}

export {
    UniverseWebService
}