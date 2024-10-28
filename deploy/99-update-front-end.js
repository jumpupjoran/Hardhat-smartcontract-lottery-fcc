const { ethers } = require("hardhat")
require("dotenv").config()

const FRONT_END_ADDRESSES_FILE =
    "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"
const FRONT_END_ABI_FILE = "../nextjs-smartcontract-lottery-fcc/constants/abi.json"
const variable = true
module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end")
        updateContractAddress()
        updateAbi()
    }
}

async function updateAbi() {
    const raffle = await ethers.getContractAt("Raffle")
    fs.writeFileSync(FRONT_END_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json))
}

async function updateContractAddress() {
    // const raffle = await ethers.getContractAt("Raffle")
    const contractAddress = (await deployments.get("Raffle")).address
    const chainId = network.config.chainId.toString()
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"))
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(contractAddress)) {
            currentAddresses[chainId].push(contractAddress)
        }
    }
    {
        currentAddresses[chainId] = [raffle.target]
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

module.exports.tag = ["all", "frontend"]
