// let Baseballs = artifacts.require("Baseballs")
// let BaseballWords = artifacts.require("BaseballWords")
let Words = artifacts.require("Words")
// let TokenUri = artifacts.require("TokenUri")
let FranchiseERC721 = artifacts.require("FranchiseERC721")
let TeamERC20 = artifacts.require("TeamERC20")


module.exports = async function (deployer, network) {

    let baseballWordsAddress = "0x48FF230a8C15898B21Ed59098420272Bd05053FB"
    let wordsAddress = "0x4d9f5EcD1119FF146A1e99b05713Ae176181b313"

    try {

        await deployer.deploy(FranchiseERC721, baseballWordsAddress, wordsAddress)
        await deployer.deploy(TeamERC20, FranchiseERC721.address)

        let franchiseInstance = await FranchiseERC721.deployed()
        let teamInstance = await TeamERC20.deployed()

        //Set team address
        await franchiseInstance.setTeamAddress(TeamERC20.address)

        //Then transfer ownership
        await teamInstance.transferOwnership(FranchiseERC721.address)

    } catch (e) {
        console.log(`Error in migration: ${e.message}`)
    }
}