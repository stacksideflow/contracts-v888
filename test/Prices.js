const {getContracts, toWei, OptionType} = require("./utils/utils.js")
const BN = web3.utils.BN

const pricePoints = [60, 70, 80, 90, 100, 110, 120, 130, 140]

module.exports = {
  testCallPrices(contracts) {
    for (let i = 0; i < pricePoints.length - 1; i++)
      it(
        `Should have a price for ${pricePoints[i]}% strike ` +
          `greater than the price for ${pricePoints[i + 1]}% strike`,
        async () => {
          const {ETHOptions, PriceProvider} = await contracts
          const amount = new BN(toWei(Math.random() * 10))
          // Random period from 1 to 56 days
          const period = new BN(24 * 3600 * parseInt(1 + Math.random() * 55))
          const currentPrice = await PriceProvider.latestAnswer()
          const firstPrice = currentPrice
            .mul(new BN(pricePoints[i]))
            .div(new BN(100))
          const secondPrice = currentPrice
            .mul(new BN(pricePoints[i + 1]))
            .div(new BN(100))
          const [first, second] = await Promise.all([
            ETHOptions.fees(amount, period, firstPrice, OptionType.Call).then((x) => x.total),
            ETHOptions.fees(amount, period, secondPrice, OptionType.Call).then((x) => x.total),
          ])
          assert(first.gt(second))
        }
      )
  },
  testPutPrices(contracts) {
    for (let i = 0; i < pricePoints.length - 1; i++)
      it(
        `Should have a price for ${pricePoints[i]}% strike ` +
          `lower than the price for ${pricePoints[i + 1]}% strike`,
        async () => {
          const {ETHOptions, PriceProvider} = await contracts
          const amount = new BN(toWei(Math.random() * 10))
          // Random period from 1 to 56 days
          const period = new BN(24 * 3600 * parseInt(1 + Math.random() * 55))
          const currentPrice = await PriceProvider.latestAnswer()
          const firstPrice = currentPrice
            .mul(new BN(pricePoints[i]))
            .div(new BN(100))
          const secondPrice = currentPrice
            .mul(new BN(pricePoints[i + 1]))
            .div(new BN(100))
          const [first, second] = await Promise.all([
            ETHOptions.fees(amount, period, firstPrice, OptionType.Put).then((x) => x.total),
            ETHOptions.fees(amount, period, secondPrice, OptionType.Put).then((x) => x.total),
          ])
          assert(first.lt(second))
        }
      )
  },
}
