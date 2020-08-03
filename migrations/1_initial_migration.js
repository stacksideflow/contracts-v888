const BN = web3.utils.BN
const Exchange = artifacts.require("FakeExchange")
const WBTC = artifacts.require("FakeWBTC")
const PriceProvider = artifacts.require("FakePriceProvider")
// const CallHedge = artifacts.require("HegicCallOptions")
// const PutHedge = artifacts.require("HegicPutOptions")
const ETHOptions = artifacts.require("HegicETHOptions")
const WBTCOptions = artifacts.require("HegicWBTCOptions")
const ETHPool = artifacts.require("HegicETHPool")
const ERCPool = artifacts.require("HegicERCPool")

const params = {
    ETHPrice: new BN(380e8),
    BTCPrice: new BN("1120900000000"),
    ExchangePrice: new BN(30e8)
}

module.exports = async function (deployer, network) {
  try {
    if (network == "development" || network == "develop") {
      await deployer.deploy(WBTC)
      await deployer.deploy(Exchange, WBTC.address, 30e8)
      await deployer.deploy(PriceProvider, params.ETHPrice)
      await deployer.deploy(ETHOptions, PriceProvider.address)
      await deployer.deploy(WBTCOptions,
          PriceProvider.address,
          Exchange.address,
          WBTC.address
      )
    }
  } catch (err) {
    console.error(err)
  }
}
