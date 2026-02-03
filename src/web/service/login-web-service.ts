import axios from "axios"
import { inject, injectable } from "inversify"
import { WalletService } from "../../service/wallet-service.js"

@injectable()
class LoginWebService {

    authInfo

    constructor(
        @inject("WalletService") private walletService: WalletService,
        @inject("eventTarget") private eventTarget
    ) {}

    async getAuthId() {

        try {
            //Download it.
            let result = await axios.get(`/auth/id`)
            return result.data
        } catch (ex) {
            console.log(ex)
        }

    }

    async getAuthInfo(force?:boolean) {
        
        if (this.authInfo && force != true) return this.authInfo

        try {
            //Download it.
            this.authInfo = await this.fetchAuthInfo()

            this.eventTarget.dispatchEvent(new CustomEvent('auth-info-loaded', {
                detail: {
                  authInfo: this.authInfo
                }
            }))

            return this.authInfo
        } catch (ex) {
            console.log(ex)
        }

    }

    async fetchAuthInfo() {
        
        try {
            //Download it.
            let result = await axios.get(`/auth/info`)
            return result.data
        } catch (ex) {
            console.log(ex)
        }

    }

    async confirmOwnership(wallet) {

        let sResult:any = await axios.get(`/auth/token/${wallet.address}`)
        let signatureToken:any = sResult.data

        let message = `Confirming control of wallet ${wallet.address}. \n\n @ ${signatureToken.token}`
    
        const signature = await wallet.signMessage(message)
    
        let result = await fetch('/auth/link', {
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

    async loginWithWallet() {

        await this.walletService.connect()
    
        let wallet = await this.walletService.getWallet()
    
        let sResult:any = await axios.get(`/auth/token/${wallet.address}`)
        let signatureToken:any = sResult.data

        let message = `Log in with wallet ${wallet.address}. \n\n @ ${signatureToken.token}`
    
        const signature = await wallet.signMessage(message)
    
        let result = await fetch('/auth/ethereum', {
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

    // async loginWithCoinbaseWallet() {

    //     await this.walletService.connect()
    
    //     let wallet = await this.walletService.getWallet()
    
    //     let sResult:any = await axios.get(`/auth/token/${wallet.address}`)
    //     let signatureToken:any = sResult.data

    //     let message = `Log in with wallet ${wallet.address}. \n\n @ ${signatureToken.token}`
    
    //     const signature = await wallet.signMessage(message)
    
    //     let result = await fetch('/auth/ethereum', {
    //         method: 'POST',
    //         headers: {
    //             'Accept': 'application/json',
    //             'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify({
    //             message: message,
    //             signature: signature
    //         })
    //     })

    //     return result
        
    // }



}



export {
    LoginWebService
}