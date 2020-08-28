const BN = web3.utils.BN
const Exchange = artifacts.require("FakeExchange")
const WBTC = artifacts.require("FakeWBTC")
const HEGIC = artifacts.require("FakeHEGIC")
const PriceProvider = artifacts.require("FakePriceProvider")
const ETHOptions = artifacts.require("HegicETHOptions")
const WBTCOptions = artifacts.require("HegicWBTCOptions")
const ETHPool = artifacts.require("HegicETHPool")
const ERCPool = artifacts.require("HegicERCPool")
const StakingETH = artifacts.require("HegicStakingETH")
const StakingWBTC = artifacts.require("HegicStakingWBTC")

const params = {
    ETHPrice: new BN(380e8),
    BTCPrice: new BN("1120900000000"),
    ExchangePrice: new BN(30e8)
}

module.exports = async function (deployer, network) {
  try {
    if (network == "development" || network == "develop") {
      await deployer.deploy(WBTC)
      await deployer.deploy(HEGIC)
      await deployer.deploy(ETHPool)
      await deployer.deploy(Exchange, WBTC.address, 30e8)
      await deployer.deploy(PriceProvider, params.ETHPrice)

      await deployer.deploy(StakingWBTC, HEGIC.address, WBTC.address)
      await deployer.deploy(StakingETH, HEGIC.address)

      await deployer.deploy(ETHOptions,
          PriceProvider.address,
          StakingETH.address
      )
      await deployer.deploy(WBTCOptions,
          PriceProvider.address,
          Exchange.address,
          WBTC.address,
          StakingWBTC.address
      )
    }
  } catch (err) {
    console.error(err)
  }
}
