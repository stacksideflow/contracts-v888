// const PUTContract = artifacts.require("HegicPutOptions")
// const CALLContract = artifacts.require("HegicCallOptions")
const ERCPoolContract = artifacts.require("HegicERCPool")
const ETHPoolContract = artifacts.require("HegicETHPool")
const WBTCContract = artifacts.require("FakeWBTC")
const HEGICContract = artifacts.require("FakeHEGIC")
const PriceContract = artifacts.require("FakePriceProvider")
const ETHOptionsContract = artifacts.require("HegicETHOptions")
const WBTCOptionsContract = artifacts.require("HegicWBTCOptions")
const HegicStakingETHContract = artifacts.require("HegicStakingETH")
const HegicStakingWBTCContract = artifacts.require("HegicStakingWBTC")
const BN = web3.utils.BN


const send = (method, params = []) =>
  new Promise((done) =>
    web3.currentProvider.send({id: 0, jsonrpc: "2.0", method, params}, done)
  )
const getContracts = async () => {
  const [
      ETHOptions, WBTCOptions, PriceProvider,
      WBTC, HEGIC, TestETHPool,
      StakingETH, StakingWBTC
  ] = await Promise.all([
        ETHOptionsContract.deployed(),
        WBTCOptionsContract.deployed(),
        PriceContract.deployed(),
        WBTCContract.deployed(),
        HEGICContract.deployed(),
        ETHPoolContract.deployed(),
        HegicStakingETHContract.deployed(),
        HegicStakingWBTCContract.deployed(),
      ])
  const [ETHPool, WBTCPool] = await Promise.all([
    ETHOptions.pool.call().then((address) => ETHPoolContract.at(address)),
    WBTCOptions.pool.call().then((address) => ERCPoolContract.at(address)),
  ])
  return {
      ETHOptions, WBTCOptions, ETHPool,
      WBTCPool, PriceProvider, WBTC, HEGIC,
      TestETHPool, StakingETH, StakingWBTC,
  }
}

const timeTravel = async (seconds) => {
  await send("evm_increaseTime", [seconds])
  await send("evm_mine")
}

module.exports = {
  getContracts,
  timeTravel,
  toWei: (value) => web3.utils.toWei(value.toString(), "ether"),
  MAX_INTEGER: new BN(2).pow(new BN(256)).sub(new BN(1)),
  OptionType: {Put: 0 , Call: 1}
}
