import { defineConfig } from "hardhat/config"

import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers"




import dotenv from 'dotenv'
import path from 'path'

let envPath = path.resolve(process.env.INIT_CWD ? process.env.INIT_CWD : "./", `.env.engine.${process.env.NODE_ENV}`)
dotenv.config({ path: envPath })

// const { API_URL, PRIVATE_KEY } = process.env
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
// const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY
const PROVIDER_LINK = process.env.PROVIDER_LINK


let config:any = {

  plugins: [hardhatToolboxMochaEthers],

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache/hardhat",
    artifacts: "./artifacts/hardhat"
  },

  verify: {
    etherscan: {
      apiKey: ETHERSCAN_API_KEY || ""
    }
  },

  // gasReporter: {
  //   L1: "ethereum",
  //   currency: "usd",
  //   etherscan: ETHERSCAN_API_KEY,    // Etherscan api key
  //   coinmarketcap: COINMARKETCAP_API_KEY,
  //   enabled: true,
  //   includeIntrinsicGas: true
  // },

  solidity: {
    version: "0.8.21",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100000
      }
    },
  },

  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true
  },

  networks: {

    hardhat: {
      type: "edr-simulated",
      chainType: "generic",
      mining: {
        auto: false,
        interval: 5000
      }
    },

    mainnet: {
      type: "http",
      chainType: "l1",
      url: PROVIDER_LINK
    }

  }
}

export default defineConfig(config)
