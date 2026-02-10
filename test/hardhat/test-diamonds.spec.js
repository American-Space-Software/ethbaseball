import assert from 'assert'
import hre from 'hardhat'
import { expect } from 'chai'
import { AbiCoder, Signature } from 'ethers'

const { ethers, networkHelpers } = await hre.network.connect()
const { loadFixture, time } = networkHelpers

describe('Diamonds Contract', async () => {

  async function deployFunction() {

    const accounts = await ethers.getSigners()

    let contractFactory = await ethers.getContractFactory('Diamonds')
    let contract = await contractFactory.deploy(accounts[0].address, accounts[1].address)
    await contract.waitForDeployment()

    const diamondsContract = contract

    return { contract, diamondsContract, accounts }
  }

  it('should create admin and minter when deploying', async () => {

    const { contract, accounts } = await loadFixture(deployFunction)

    let hasMinter = await contract.connect(accounts[1]).hasRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), accounts[1].address)
    assert.strictEqual(hasMinter, true)

    let sanityHasMinter = await contract.connect(accounts[1]).hasRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), accounts[2].address)
    assert.strictEqual(sanityHasMinter, false)   


    let hasAdmin = await contract.connect(accounts[0]).hasRole(ethers.ZeroHash, accounts[0].address)
    assert.strictEqual(hasAdmin, true)

    let sanityHasAdmin = await contract.connect(accounts[0]).hasRole(ethers.ZeroHash, accounts[1].address)
    assert.strictEqual(sanityHasAdmin, false)

  })


  it('should fail to grant minter role if not admin', async () => {

    const { contract, accounts } = await loadFixture(deployFunction)

    await expect(
      contract
        .connect(accounts[4]).grantRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), accounts[2].address))
      .to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount")

  })

  it('should grant minter role to account', async () => {

    const { contract, accounts } = await loadFixture(deployFunction)

    //Check role before
    let hasRole = await contract.connect(accounts[0]).hasRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), accounts[2].address)
    assert.strictEqual(hasRole, false)

    let tx = await contract.connect(accounts[0]).grantRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), accounts[2].address)
    await tx.wait()

    hasRole = await contract.connect(accounts[0]).hasRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), accounts[2].address)
    assert.strictEqual(hasRole, true)

  })



  it('should fail to mint diamonds with wrong signature', async () => {

    const { diamondsContract, accounts } = await loadFixture(deployFunction)

    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')
    let expires = Number(await time.latest()) + 1000

    let sig = await signDiamondMint(accounts[2], accounts[0], mintPassId, amount, expires)

    await expect(
      diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)
    ).to.be.revertedWith('Must be signed by minter')
  })

  it('should fail to mint diamonds with wrong mint address', async () => {

    const { diamondsContract, accounts } = await loadFixture(deployFunction)

    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')
    let expires = Number(await time.latest()) + 1000

    let sig = await signDiamondMint(accounts[1], accounts[3], mintPassId, amount, expires)

    await expect(
      diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)
    ).to.be.revertedWith('Must be signed by minter')
  })

  it('should fail to mint diamonds with expired timestamp', async () => {

    const { diamondsContract, accounts } = await loadFixture(deployFunction)

    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')
    let expires = Number(await time.latest()) - 100

    let sig = await signDiamondMint(accounts[1], accounts[0], mintPassId, amount, expires)

    await expect(
      diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)
    ).to.be.revertedWith('Expired.')
  })

  it('should fail to mint diamonds with wrong wallet', async () => {

    const { diamondsContract, accounts } = await loadFixture(deployFunction)

    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')
    let expires = Number(await time.latest()) + 100

    let sig = await signDiamondMint(accounts[1], accounts[1], mintPassId, amount, expires)

    await expect(
      diamondsContract.connect(accounts[0]).mint(accounts[1].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)
    ).to.be.revertedWith('Wrong wallet.')
  })

  it('should mint tokens', async () => {

    const { diamondsContract, accounts } = await loadFixture(deployFunction)

    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')
    let expires = Number(await time.latest()) + 1000

    let sig = await signDiamondMint(accounts[1], accounts[0], mintPassId, amount, expires)

    let tx = await diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)
    await tx.wait()

    let balance = await diamondsContract.balanceOf(accounts[0].address)
    assert.strictEqual(balance.toString(), amount.toString())
  })

  it('should burn diamonds as deposit', async () => {

    const { diamondsContract, accounts } = await loadFixture(deployFunction)

    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')
    let expires = Number(await time.latest()) + 1000

    let sig = await signDiamondMint(accounts[1], accounts[0], mintPassId, amount, expires)
    let tx = await diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)
    await tx.wait()

    let tx2 = await diamondsContract.connect(accounts[0]).deposit(accounts[0].address, amount)
    let receipt = await tx2.wait()

    verifyDepositEvent(receipt.logs, accounts[0], 0, amount, diamondsContract)

    let balance = await diamondsContract.balanceOf(accounts[0].address)
    assert.equal(balance, 0n)
  })



})

const signDiamondMint = async (signer, to, mintPassId, amount, unixTimestamp) => {

  let payload = AbiCoder.defaultAbiCoder().encode([ "uint", "uint", "uint", "address", "uint" ], [ mintPassId, amount, unixTimestamp, to.address, 1 ])
  let payloadHash = ethers.keccak256(payload)

  // This adds the message prefix
  let signature = await signer.signMessage(ethers.getBytes(payloadHash))

  return  Signature.from(signature)

}

const mintDiamonds = async (contract, diamondsContract, minterSignerAccount, mintPassId, to, amount) => {

  let expires = await time.latest() + 1000

  let sig = await signDiamondMint(minterSignerAccount, to, mintPassId, amount, expires)

  let tx = await diamondsContract.connect(to).mint(to.address, mintPassId, amount, expires, sig.v, sig.r, sig.s)

  let receipt = await tx.wait()

  return receipt 

}

function verifyMintEvent(logs, to, mintPassId, amount) {

  let eventCount = 0
  for (let l of logs) {
    if (l.fragment.name === 'MintReward') {
      try {
        // console.log(l.args.tokenId.toString())
        assert.strictEqual(l.args[0].toString(), to.address.toString())
        assert.strictEqual(l.args[1].toString(), mintPassId.toString())
        assert.strictEqual(l.args[2].toString(), amount.toString())
        eventCount += 1
      } catch (ex) { }
    }
  }

  if (eventCount === 0) {
    assert(false, 'Missing MintReward Event')
  } else {
    assert(eventCount === 1, 'Unexpected number of MintReward events')
  }
}

function verifyDepositEvent(logs, from, teamId, amount, diamondsContract) {

  let eventCount = 0
  for (let l of logs) {
    let parsed = null
    try { parsed = diamondsContract.interface.parseLog({ topics: l.topics, data: l.data }) } catch (ex) { parsed = null }
    if (parsed && parsed.name === 'DepositToTeam') {
      try {
        assert.strictEqual(parsed.args[0].toString(), from.address.toString())
        assert.strictEqual(parsed.args[1].toString(), amount.toString())
        eventCount += 1
      } catch (ex) { }
    }
  }

  if (eventCount === 0) {
    assert(false, 'Missing DepositToTeam Event')
  } else {
    assert(eventCount === 1, 'Unexpected number of DepositToTeam events')
  }
}
