import assert from 'assert'
import hre from "hardhat"

const ethers = hre.ethers

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from "chai"


describe('Diamonds Contract', async (accounts) => {

  async function deployFunction() {

    const accounts = await ethers.getSigners()


    // we will call this function in our tests to deploy a new contract and add an owner
    let contractFactory = await hre.ethers.getContractFactory("Diamonds")
    let contract = await contractFactory.deploy(accounts[0].address, "abc")

    return { contract, accounts }
  }



  before("", async () => {

  })

  after("After", async () => {
  })


  it("should fail to grant minter role if not admin", async () => {

    const { contract, accounts } = await loadFixture(deployFunction)
    await expect(contract.connect(accounts[4]).grantRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), accounts[1].address)).to.be.revertedWith("AccessControl: account 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")

  })

  it("should grant minter role to account", async () => {

    const { contract, accounts } = await loadFixture(deployFunction)

    //Check role before
    let hasRole = await contract.connect(accounts[0]).hasRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), accounts[1].address)
    assert.strictEqual(hasRole, false)

    let tx = await contract.connect(accounts[0]).grantRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), accounts[1].address)
    await tx.wait()

    hasRole = await contract.connect(accounts[0]).hasRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), accounts[1].address)
    assert.strictEqual(hasRole, true)

  })



    it("should fail to mint tokens with account missing MINTER_ROLE", async () => {

      const { contract, accounts } = await loadFixture(deployFunction)

      await expect(contract.connect(accounts[4]).mint(accounts[4].address, 100)).to.be.revertedWith("AccessControl: account 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65 is missing role 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6")

    })

    it("should mint tokens", async () => {

      const { contract, accounts } = await loadFixture(deployFunction)

      //First give wallet 1 permission to mint
      let tx = await contract.connect(accounts[0]).grantRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), accounts[1].address)
      await tx.wait()


      //Now mint
      await contract.connect(accounts[1]).mint(accounts[4].address, 100)

      //Check balance 
      let balance = await contract.balanceOf(accounts[4].address)

      assert.strictEqual(balance.toString(), "100")


    })


  // it("should fail to update mint fee if not owner", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

  //   await expect(contract.connect(accounts[4]).updateMintFee(ethers.parseUnits('300', 'ether'))).to.be.revertedWith("AccessControl: account 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")

  // })

  // it("should update mint fee if owner", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

  //   //First draft 10
  //   let tx = await contract.connect(accounts[0]).updateMintFee(ethers.parseUnits('300', 'ether'))

  //   let receipt = await tx.wait()

  //   assert.strictEqual(await contract.connect(accounts[1]).getMintFee(), ethers.parseUnits('300', 'ether')) 

  // })



})

function verifyMintEvent(logs, tokenId) {

  let eventCount = 0
  for (let l of logs) {
    if (l.fragment.name === 'MintEvent') {
      try {
        // console.log(l.args.tokenId.toString())
        assert.strictEqual(l.args.tokenId.toString(), tokenId.toString())
        eventCount += 1
      } catch (ex) { }
    }
  }

  if (eventCount === 0) {
    assert(false, 'Missing Mint Event')
  } else {
    assert(eventCount === 1, 'Unexpected number of Mint events')
  }
}

function verifyUpdateEvent(logs) {

  let eventCount = 0
  for (let l of logs) {
    if (l.fragment.name === 'BatchMetadataUpdate') {
      try {
        // console.log(l.args.tokenId.toString())
        assert.strictEqual(l.args[0].toString(), "1")
        assert.strictEqual(l.args[1].toString(), "115792089237316195423570985008687907853269984665640564039457584007913129639935")

        eventCount += 1
      } catch (ex) { }
    }
  }

  if (eventCount === 0) {
    assert(false, 'Missing BatchMetadataUpdate Event')
  } else {
    assert(eventCount === 1, 'Unexpected number of BatchMetadataUpdate events')
  }
}