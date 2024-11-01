const { developmentChains } = require("../helper-hardhat-config")
const BASE_FEE = ethers.parseEther("0.25") //0.25 is the premium, it cost 0.25 LINK per request
const GAS_PRICE_LINK = 1e9 // link per gas. calculated value based on the gas price of ethereum network

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log("mocal mock detected, deploying mock...")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        log("mocks deployed!")
        log("------------------------------")
    }
}
module.exports.tags = ["all", "mocks"]
