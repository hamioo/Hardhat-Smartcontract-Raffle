/** @type import('hardhat/config').HardhatUserConfig */
require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const RPCURL_sepolia = process.env.RPC_URL_sepolia || "0"
const PrivateKey = process.env.Private_key || "0"
const RPCURL_Goerli = process.env.RPC_URL_Goerli || "0"
const etherscan_API_Key = process.env.etherscan_API_Key

module.exports = {
    solidity: "0.8.8",
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            // // If you want to do some forking, uncomment this
            // forking: {
            //   url: MAINNET_RPC_URL
            // }
            chainId: 31337,
        },
        localhost: {
            chainId: 31337,
        },
        sepolia: {
            url: RPCURL_sepolia,
            accounts: PrivateKey !== undefined ? [PrivateKey] : [],
            //   accounts: {
            //     mnemonic: MNEMONIC,
            //   },
            saveDeployments: true,
            chainId: 11155111,
        },
        goerli: {
            url: RPCURL_Goerli,
            accounts: PrivateKey !== undefined ? [PrivateKey] : [],
            saveDeployments: true,
            chainId: 5,
        },
    },
    etherscan: {
        apiKey: etherscan_API_Key,
    },
    gasReporter: {
        enabled: false,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
        player: {
            default: 1,
        },
    },
    mocha: {
        timeout: 500000, // 500 seconds max for running tests
    },
}
