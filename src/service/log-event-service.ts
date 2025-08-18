import { Contract, ethers } from "ethers"
import { inject, injectable } from "inversify"


@injectable()
class LogEventService {
    
    universeContract: Contract
    diamondContract:Contract


    constructor(
        @inject("provider") private provider
    ) {}

    async init(universeContract: Contract, diamondContract: Contract) {
        this.universeContract = universeContract
        this.diamondContract = diamondContract
    }

    private tryParseLog(log: any) {

        for (const iface of [this.universeContract.interface, this.diamondContract.interface]) {
            try {
                const parsed = iface.parseLog(log);
                return {
                    ...log,
                    name: parsed.name,
                    args: parsed.args
                };
            } catch {
                // not parsable with this iface
            }
        }

        return log
    }



    async getAllEvents() {

        let allEventsFilterId = await this.provider.send('eth_newFilter', [{
            address: [await this.universeContract.getAddress(), await this.diamondContract.getAddress()],
            fromBlock: `earliest`,
            toBlock: `latest`,
            topics:[]
        }])

        //@ts-ignore
        let result = await this.provider.send('eth_getFilterLogs', [allEventsFilterId])

        await this.provider.send('eth_uninstallFilter', [allEventsFilterId])

        return result.map(this.tryParseLog.bind(this))

    }

    async getRecentEvents(startBlock: number, endBlock: number) {

        let recentFilterId = await this.provider.send('eth_newFilter', [{
            address: [await this.universeContract.getAddress(), await this.diamondContract.getAddress()],
            fromBlock: `0x${startBlock.toString(16)}`,
            toBlock: `0x${endBlock.toString(16)}`,
            topics:[]
        }])

        let result = await this.provider.send('eth_getFilterLogs', [recentFilterId])

        await this.provider.send('eth_uninstallFilter', [recentFilterId])

        return result.map(this.tryParseLog.bind(this))


    }
    
}

export {
    LogEventService
}