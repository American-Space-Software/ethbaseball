import assert from 'assert'
import hre from "hardhat"
const ethers = hre.ethers
const Signature = ethers.Signature
const AbiCoder = ethers.AbiCoder
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from "chai"



describe('Universe Contract', async (accounts) => {

  async function deployFunction() {

    const accounts = await ethers.getSigners()

    let universeFactory = await hre.ethers.getContractFactory("Universe")
    let contract = await universeFactory.deploy(accounts[0].address, accounts[1].address, "abc")

    let diamondsAddress = await contract.connect(accounts[0]).getDiamondAddress()


    let diamondsFactory = await hre.ethers.getContractFactory("Diamonds")

    const diamondsContract = diamondsFactory.attach(
      diamondsAddress
    )

    return { contract, diamondsContract, accounts }
  }



  before("", async () => {

  })

  after("After", async () => {
  })


  it("should fail to get tokenURI if token doesn't exist", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

    await expect(contract.connect(accounts[0]).tokenURI(1)).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token")
  })

  const signTeam = async (signer, to, tokenId, amount, unixTimestamp) => {

    let payload = AbiCoder.defaultAbiCoder().encode([ "uint", "uint", "uint", "address", "uint" ], [ tokenId, amount, unixTimestamp, to.address, 0 ])
    let payloadHash = ethers.keccak256(payload)

    // This adds the message prefix
    let signature = await signer.signMessage(ethers.getBytes(payloadHash))

    return  Signature.from(signature)

  }

  const signTeamDiamonds = async (signer, to, tokenId, amount, unixTimestamp) => {

    let payload = AbiCoder.defaultAbiCoder().encode([ "uint", "uint", "uint", "address", "uint"  ], [ tokenId, amount, unixTimestamp, to.address, 2 ])
    let payloadHash = ethers.keccak256(payload)

    // This adds the message prefix
    let signature = await signer.signMessage(ethers.getBytes(payloadHash))

    return  Signature.from(signature)

  }

  const signDiamondWithdraw = async (signer, to, mintPassId, amount, teamId, unixTimestamp) => {

    let payload = AbiCoder.defaultAbiCoder().encode([ "uint", "uint", "uint", "uint", "address", "uint" ], [ mintPassId, amount, teamId, unixTimestamp, to.address, 3 ])
    let payloadHash = ethers.keccak256(payload)

    // This adds the message prefix
    let signature = await signer.signMessage(ethers.getBytes(payloadHash))

    return  Signature.from(signature)

  }

  const signDiamondMint = async (signer, to, mintPassId, amount, unixTimestamp) => {

    let payload = AbiCoder.defaultAbiCoder().encode([ "uint", "uint", "uint", "address", "uint" ], [ mintPassId, amount, unixTimestamp, to.address, 4 ])
    let payloadHash = ethers.keccak256(payload)

    // This adds the message prefix
    let signature = await signer.signMessage(ethers.getBytes(payloadHash))

    return  Signature.from(signature)

  }

  it("should fail to mint player with wrong signature", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

    let tokenId = 1
    let ethCost = ethers.parseUnits('2', 'ether')
    let expires = parseInt((new Date().getTime() / 1000).toFixed(0))

    let sig = await signTeam(accounts[2], accounts[0], tokenId, ethCost, expires)

    await expect(contract.connect(accounts[0]).mint(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Must be signed by minter")

    // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  })

  it("should fail to mint player with wrong amount of ETH", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

    let tokenId = 1
    let ethCost = ethers.parseUnits('2', 'ether')
    let expires = parseInt((new Date().getTime() / 1000).toFixed(0))

    let sig = await signTeam(accounts[1], accounts[1], tokenId, ethCost, expires)

    // await expect(contract.connect(accounts[0]).mint(accounts[1].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Send exact ETH")

    await expect(contract.connect(accounts[1]).mint(accounts[1].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('110', 'ether')})).to.be.revertedWith("Send exact ETH")


  })

  it("should fail to mint player with wrong mint address", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

    let tokenId = 1
    let ethCost = ethers.parseUnits('2', 'ether')
    let expires = parseInt((new Date().getTime() / 1000).toFixed(0))

    let sig = await signTeam(accounts[1], accounts[3], tokenId, ethCost, expires)

    await expect(contract.connect(accounts[0]).mint(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Must be signed by minter")

    // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  })

  it("should fail to mint player with expired timestamp", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
    let tokenId = 1
    let ethCost = ethers.parseUnits('2', 'ether')
    let expires = await time.latest() - 100

    let sig = await signTeam(accounts[1], accounts[0], tokenId, ethCost, expires)

    await expect(contract.connect(accounts[0]).mint(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('2', 'ether')})).to.be.revertedWith("Expired.")


    // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  })

  it("should fail to mint player with wrong wallet", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
    let tokenId = 1
    let ethCost = ethers.parseUnits('2', 'ether')
    let expires = await time.latest() + 100

    let sig = await signTeam(accounts[1], accounts[1], tokenId, ethCost, expires)

    await expect(contract.connect(accounts[0]).mint(accounts[1].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('2', 'ether')})).to.be.revertedWith("Wrong wallet.")


    // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  })

  const mintPlayer = async (contract, minterSignerAccount, to, tokenId, ethCost ) => {

    let expires = await time.latest() + 1000

    let sig = await signTeam(minterSignerAccount, to, tokenId, ethCost, expires)

    let tx = await contract.connect(to).mint(to.address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethCost })

  }

  it("should mint player", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
    let tokenId = 1
    let ethCost = ethers.parseUnits('2', 'ether')

    await mintPlayer(contract, accounts[1], accounts[0], tokenId, ethCost)

    let owner1= await contract.connect(accounts[0]).ownerOf(tokenId)
    assert.equal(owner1, accounts[0].address)

  })

  it("should fail to mint player if already minted", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
    let tokenId = 1
    let ethCost = ethers.parseUnits('2', 'ether')
    let expires = await time.latest() + 1000

    let sig = await signTeam(accounts[1], accounts[0], tokenId, ethCost, expires)

    await contract.connect(accounts[0]).mint(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('2', 'ether')})


    await expect(contract.connect(accounts[0]).mint(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('2', 'ether')})).to.be.revertedWith("Token is already owned.")


    // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  })

  it("should burn diamonds as deposit", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
    let tokenId = 3
    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')

    await mintPlayer(contract, accounts[1], accounts[0], tokenId, ethers.parseUnits('2', 'ether'))

    await time.increase(3600)

    let expires = await time.latest() + 1000

    //First withdraw diamonds
    let sig = await signDiamondMint(accounts[1], accounts[0], mintPassId, amount, expires)
    let tx = await diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)
    await tx.wait()


    //Then burn them
    let tx2 = await diamondsContract.connect(accounts[0]).deposit(accounts[0].address, amount)
    let receipt = await tx2.wait()

    verifyDepositEvent(receipt.logs, accounts[0], tokenId, amount)

    let balance= await diamondsContract.connect(accounts[0]).balanceOf(accounts[0].address)
    assert.equal(balance, 0n)

  })






  it("should fail to mint diamonds with wrong signature", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')
    let expires = parseInt((new Date().getTime() / 1000).toFixed(0))



    let sig = await signDiamondMint(accounts[2], accounts[0], mintPassId, amount, expires)

    await expect(diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Must be signed by minter")


  })

  it("should fail to mint diamonds with wrong mint address", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')
    let expires = parseInt((new Date().getTime() / 1000).toFixed(0))


    let sig = await signDiamondMint(accounts[1], accounts[3], mintPassId, amount, expires)

    await expect(diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Must be signed by minter")


  })

  it("should fail to mint diamonds with expired timestamp", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')
    let expires = await time.latest() - 100


    let sig = await signDiamondMint(accounts[1], accounts[0], mintPassId, amount, expires)

    await expect(diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Expired.")


    // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  })

  it("should fail to mint diamonds with wrong wallet", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')
    let expires = await time.latest() + 100

    let sig = await signDiamondMint(accounts[1], accounts[1], mintPassId, amount, expires)

    await expect(diamondsContract.connect(accounts[0]).mint(accounts[1].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Wrong wallet.")


    // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  })

  const mintDiamonds = async (contract, diamondsContract, minterSignerAccount, mintPassId, to, amount) => {

    let expires = await time.latest() + 1000

    let sig = await signDiamondMint(minterSignerAccount, to, mintPassId, amount, expires)

    let tx = await diamondsContract.connect(to).mint(to.address, mintPassId, amount, expires, sig.v, sig.r, sig.s)

    let receipt = await tx.wait()

    return receipt 

  }

  it("should mint diamonds", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')

    let receipt = await mintDiamonds(contract, diamondsContract, accounts[1], mintPassId, accounts[0], amount)

    verifyMintEvent(receipt.logs, accounts[0], mintPassId, amount)

    let balance= await diamondsContract.connect(accounts[0]).balanceOf(accounts[0].address)

    assert.equal(balance, 2000000000000000000n)

  })

  it("should fail to mint diamonds if mint pass already used", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')


    let expires = await time.latest() + 1000

    let sig = await signDiamondMint(accounts[1], accounts[0], mintPassId, amount, expires)

    await diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)


    await expect(diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Mint pass already used.")



  })

  it("should fail to mint diamonds with expired timestamp", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
    let mintPassId = 1
    let amount = ethers.parseUnits('2', 'ether')
    let expires = await time.latest() - 100


    let sig = await signDiamondMint(accounts[1], accounts[0], mintPassId, amount, expires)

    await expect(diamondsContract.connect(accounts[0]).mint(accounts[0].address, mintPassId, amount, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Expired.")


    // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  })











  const mintToken = async (contract, accounts, tokenId, ethCost, expires) => {

    let sig = await signTeam(accounts[1], accounts[0], tokenId, ethCost, expires)
    return contract.connect(accounts[0]).mint(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('2', 'ether')})

  }



  it("should fail to withdraw if not owner", async () => {

      const { contract, accounts } = await loadFixture(deployFunction)

      let tokenId = 1
      let ethCost = ethers.parseUnits('2', 'ether')
      let expires = await time.latest() + 1000

      let sig = await signTeam(accounts[1], accounts[0], tokenId, ethCost, expires)

      let tx = await contract.connect(accounts[0]).mint(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('2', 'ether')})
      await tx.wait()

      await expect(contract.connect(accounts[4]).withdraw()).to.be.revertedWithCustomError(
        contract,
        "AccessControlUnauthorizedAccount"
      ).withArgs("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", "0x0000000000000000000000000000000000000000000000000000000000000000");

      // await expect(contract.connect(accounts[4]).withdraw()).to.be.revertedWith("AccessControl: account 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")

  })

  it("should withdraw if owner", async () => {

      const { contract, accounts } = await loadFixture(deployFunction)

      let tokenId = 1
      let ethCost = ethers.parseUnits('2', 'ether')
      let expires = await time.latest() + 1000

      let sig = await signTeam(accounts[1], accounts[0], tokenId, ethCost, expires)

      let tx = await contract.connect(accounts[0]).mint(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('2', 'ether')})
      await tx.wait()


      // let beforeBalance = await web3.eth.getBalance(user0)

      //Check contract balance
      let contractBalanceTotal = await ethers.provider.getBalance(contract)
      assert.strictEqual(contractBalanceTotal.toString(), '2000000000000000000')

      //Check user balance
      let beforeUserBalance = await ethers.provider.getBalance(accounts[0])
      // assert.strictEqual(beforeUserBalance.toString(), '9999995179418125000000')


      let receipt = await contract.connect(accounts[0]).withdraw()
      const gasUsed = receipt.gasUsed


      //Check contract balance
      let afterContractBalance = await ethers.provider.getBalance(contract)

      //Check user balance
      // let afterUserBalance = await ethers.provider.getBalance(accounts[0])
      // assert.strictEqual(afterUserBalance - beforeUserBalance > 9999900000000000000n, true)

      assert.strictEqual(afterContractBalance.toString(), '0')

      // console.log(contractBalance)
      // console.log(afterBalance)
      // console.log(beforeBalance - afterBalance + gasUsed)
      // console.log( toBN(web3.utils.toWei( (10 * 0.08).toString() , 'ether')).sub(toBN(gasUsed)).toString()  )

  })

  it("should get contract metadata", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

    let tokenId = 1
    let ethCost = ethers.parseUnits('2', 'ether')
    let expires = await time.latest() + 1000

    let sig = await signTeam(accounts[1], accounts[0], tokenId, ethCost, expires)

    let tx = await contract.connect(accounts[0]).mint(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('2', 'ether')})
    await tx.wait()

    //Only gets a result if there are players
    let uri = await contract.connect(accounts[4]).contractURI()
    assert.strictEqual(uri, `ipfs://abc/contractMetadata.json`)

  })

  it("should fail to update if not minter", async () => {

    const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

    await expect(contract.connect(accounts[4]).update("blah")).to.be.revertedWithCustomError(
      contract,
      "AccessControlUnauthorizedAccount"
    ).withArgs("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6");


    // await expect(contract.connect(accounts[4]).update("blah"), 1).to.be.revertedWith(`AccessControlUnauthorizedAccount("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6")`)

  })


})


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


function verifyWithDrawEvent(logs, to, mintPassId, teamId, amount) {

  let eventCount = 0
  for (let l of logs) {
    if (l.fragment.name === 'WithdrawFromTeam') {
      try {
        // console.log(l.args.tokenId.toString())
        assert.strictEqual(l.args[0].toString(), to.address.toString())
        assert.strictEqual(l.args[1].toString(), mintPassId.toString())
        assert.strictEqual(l.args[2].toString(), amount.toString())
        assert.strictEqual(l.args[3].toString(), teamId.toString())
        eventCount += 1
      } catch (ex) { }
    }
  }

  if (eventCount === 0) {
    assert(false, 'Missing WithdrawFromTeam Event')
  } else {
    assert(eventCount === 1, 'Unexpected number of WithdrawFromTeam events')
  }
}

function verifyDepositEvent(logs, from, teamId, amount) {

  let eventCount = 0
  for (let l of logs) {
    if (l.fragment.name === 'DepositToTeam') {
      try {
        // console.log(l.args.tokenId.toString())
        assert.strictEqual(l.args[0].toString(), from.address.toString())
        assert.strictEqual(l.args[1].toString(), amount.toString())
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

// it("should fail to withdraw diamonds with expired timestamp", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 3
  //   let mintPassId = 1
  //   let amount = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() - 100

  //   await mintTeam(contract, accounts[1], accounts[0], tokenId, ethers.parseUnits('2', 'ether'))


  //   let sig = await signDiamondWithdraw(accounts[1], accounts[0], mintPassId, amount, tokenId, expires)

  //   await expect(diamondsContract.connect(accounts[0]).withdraw(accounts[0].address, mintPassId, amount, tokenId, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Expired.")


  //   // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  // })


  // it("should update if minter", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

  //   //First draft 10
  //   let tx = await contract.connect(accounts[1]).draftTeam(accounts[1].address, { value: ethers.parseUnits('1000', 'ether')})
  //   await tx.wait()

  //   assert.strictEqual(await contract.connect(accounts[4]).tokenURI(10), `ipfs://abc/metadata/generating.json`)


  //   let tx2 = await contract.connect(accounts[1]).update("blah")
  //   let receipt = await tx2.wait()

  //   verifyUpdateEvent(receipt.logs)

  //   assert.strictEqual(await contract.connect(accounts[1]).getIpfsCid(), "blah") 

  //   assert.strictEqual(await contract.connect(accounts[4]).tokenURI(10), `ipfs://blah/metadata/10.json`)
  // })




















  
  // it("should fail to mint foreclosed team with wrong signature", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

  //   let tokenId = 1
  //   let ethCost = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() + 1000

  //   //First actually mint it so it exists.
  //   await mintToken(contract, accounts, tokenId, ethCost, expires)

  //   //Now foreclose with wrong signature
  //   let sig = await signTeamForclosure(accounts[2], accounts[0], tokenId, ethCost, expires)
  //   await expect(contract.connect(accounts[0]).mintForeclosure(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Must be signed by minter")

  //   // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  // })

  // it("should fail to mint foreclosed team with wrong amount of ETH", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

  //   let tokenId = 1
  //   let ethCost = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() + 1000

  //   //First actually mint it so it exists.
  //   await mintToken(contract, accounts, tokenId, ethCost, expires)

  //   let sig = await signTeamForclosure(accounts[1], accounts[0], tokenId, ethCost, expires)

  //   // await expect(contract.connect(accounts[0]).mint(accounts[1].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Send exact ETH")

  //   await expect(contract.connect(accounts[1]).mintForeclosure(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('110', 'ether')})).to.be.revertedWith("Send exact ETH")


  // })

  // it("should fail to mint foreclosed team with wrong mint address", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

  //   let tokenId = 1
  //   let ethCost = ethers.parseUnits('2', 'ether')
  //   let expires =await time.latest() + 1000

  //   //First actually mint it so it exists.
  //   await mintToken(contract, accounts, tokenId, ethCost, expires)

  //   let sig = await signTeamForclosure(accounts[1], accounts[3], tokenId, ethCost, expires)

  //   await expect(contract.connect(accounts[0]).mintForeclosure(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Must be signed by minter")

  //   // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  // })

  // it("should fail to mint foreclosed team with expired timestamp", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 1
  //   let ethCost = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() - 100

  //   //First actually mint it so it exists.
  //   await mintToken(contract, accounts, tokenId, ethCost, await time.latest() + 1000)


  //   let sig = await signTeamForclosure(accounts[1], accounts[0], tokenId, ethCost, expires)

  //   await expect(contract.connect(accounts[0]).mintForeclosure(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('2', 'ether')})).to.be.revertedWith("Expired.")


  //   // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  // })

  // it("should fail to mint foreclosed team if not already minted", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 200
  //   let ethCost = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() + 1000

  //   let sig = await signTeamForclosure(accounts[1], accounts[0], tokenId, ethCost, expires)

  //   await expect(contract.connect(accounts[0]).mintForeclosure(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('2', 'ether')})).to.be.revertedWith("Token is not owned.")


  //   // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  // })

  // it("should mint foreclosed team", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 1
  //   let ethCost = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() + 1000

  //   //First actually mint it so it exists.
  //   await mintToken(contract, accounts, tokenId, ethCost, await time.latest() + 1000)

  //   //Mint with account 3
  //   let sig = await signTeamForclosure(accounts[1], accounts[3], tokenId, ethCost, expires)

  //   let tx = await contract.connect(accounts[3]).mintForeclosure(accounts[3].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s, { value: ethers.parseUnits('2', 'ether')})


  //   let owner1= await contract.connect(accounts[3]).ownerOf(tokenId)

  //   assert.equal(owner1, accounts[3].address)

  // })




  // it("should set team transfer lock an hour in future after diamond withdraw", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let mintPassId = 1
  //   let tokenId = 1
  //   let amount = ethers.parseUnits('2', 'ether')

  //   let receipt = await withdrawDiamonds(contract, diamondsContract, accounts[1], mintPassId, tokenId, accounts[0], amount)

  //   let locked = await diamondsContract.connect(accounts[0]).teamDiamondLockExpires(tokenId)

  //   const latestBlock = await hre.ethers.provider.getBlock("latest")

  //   assert.equal(locked.toString(), (latestBlock.timestamp + 3600).toString())


  // })

  // it("should fail to transfer diamonds if diamond lock set.", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 1
  //   let ethCost = ethers.parseUnits('2', 'ether')

  //   await mintTeam(contract, accounts[1], accounts[0], tokenId, ethCost)

  //   let owner1= await contract.connect(accounts[0]).ownerOf(tokenId)
  //   assert.equal(owner1, accounts[0].address)


  //   let mintPassId = 1
  //   let amount = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() + 1000

  //   let sig = await signDiamondWithdraw(accounts[1], accounts[0], mintPassId, amount, tokenId, expires)

  //   await diamondsContract.connect(accounts[0]).withdraw(accounts[0].address, mintPassId, amount, tokenId, expires, sig.v, sig.r, sig.s)

  //   await expect(contract.connect(accounts[0]).transferFrom(accounts[0].address, accounts[3].address, tokenId)).to.be.revertedWith("Transfer locked from withdraw.")


  // })









  // it("should fail to withdraw diamonds with wrong signature", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

  //   let tokenId = 3
  //   let mintPassId = 1
  //   let amount = ethers.parseUnits('2', 'ether')
  //   let expires = parseInt((new Date().getTime() / 1000).toFixed(0))

  //   //Mint team
  //   await mintTeam(contract, accounts[1], accounts[0], tokenId, ethers.parseUnits('2', 'ether'))


  //   let sig = await signDiamondWithdraw(accounts[2], accounts[0], mintPassId, amount, tokenId, expires)

  //   await expect(diamondsContract.connect(accounts[0]).withdraw(accounts[0].address, mintPassId, amount, tokenId, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Must be signed by minter")


  // })

  // it("should fail to withdraw diamonds with wrong mint address", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

  //   let tokenId = 3
  //   let mintPassId = 1
  //   let amount = ethers.parseUnits('2', 'ether')
  //   let expires = parseInt((new Date().getTime() / 1000).toFixed(0))

  //   //Mint team
  //   await mintTeam(contract, accounts[1], accounts[0], tokenId, ethers.parseUnits('2', 'ether'))

  //   let sig = await signDiamondWithdraw(accounts[1], accounts[3], mintPassId, amount, tokenId, expires)

  //   await expect(diamondsContract.connect(accounts[0]).withdraw(accounts[0].address, mintPassId, amount, tokenId, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Must be signed by minter")

  //   // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  // })


  // it("should fail to withdraw diamonds with expired timestamp", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 3
  //   let mintPassId = 1
  //   let amount = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() - 100

  //   //Mint team
  //   await mintTeam(contract, accounts[1], accounts[0], tokenId, ethers.parseUnits('2', 'ether'))

  //   let sig = await signDiamondWithdraw(accounts[1], accounts[0], mintPassId, amount, tokenId, expires)

  //   await expect(diamondsContract.connect(accounts[0]).withdraw(accounts[0].address, mintPassId, amount, tokenId, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Expired.")


  //   // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  // })

  // it("should fail to withdraw diamonds with wrong wallet", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let teamId = 3
  //   let mintPassId = 1
  //   let amount = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() + 100

  //   let sig = await signDiamondWithdraw(accounts[1], accounts[1], mintPassId, amount, teamId, expires)

  //   await expect(diamondsContract.connect(accounts[0]).withdraw(accounts[1].address, mintPassId, amount, teamId, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Wrong wallet.")


  //   // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  // })

  // const withdrawDiamonds = async (contract, diamondsContract, minterSignerAccount, mintPassId, tokenId, to, amount) => {

  //   await mintTeam(contract, minterSignerAccount, to, tokenId, ethers.parseUnits('2', 'ether'))

  //   await time.increase(3600)

  //   let expires = await time.latest() + 1000

  //   let sig = await signDiamondWithdraw(minterSignerAccount, to, mintPassId, amount, tokenId, expires)

  //   let tx = await diamondsContract.connect(to).withdraw(to.address, mintPassId, amount, tokenId, expires, sig.v, sig.r, sig.s)

  //   let receipt = await tx.wait()

  //   return receipt 

  // }

  // it("should withdraw diamonds", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 3
  //   let mintPassId = 1
  //   let amount = ethers.parseUnits('2', 'ether')

  //   let receipt = await withdrawDiamonds(contract, diamondsContract, accounts[1], mintPassId, tokenId, accounts[0], amount)

  //   verifyWithDrawEvent(receipt.logs , accounts[0], mintPassId, tokenId, amount)

  //   let balance= await diamondsContract.connect(accounts[0]).balanceOf(accounts[0].address)

  //   assert.equal(balance, 2000000000000000000n)

  // })

  // it("should fail to withdraw diamonds if mint pass already used", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 3
  //   let mintPassId = 1
  //   let amount = ethers.parseUnits('2', 'ether')

  //   await mintTeam(contract, accounts[1], accounts[0], tokenId, ethers.parseUnits('2', 'ether'))

  //   await time.increase(3600)

  //   let expires = await time.latest() + 1000

  //   let sig = await signDiamondWithdraw(accounts[1], accounts[0], mintPassId, amount, tokenId, expires)

  //   await diamondsContract.connect(accounts[0]).withdraw(accounts[0].address, mintPassId, amount, tokenId, expires, sig.v, sig.r, sig.s)


  //   await expect(diamondsContract.connect(accounts[0]).withdraw(accounts[0].address, mintPassId, amount, tokenId, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Mint pass already used.")


  //   // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  // })


  // it("should fail to withdraw diamonds if team is transferred to another owner after mint pass is issued.", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 3
  //   let mintPassId = 1
  //   let amount = ethers.parseUnits('2', 'ether')


  //   await mintTeam(contract, accounts[1], accounts[0], tokenId, ethers.parseUnits('2', 'ether'))

  //   await time.increase(3600)

  //   let expires = await time.latest() + 1000


  //   //First let's do one that succeeds
  //   let sig = await signDiamondWithdraw(accounts[1], accounts[0], mintPassId, amount, tokenId, expires)
    

  //   let tx = await diamondsContract.connect(accounts[0]).withdraw(accounts[0].address, mintPassId, amount, tokenId, expires, sig.v, sig.r, sig.s)
  //   let receipt = await tx.wait()
  //   verifyWithDrawEvent(receipt.logs, mintPassId, tokenId, amount)

  //   let balance= await diamondsContract.connect(accounts[0]).balanceOf(accounts[0].address)
  //   assert.equal(balance, 2000000000000000000n)



    

  //   //Now a second one but before executing it transfer the team to another owner.
  //   await contract.connect(accounts[0]).transferFrom(accounts[0].address, accounts[3].address, tokenId)

  //   let owner1= await contract.connect(accounts[3]).ownerOf(tokenId)
  //   assert.equal(owner1, accounts[3].address)



  //   mintPassId = 2

  //   await expect(diamondsContract.connect(accounts[0]).withdraw(accounts[0].address, mintPassId, amount, tokenId, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Not team owner.")




  //   // assert.equal(ethers.verifyMessage(ethers.getBytes(payloadHash), sig), accounts[1].address)

  // })

  // it("should fail to burn diamonds as deposit if not team owner", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 3
  //   let mintPassId = 1
  //   let amount = ethers.parseUnits('2', 'ether')
  
  //   await mintTeam(contract, accounts[1], accounts[0], tokenId, ethers.parseUnits('2', 'ether'))
  
  //   await time.increase(3601)

  //   let expires = await time.latest() + 1000

  //   //First mint diamonds
  //   let sig = await signDiamondWithdraw(accounts[1], accounts[0], mintPassId, amount, tokenId, expires)
  //   let tx = await diamondsContract.connect(accounts[0]).withdraw(accounts[0].address, mintPassId, amount, tokenId, expires, sig.v, sig.r, sig.s)
  //   await tx.wait()
  
  

  //   //Now a second one but before executing it transfer the team to another owner.
  //   await contract.connect(accounts[0]).transferFrom(accounts[0].address, accounts[3].address, tokenId)

  //   let owner1= await contract.connect(accounts[3]).ownerOf(tokenId)
  //   assert.equal(owner1, accounts[3].address)

  //   //Then burn them
  //   await expect(diamondsContract.connect(accounts[0]).deposit(accounts[0].address, amount, tokenId)).to.be.revertedWith("Not team owner.")


  // })



  // it("should fail to mint team with diamonds with wrong signature", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

  //   let tokenId = 1
  //   let ethCost = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() + 1000

  //   //Now foreclose with wrong signature
  //   let sig = await signTeamDiamonds(accounts[2], accounts[0], tokenId, ethCost, expires)
  //   await expect(contract.connect(accounts[0]).mintWithDiamonds(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Must be signed by minter")

  // })

  // it("should fail to mint team with diamonds with insufficient diamonds", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

  //   let tokenId = 1
  //   let ethCost = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() + 1000

  //   let sig = await signTeamDiamonds(accounts[1], accounts[0], tokenId, ethCost, expires)

  //   await expect(contract.connect(accounts[0]).mintWithDiamonds(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Insufficient diamonds")


  // })

  // it("should fail to mint team with diamonds with wrong mint address", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)

  //   let tokenId = 1
  //   let ethCost = ethers.parseUnits('2', 'ether')
  //   let expires =await time.latest() + 1000

  //   let sig = await signTeamDiamonds(accounts[1], accounts[3], tokenId, ethCost, expires)

  //   await expect(contract.connect(accounts[0]).mintWithDiamonds(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Must be signed by minter")

  // })

  // it("should fail to mint team with diamonds with expired timestamp", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 1
  //   let mintPassId = 1
  //   let ethCost = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() - 100

  //   //First mint diamonds
  //   let diamondTeamId = 2
  //   let receipt = await withdrawDiamonds(contract, diamondsContract, accounts[1], mintPassId, diamondTeamId, accounts[0], ethCost)



  //   let sig = await signTeamDiamonds(accounts[1], accounts[0], tokenId, ethCost, expires)

  //   await expect(contract.connect(accounts[0]).mintWithDiamonds(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s)).to.be.revertedWith("Expired.")

  // })

  // it("should mint team with diamonds", async () => {

  //   const { contract, diamondsContract, accounts } = await loadFixture(deployFunction)
    
  //   let tokenId = 1
  //   let mintPassId = 1
  //   let ethCost = ethers.parseUnits('2', 'ether')
  //   let expires = await time.latest() + 5000


  //   //First mint diamonds
  //   let diamondTeamId = 2
  //   let receipt = await withdrawDiamonds(contract, diamondsContract, accounts[1], mintPassId, diamondTeamId, accounts[0], ethCost)


  //   let balance= await diamondsContract.connect(accounts[0]).balanceOf(accounts[0].address)
  //   assert.equal(balance, 2000000000000000000n)


  //   //Mint with account 3
  //   let sig = await signTeamDiamonds(accounts[1], accounts[0], tokenId, ethCost, expires)

  //   let tx = await contract.connect(accounts[0]).mintWithDiamonds(accounts[0].address, tokenId, ethCost, expires, sig.v, sig.r, sig.s)


  //   let owner1= await contract.connect(accounts[0]).ownerOf(tokenId)

  //   assert.equal(owner1, accounts[0].address)


  //   let balance2= await diamondsContract.connect(accounts[0]).balanceOf(accounts[0].address)
  //   assert.equal(balance2, 0n)

  // })









