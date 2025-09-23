
require("@nomicfoundation/hardhat-verify")
require("@nomicfoundation/hardhat-ethers")
require("@nomicfoundation/hardhat-chai-matchers")

require("hardhat-gas-reporter")

const dotenv = require('dotenv');
const path = require('path');

let envPath = path.resolve(process.env.INIT_CWD ? process.env.INIT_CWD : "./", `.env.engine.${process.env.NODE_ENV}`);
dotenv.config({ path: envPath });

const { API_URL, PRIVATE_KEY } = process.env
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY
const PROVIDER_LINK = process.env.PROVIDER_LINK

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
 module.exports = {

  // etherscan: {
  //   apiKey: ETHERSCAN_API_KEY
  // },

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
      chainId: 1337,
      mining: {
        auto: false,
        interval: 5000
      }
    },

    // mainnet: {
    //   url: PROVIDER_LINK
    // },
  }
}
