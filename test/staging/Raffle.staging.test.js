const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")
const { TransactionResponse } = require("ethers")
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async function () {
              //getting the contracts
              deployer = (await getNamedAccounts()).deployer
              // await deployments.fixture(["all"])
              const contractAddressRaffle = (await deployments.get("Raffle")).address
              raffle = await ethers.getContractAt("Raffle", contractAddressRaffle)

              // specifying variables
              raffleEntranceFee = await raffle.getEntranceFee()
              console.log("beforeEach done ")
          })
          describe("fulfillrandomWords", function () {
              it("works with chainlick kepers and chainlink vrf, we get a random winner", async function () {
                  //entering the raffle
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  await new Promise(async (resolve, reject) => {
                      //set up a listener before we enter the event
                      raffle.once("Winnerpicked", async () => {
                          console.log("Winner picked event fired!")

                          try {
                              // rafflestate = open
                              const raffleState = raffle.getRaffleState()
                              assert.equal(raffleState, "0")

                              //recentwinner
                              const recentWinner = raffle.getRecentWinner()
                              assert.equal(recentWinner.toString(), accounts[0].address)

                              // winnerendingbalance = Winnerstartingbalance + entranceFee
                              const winnerEndingBalance = await ethers.provider.getBalance(
                                  accounts[0].address,
                              )
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString(),
                              )

                              await expect(raffle.getPlayer(0)).to.be.reverted

                              // endingtimestamp > bsf
                              const endingTimeStamp = await raffle.getLatestTimeStamp()
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      console.log("entered raffle")
                      const winnerStartingBalance = await ethers.provider.getBalance(
                          accounts[0].address,
                      )
                  })
              })
          })
      })
