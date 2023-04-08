const { ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../hardhat.config.helper")
require("dotenv").config()
const { verify } = require("../utils/Verify")

const FUND_AMOUNT = ethers.utils.parseEther("2")
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts()
    const { deploy, log } = deployments
    const chainId = network.config.chainId

    /* args variables */
    let vrfCoordinatorV2, subscriptionId
    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const timeInterval = networkConfig[chainId]["timeInterval"]

    if (developmentChains.includes(chainId)) {
        const VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2 = VRFCoordinatorV2Mock.address
        const transactionResponse = await VRFCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.events[0].args.subId
        // we should fund the subscription for gas
        await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2 = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    args = [vrfCoordinatorV2, entranceFee, gasLane, subscriptionId, callbackGasLimit, timeInterval]

    console.log("deplying Raffle...")
    const Raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: 1,
    })
    console.log("Raffle deplyed")

    if (!developmentChains.includes(chainId) && process.env.etherscan_API_Key) {
        console.log("verifing...")
        await verify(Raffle.address, args)
        console.log("verified")
    }
    console.log("___________________________________")
}
module.exports.tags = ["all", "raffle"]
