const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../hardhat.config.helper")
const { assert, expect } = require("chai")

const chainId = network.config.chainId
!developmentChains.includes(chainId)
    ? describe.skip
    : describe("Raffle", function () {
          let Raffle, VRFCoordinatorV2, entranceFee, deployer, interval
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])

              Raffle = await ethers.getContract("Raffle", deployer)
              VRFCoordinatorV2 = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              entranceFee = await Raffle.getEntrancFee()
              interval = await Raffle.getTimeInterval()
          })

          describe("Constructor", function () {
              it("initialize the raffle correctly", async () => {
                  const raffleState = await Raffle.getRaffleState()
                  const _interval = await Raffle.getTimeInterval()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(_interval.toString(), networkConfig[chainId]["timeInterval"])
              })
          })

          describe("enterRaffle", function () {
              it("revert when you dont pay enough", async () => {
                  await expect(Raffle.enterRaffle()).to.be.revertedWith("Raffle__lowAmountOfETH")
              })

              it("records players when they enter", async () => {
                  await Raffle.enterRaffle({ value: entranceFee })
                  const playerFromContract = await Raffle.getPlayers(0)
                  assert.equal(playerFromContract, deployer)
              })

              it("emit the event", async () => {
                  await expect(Raffle.enterRaffle({ value: entranceFee })).to.emit(
                      Raffle,
                      "raffleEnter"
                  )
              })
              it("revert if raffle is Calculating", async () => {
                  await Raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await Raffle.performUpkeep([])
                  await expect(Raffle.enterRaffle({ value: entranceFee })).to.be.revertedWith(
                      "Raffle__IsNotOpen"
                  )
              })
          })

          describe("checkUpkeep", function () {
              it("returns false if we dont have a player", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await Raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle is calculating", async () => {
                  await Raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await Raffle.performUpkeep([])
                  const _raffleState = await Raffle.getRaffleState()
                  const { upkeepNeeded } = await Raffle.callStatic.checkUpkeep([])
                  assert.equal(_raffleState.toString(), "1")
                  assert(!upkeepNeeded)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await Raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await Raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await Raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await Raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded)
              })
          })
          describe("performUpkeep", function () {
              it("can only run if upkeepNeeded is true", async () => {
                  await Raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const tx = await Raffle.performUpkeep([])
                  assert(tx)
              })
              it("revert if upkeepNeeded is false", async () => {
                  await expect(Raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  )
              })
              it("update the raffle state", async () => {
                  await Raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const txResponse = await Raffle.performUpkeep([])
                  await txResponse.wait(1)
                  const _raffleState = await Raffle.getRaffleState()
                  assert(_raffleState.toString() == "1")
              })
              it("emit a requestId", async () => {
                  await Raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const txResponse = await Raffle.performUpkeep([])
                  const txRecipt = await txResponse.wait(1)
                  const requestId = txRecipt.events[1].args.requestId
                  assert(requestId.toNumber() > 0)
              })
          })
          describe("fulfillRandomWords", function () {
              beforeEach(async () => {
                  await Raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })
              it("can only be called after performupkeep", async () => {
                  await expect(
                      VRFCoordinatorV2.fulfillRandomWords(0, Raffle.address) // reverts if not fulfilled
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      VRFCoordinatorV2.fulfillRandomWords(1, Raffle.address) // reverts if not fulfilled
                  ).to.be.revertedWith("nonexistent request")
              })
              it("picks a winner, resets, and sends money", async () => {
                  const additionalEntrances = 4 // to test
                  const startingIndex = 1
                  const accounts = await ethers.getSigners()
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      const accountsConectedRaffle = Raffle.connect(accounts[i])
                      await accountsConectedRaffle.enterRaffle({ value: entranceFee })
                  }
                  const startingTimeStamp = await Raffle.getLastTimeStamp()

                  await new Promise(async (resolve, reject) => {
                      Raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              const recentWinner = await Raffle.getRecentWinner()
                              const endingWinnerBalance = await accounts[1].getBalance()
                              const raffleState = await Raffle.getRaffleState()
                              const endingTimeStamp = await Raffle.getLastTimeStamp()
                              const numberOfPlayers = await Raffle.getNumberOfPlayers()
                              assert(numberOfPlayers.toString() == "0")
                              assert(raffleState.toString() == "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  endingWinnerBalance.toString(),
                                  startingWinnerBalance.add(raffleBalance).toString()
                              )
                          } catch (e) {
                              reject(e)
                          }
                          resolve()
                      })
                      const startingWinnerBalance = await accounts[1].getBalance()
                      const raffleBalance = await Raffle.provider.getBalance(Raffle.address)
                      const tx = await Raffle.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      await VRFCoordinatorV2.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          Raffle.address
                      )
                  })
              })
          })
      })
