const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../hardhat.config.helper")
const { assert, expect } = require("chai")

const chainId = network.config.chainId
developmentChains.includes(chainId)
    ? describe.skip
    : describe("Raffle", function () {
          let Raffle, entranceFee, deployer
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              Raffle = await ethers.getContract("Raffle", deployer)
              entranceFee = await Raffle.getEntrancFee()
          })

          describe("fulfillRandomWords", function () {
              it("works with live chainLink keepers and chainLink VRF ,we ger a random winner", async () => {
                  console.log("Setting up test...")
                  const startingTimeStamp = await Raffle.getLastTimeStamp()
                  const accounts = await ethers.getSigners()

                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      Raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              const recentWinner = await Raffle.getRecentWinner()
                              const raffleState = await Raffle.getRaffleState()
                              const endingWinnerBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await Raffle.getLastTimeStamp()
                              await expect(Raffle.getPlayers(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert(raffleState.toString() == "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  endingWinnerBalance.toString(),
                                  startingWinnerBalance.add(entranceFee).toString()
                              )
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      console.log("Entering Raffle...")
                      const tx = await Raffle.enterRaffle({ value: entranceFee })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const startingWinnerBalance = await accounts[0].getBalance()
                  })
              })
          })
      })
