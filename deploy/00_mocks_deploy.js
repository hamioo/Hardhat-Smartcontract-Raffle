const { network, ethers } = require("hardhat")
const { developmentChains } = require("../hardhat.config.helper")

const BaseFee = ethers.utils.parseEther("0.25") //this is the premium , each request const 0.25LINK
const gasPriceLink = 1e9 //this id a calculated price based on the chain traffic,but here we set it a specified amount

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    const args = [BaseFee, gasPriceLink]

    if (developmentChains.includes(chainId)) {
        console.log("Local network detected , deploying mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        console.log("Mocks deployed")
        console.log("___________________________________")
    }
}

module.exports.tags = ["all", "mocks"]
