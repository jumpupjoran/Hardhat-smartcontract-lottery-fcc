const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")
const { subscriptionId } = require("../../deploy/01-deploy-raffle")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              const contractAddressRaffle = (await deployments.get("Raffle")).address
              raffle = await ethers.getContractAt("Raffle", contractAddressRaffle)

              const contractAddressMock = (await deployments.get("VRFCoordinatorV2Mock")).address
              vrfCoordinatorV2Mock = await ethers.getContractAt(
                  "VRFCoordinatorV2Mock",
                  contractAddressMock,
              )
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("initializes the raffle correctly", async function () {
                  const interval = await raffle.getInterval()
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])

                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
              })

              it("the price is set correctly", async function () {
                  const entranceFee = await raffle.getEntranceFee()
                  assert.equal(entranceFee.toString(), networkConfig[chainId]["entranceFee"])
              })
          })
          describe("enterRaffle", function () {
              it("reverts when not paid enough", async function () {
                  await expect(raffle.enterRaffle()).to.be.reverted
              })

              it("records players when they enter", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  actualPlayer = await raffle.getPlayer(0)
                  assert.equal(actualPlayer, deployer)
              })

              it("emits event on enter", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter",
                  )
              })

              it("doesnt allow entrance when raffle is calculating", async function () {
                  //   const subscriptionId = "1"
                  //   await vrfCoordinatorV2Mock.addConsumer(
                  //       subscriptionId,
                  //       "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
                  //   )

                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep("0x") // ("0x") = ([])
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__NotOpen",
                  )
              })
          })

          describe("checkUpKeep", function () {
              it("returns false if people haven't sent any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x") // callstatic is so that you simulate calling this function in stead of actually doing this function with a transaction
                  assert(!upkeepNeeded)
              })

              it("returns false if raffle isn't open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep("0x")
                  const raffleState = await raffle.getRaffleState()
                  const { upKeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upKeepNeeded, false)
              })

              it("returns false if enough time hasn't passed", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) - 10])
                  await network.provider.send("evm_mine", [])
                  const { upKeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert.equal(upKeepNeeded.toString(), "false")
              })
              it(" retruns true if enough time has passed, has players, and is open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const { upKeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(upKeepNeeded)
              })
          })
          describe("performUpKeep", function () {
              it("it runs when checkUpKeep is true", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep("0x")
                  assert(tx)
              })
              it("reverts when checkUpKeep is false", async function () {
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWith(
                      "Raffel__UpKeepNotNeeded",
                  )
              })
              it("updates the raffle state, emits an event, and calls the vrf coordinator", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await raffle.performUpkeep("0x")
                  const txReceipt = await txResponse.wait(1)
                  const requestId = txReceipt.events[1].args.requestId //event[1] because this is the second event that gets emitted in this function. first event takes place in the requestRandomWords function, actually it already emits the request id if you look into the contract of it.
                  assert(requestId.toNumber() > 0)
                  const raffleState = await raffle.getRaffleState()
                  assert(raffleState.toString() == "1")
              })
          })

          describe("fullfillrandomwords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
              })

              it("can only be called after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.target),
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.target),
                  ).to.be.revertedWith("nonexistent request")
              })
              //   it("picks a winner, resets the lottery ,and sends money", async function () {
              //       const additionalEntrants = 3
              //       const startingAccountIndex = 1
              //       const accounts = await ethers.getSigners()
              //       for (
              //           let i = startingAccountIndex;
              //           i < startingAccountIndex + additionalEntrants;
              //           i++
              //       ) {
              //           const accountConnectedRaffle = raffle.connect(accounts[i])
              //           await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
              //       }
              //       const startingTimestamp = await raffle.getLatestTimeStamp()

              //       await new Promise(async (resolve, reject) => {
              //           // listening for a certain event( Winner Picked). we do this because if you are on a testnet you will have to wait for fulfillrandomwords because it comes from chainlink. but herer its not actually nececarry to do it like this because we are not on a testnet
              //           raffle.once("WinnerPicked", async () => {
              //               try {
              //                   const recentWinner = await raffle.getRecentWinner()

              //                   console.log(recentWinner)
              //                   console.log(accounts[1])
              //                   console.log(accounts[2])
              //                   console.log(accounts[3])

              //                   const raffleState = await raffle.getRaffleState()
              //                   const endingTimeStamp = await raffle.getlatestTimeStamp()

              //                   // checking that the players list is empty
              //                   const numPlayers = await raffle.getNumberOfPlayers()
              //                   assert.equal(numPlayers.toString(), "0")

              //                   //checking the raffle state is open again
              //                   assert.equal(raffleState, "0")

              //                   // checking the time
              //                   assert(endingTimeStamp > startingTimestamp)

              //                   // check that the winner gets paid
              //                   const winnerEndingBalance = await accounts[1].getBalance()
              //                   assert.equal(
              //                       winnerEndingBalance.toString(),
              //                       winnerStartingBalance.add(
              //                           raffleEntranceFee
              //                               .mul(additionalEntrants)
              //                               .add(raffleEntranceFee)
              //                               .toString(),
              //                       ),
              //                   )
              //               } catch (e) {
              //                   reject(e)
              //               }
              //               resolve()
              //           })

              //           // below we will fire the event, and the listener will pick it up, and resolve
              //           const tx = await raffle.performUpkeep("0x")
              //           const txReceipt = await tx.wait(1)
              //           const winnerStartingBalance = await accounts[1].getBalance()
              //           await vrfCoordinatorV2Mock.fulfillRandomWords(
              //               txReceipt.events[1].args.requestId,
              //               raffle.address,
              //           )
              //       })
              //   })
          })
      })
