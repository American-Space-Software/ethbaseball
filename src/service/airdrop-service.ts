import { Alchemy } from "alchemy-sdk";
import { inject, injectable } from "inversify";




@injectable()
class AirdropService {


    constructor(
        @inject('alchemy') private alchemy:Alchemy
    ) {}

    async getAirdropList(totalAirdropTokens:bigint)  {
        
        const mlbcAirdropTotal = totalAirdropTokens * 70n / 100n;
        totalAirdropTokens -= mlbcAirdropTotal

        //50% go to MLBC
        let mlbcOwners = await this.getAllOwnersForContract("0x8c9b261Faef3b3C2e64ab5E58e04615F8c788099", process.env.ALCHEMY_API_KEY,  "eth-mainnet")
        let mlbcRewards = this.calculateRewards(mlbcOwners, mlbcAirdropTotal)

        let otherProjectTotal = totalAirdropTokens / 8n


        let bigLeagzOwners = await this.getBigLeagzOwners()
        let bigLeagzRewards:{ address:string, count:string }[] = this.calculateRewards(bigLeagzOwners, otherProjectTotal)

        let moonshotBaseballOwners = await this.getMoonShotBaseballOwners()
        let moonshotBaseballRewards:{ address:string, count:string }[] = this.calculateRewards(moonshotBaseballOwners, otherProjectTotal)


        let metaAthletesOwners = await this.getAllOwnersForContract("0xda01295ad0ac1942fd8083f39965f9427b00541a", process.env.ALCHEMY_API_KEY,  "eth-mainnet")
        let metaAthletesRewards:{ address:string, count:string }[] = this.calculateRewards(metaAthletesOwners, otherProjectTotal)

        let diamondDogsOwners = await this.getAllOwnersForContract("0x48e6013ecf4d40ce15c5223b62fc2fe33296c2e4", process.env.ALCHEMY_API_KEY,  "eth-mainnet")
        let diamondDogsRewards:{ address:string, count:string }[] = this.calculateRewards(diamondDogsOwners, otherProjectTotal)

        let metafansGenesisOwners = await this.getAllOwnersForContract("0x6250b989ecf7cb82c7892e1cea604ed813423635", process.env.ALCHEMY_API_KEY,  "eth-mainnet")
        let metafansGenesisRewards:{ address:string, count:string }[] = this.calculateRewards(metafansGenesisOwners, otherProjectTotal)

        let baseballHeadOwners = await this.getAllOwnersForContract("0x1427e52509582b4e5fa81efcb07cf4de8c691683", process.env.ALCHEMY_API_KEY,  "eth-mainnet")
        let baseballHeadRewards:{ address:string, count:string }[] = this.calculateRewards(baseballHeadOwners, otherProjectTotal)

        let projectSandlotOwners = await this.getAllOwnersForContract("0xddd70b34652dc626d2329e7cbdd7d27e2cd5b9f8", process.env.ALCHEMY_API_KEY,  "eth-mainnet")
        let projectSandlotRewards:{ address:string, count:string }[] = this.calculateRewards(projectSandlotOwners, otherProjectTotal)

        let sandlotSlotsOwners = await this.getAllOwnersForContract("0x18a6c23c88a6fd575410ae971960d3dcd77fdbb6", process.env.ALCHEMY_API_KEY,  "eth-mainnet")
        let sandlotSlotsRewards:{ address:string, count:string }[] = this.calculateRewards(sandlotSlotsOwners, otherProjectTotal)

        let allRewards:{ address:string, count:string }[] = []
                           .concat(mlbcRewards)
                           .concat(bigLeagzRewards)
                           .concat(moonshotBaseballRewards)
                           .concat(metaAthletesRewards)
                           .concat(diamondDogsRewards)
                           .concat(metafansGenesisRewards)
                           .concat(baseballHeadRewards)
                           .concat(projectSandlotRewards)
                           .concat(sandlotSlotsRewards)

        let mergedRewards = this.mergeRewards(allRewards)

        return mergedRewards
    
    }


    countRewards(allRewards) {

        let totalRewardCheck = "0"

        for (let r of allRewards) {
            totalRewardCheck = ( BigInt(totalRewardCheck) + BigInt(r.count) ).toString()
        }

        return totalRewardCheck
    }

    async getMoonShotBaseballOwners() {
        
        let moonshotBaseballOriginal = await this.getOwnersForContract("0xe77539420dcbb7a78ce17c750f73af350aa90825", process.env.ALCHEMY_API_KEY,  "polygon-mainnet")
        let moonshotBaseballers = await this.getOwnersForContract("0x07748097c9a11ad7665c97099d511d9d03e60fdf", process.env.ALCHEMY_API_KEY,  "polygon-mainnet")
        let moonshotDiamonds = await this.getOwnersForContract("0x5f6bac19b40d02a6db3b1c81a2825786a02a72e7", process.env.ALCHEMY_API_KEY,  "polygon-mainnet")
        let moonshotVoyagers = await this.getOwnersForContract("0xc412abb6867550654947f6b20d7a38eb964177d3", process.env.ALCHEMY_API_KEY, "eth-mainnet")


        let allResults = [].concat(moonshotBaseballOriginal.ownerMap)
                           .concat(moonshotBaseballers.ownerMap)
                           .concat(moonshotDiamonds.ownerMap)
                           .concat(moonshotVoyagers.ownerMap)

        let allOwners = this.mergeCounts(allResults)

        return allOwners

    }

    async getBigLeagzOwners() {

        let sluggerzbybigleagz = await this.getOwnersForOpenSeaCollection("sluggerzbybigleagz")
        let heaterzbybigleagz = await this.getOwnersForOpenSeaCollection("heaterzbybigleagz")
        let oldtimerzbybigleagz = await this.getOwnersForOpenSeaCollection("oldtimerzbybigleagz")
        let iconzbybigleagz = await this.getOwnersForOpenSeaCollection("iconzbybigleagz")
        let acezbybigleagz = await this.getOwnersForOpenSeaCollection("acezbybigleagz")
        let framerzbybigleagz = await this.getOwnersForOpenSeaCollection("framerzbybigleagz")
        let greatzbybigleagz = await this.getOwnersForOpenSeaCollection("greatzbybigleagz")
        let roundedcrowns = await this.getOwnersForOpenSeaCollection("roundedcrowns")
        let charmzbybigleagz = await this.getOwnersForOpenSeaCollection("charmzbybigleagz")
        let exclusivezbybigleagz = await this.getOwnersForOpenSeaCollection("exclusivezbybigleagz")

        let allResults = [].concat(sluggerzbybigleagz)
                           .concat(heaterzbybigleagz)
                           .concat(oldtimerzbybigleagz)
                           .concat(iconzbybigleagz)
                           .concat(acezbybigleagz)
                           .concat(framerzbybigleagz)
                           .concat(greatzbybigleagz)
                           .concat(roundedcrowns)
                           .concat(charmzbybigleagz)
                           .concat(exclusivezbybigleagz)

        let allOwners = this.mergeCounts(allResults)

        return allOwners
    }

    mergeCounts(allResults:{address:string, count:number}[]) : { address:string, count:number}[] {

        let allOwners:{ address:string, count:number}[] = []

        for (let ownerRecord of allResults) {

            let existing = allOwners.find( o => o.address == ownerRecord.address)

            if (existing) {
                existing.count += ownerRecord.count
            } else {
                allOwners.push({
                    address: ownerRecord.address,
                    count: ownerRecord.count
                })
            }

        }

        return allOwners

    }

    mergeRewards(allRewards:{address:string, count:string }[]) : { address:string, count:string}[] {

        let allOwners:{ address:string, count:string}[] = []

        for (let reward of allRewards) {

            let existing = allOwners.find( o => o.address == reward.address)

            if (existing) {
                existing.count = ( BigInt(existing.count) + BigInt(reward.count) ).toString()
            } else {
                allOwners.push({
                    address: reward.address,
                    count: reward.count
                })
            }

        }

        return allOwners

    }


    calculateRewards(holders:{ address:string, count:number}[], totalRewards:bigint) : { address:string, count:string }[] {

        let totalTokenString = "0"

        for (let h of holders) {
            totalTokenString = (BigInt(totalTokenString) + BigInt(h.count)).toString()
        }

        let totalTokens = BigInt(totalTokenString)

        let rewards:{ address:string, count:string }[] = []

        for (const h of holders) {
            const holderCount = BigInt(h.count)
            const reward = holderCount * totalRewards / totalTokens
            rewards.push({ address: h.address, count: reward.toString() })
        }

        // let totalRewardCheck = 0

        // for (let r of rewards) {
        //     totalRewardCheck += r.rewards
        // }


        return rewards

    }


    async getOwnersForOpenSeaCollection(collectionSlug:string, network = "eth-mainnet") {

        let theNfts = await this.getNftsForCollectionSlug(collectionSlug, process.env.ALCHEMY_API_KEY, network)

        let tokenIds = theNfts.nfts.map( s => { 
            return {
                tokenId: s.tokenId, 
                address: s.contract.address 
            }
        })


        let tokenIdOwners = []

        for (let tokenId of tokenIds) {

            let result = await this.getOwnersForNft(tokenId.address, tokenId.tokenId, process.env.ALCHEMY_API_KEY, network)

            let existing = tokenIdOwners.find( ti => ti.address == result.owners[0])

            if (existing) {
                existing.count++
            } else {
                tokenIdOwners.push({
                    address: result.owners[0],
                    count: 1
                })
            }

            
        }

        return tokenIdOwners


    }


    /**
     * Fetch NFTs for an OpenSea collection slug using Alchemy REST API.
     * @param {string} slug - The OpenSea collection slug.
     * @param {string} apiKey - Your Alchemy API key.
     * @param {string} network - Alchemy network (default: "eth-mainnet")
     * @param {string} [startToken] - Optional pagination token.
     * @returns {Promise<Object>} The parsed JSON response.
     */
    async getNftsForCollectionSlug(slug, apiKey, network = "eth-mainnet", startToken = "") {

        const baseUrl = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForCollection`

        const params = new URLSearchParams({
            collectionSlug: slug,
            withMetadata: "true"
        })

        if (startToken) params.append("startToken", startToken);

        const url = `${baseUrl}?${params.toString()}`

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Fetch owners of a specific NFT using Alchemy REST API.
     * @param {string} contractAddress - The NFT contract address.
     * @param {string|number} tokenId - The NFT token ID.
     * @param {string} apiKey - Your Alchemy API key.
     * @param {string} network - Alchemy network (e.g. "eth-mainnet", default: "eth-mainnet").
     * @returns {Promise<Object>} The parsed JSON response.
     */
    async getOwnersForNft(contractAddress, tokenId, apiKey, network = "eth-mainnet") {

        const baseUrl = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getOwnersForNFT`
        
        const params = new URLSearchParams({
            contractAddress,
            tokenId: tokenId.toString()
        })
        
        const url = `${baseUrl}?${params.toString()}`
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`)
        }

        return await response.json()
    }


    /**
     * Fetches all owners for an NFT contract using Alchemy's API.
     *
     * @param {string} apiKey        Your Alchemy API key.
     * @param {string} contractAddr  NFT contract address (e.g., ERC‑721 or ERC‑1155).
     * @returns {Promise<string[]>}  Array of owner wallet addresses.
     */
    async getOwnersForContract(contractAddr, apiKey, network = "eth-mainnet", pageKey = null) {

        const url = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getOwnersForContract`
        const params = new URLSearchParams({ 
            contractAddress: contractAddr, 
            withTokenBalances: 'true' 
        })

        if (pageKey != null) params.append('pageKey', pageKey)


        try {

            const res = await fetch(`${url}?${params.toString()}`)
            if (!res.ok) {
                const text = await res.text()
                throw new Error(`HTTP ${res.status}: ${text}`)
            }

            const data = await res.json()

            let results:any = {}

            results.ownerMap = data.owners.map( d => {
                return {
                    address: d.ownerAddress,
                    count: d.tokenBalances?.length || 0
                }
            })

            results.pageKey = data.pageKey

            return results

        } catch (err) {
            console.error('Failed to fetch owners for contract:', err)
            throw err
        }
    }

    async getAllOwnersForContract(contractAddr, apiKey, network = "eth-mainnet") {

        let allOwners = []
        let pageKey = null

        do {
            const result = await this.getOwnersForContract(contractAddr, apiKey, network, pageKey)
            allOwners = allOwners.concat(...result.ownerMap)
            pageKey = result.pageKey
            console.log(`Fetched ${allOwners.length} so far...`)
        } while (pageKey)

        return allOwners
    }



}


export {
    AirdropService
}