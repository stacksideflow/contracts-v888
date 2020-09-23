const {getContracts, toWei, timeTravel, OptionType} = require("../utils/utils.js")
const toBN = web3.utils.toBN
const toBTC = x=> toBN(toWei(x)).div(toBN(1e10))

module.exports.test = () => contract("HegicWBTCRewards", ([user1, user2, user3, user4]) => {
    const contracts = getContracts()


    async function createOption({period, amount, strike, user} = {}) {
      const price =  await PriceProvider.latestAnswer()
      const [_period, _amount, _strike, from] = [
        toBN(24 * 3600 * (period || 1)),
        toBN(amount || toWei(0.1)),
        toBN(strike || (price)),
        user || user1,
      ]
      const _type = OptionType.Call
      const [value, settlementFee] = await WBTCOptions.fees(
        _period,
        _amount,
        _strike,
        _type
      ).then((x) => [x.total, x.settlementFee])
      const createEvent = await WBTCOptions.create(_period, _amount, _strike, _type, {
                value,
                from,
          })
          .then((x) => x.logs.find((x) => x.event == "Create"))
          .then((x) => (x ? x.args : null))
      return createEvent
    }

    const getRewards = async () => {
        const {WBTCOptions, PriceProvider, WBTCRewards} = await contracts
        const price =  await PriceProvider.latestAnswer()
        const [_period, _amount, _strike, from] = [
          toBN(24 * 3600 * (1)),
          toBN(toBTC(0.1)),
          toBN(price),
          user1
        ]
        const _type = OptionType.Call
        const [value, settlementFee] = await WBTCOptions.fees(
          _period,
          _amount,
          _strike,
          _type
      ).then((x) => [x.totalETH, x.settlementFee])
        const id = await WBTCOptions.create(_period, _amount, _strike, _type, {
                  value,
                  from,
            })
            .then((x) => x.logs.find((x) => x.event == "Create"))
            .then((x) => (x ? x.args.id : null))
        return await WBTCRewards.getReward(id)
    }

    it("Should provide funds to the WBTCRewards and prepare WBTCoptions", async () => {
      const {WBTCPool, WBTC, HEGIC, WBTCRewards} = await contracts
      const value = toWei(50)
      await WBTC.mint(value, {from: user4})
      await WBTC.approve(WBTCPool.address, value, {from: user4})
      await WBTCPool.provide(value, 0, {from: user4})
      await HEGIC.mintTo(WBTCRewards.address, toWei(1e8))
    })

    it("Should get Rewards", async () => {
        await getRewards()
    })


    it("Should setup rewardsRate", async () => {
        const {WBTCRewards} = await contracts
        await WBTCRewards.setRewardsRate("1000000000")
        await WBTCRewards.setRewardsRate("10000000000")
        await WBTCRewards.setRewardsRate("100000000000")
        await WBTCRewards.setRewardsRate("1000000000000")
        await WBTCRewards.setRewardsRate("10000000000000")
        await WBTCRewards.setRewardsRate("100000000000000")
    })

    it("Shouldn't setup wrong rewardsRate", async () => {
        const {WBTCRewards} = await contracts
        await WBTCRewards.setRewardsRate("999999999").then(
            () => assert.fail('Wrong rewards rate was accepted'),() => {}
        )
        await WBTCRewards.setRewardsRate("1000000000000001").then(
            () => assert.fail('Wrong rewards rate was accepted'),() => {}
        )
    })

    it("Should setup rewardsRate only from owner", async () => {
        const {WBTCRewards} = await contracts
        await WBTCRewards.setRewardsRate("1000000000000000000000000", {from: user2}).then(
            () => assert.fail('Rewards rate from other accounts should not be accepted'),
            () => {}
        )
    })
})
