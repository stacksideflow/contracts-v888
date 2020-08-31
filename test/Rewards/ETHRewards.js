const {getContracts, toWei, timeTravel, OptionType} = require("../utils/utils.js")
const toBN = web3.utils.toBN

module.exports.test = () => contract("HegicETHRewards", ([user1, user2, user3, user4]) => {
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
      const [value, settlementFee] = await ETHOptions.fees(
        _period,
        _amount,
        _strike,
        _type
      ).then((x) => [x.total, x.settlementFee])
      const createEvent = await ETHOptions.create(_period, _amount, _strike, _type, {
                value,
                from,
          })
          .then((x) => x.logs.find((x) => x.event == "Create"))
          .then((x) => (x ? x.args : null))
      return createEvent
    }

    const getRewards = async () => {
        const {ETHOptions, PriceProvider, ETHRewards} = await contracts
        const price =  await PriceProvider.latestAnswer()
        const [_period, _amount, _strike, from] = [
          toBN(24 * 3600 * (1)),
          toBN(toWei(0.1)),
          toBN(price),
          user1
        ]
        const _type = OptionType.Call
        const [value, settlementFee] = await ETHOptions.fees(
          _period,
          _amount,
          _strike,
          _type
        ).then((x) => [x.total, x.settlementFee])
        const id = await ETHOptions.create(_period, _amount, _strike, _type, {
                  value,
                  from,
            })
            .then((x) => x.logs.find((x) => x.event == "Create"))
            .then((x) => (x ? x.args.id : null))
        return await ETHRewards.getReward(id)
    }

    it("Should provide funds to the ETHRewards and prepare ETHoptions", async () => {
      const {ETHPool, HEGIC, ETHRewards} = await contracts
      const value = toWei(50)
      await ETHPool.provide(0, {value, from: user4})
      await HEGIC.mintTo(ETHRewards.address, toWei(1e8))
    })

    it("Should getRewards", async () => {
        const {ETHRewards, ETHOptions} = await contracts
        await getRewards()
    })


        it("Should setup rewardsRate", async () => {
            const {ETHRewards} = await contracts
            await ETHRewards.setRewardsRate("1000000000")
            await ETHRewards.setRewardsRate("10000000000")
            await ETHRewards.setRewardsRate("100000000000")
            await ETHRewards.setRewardsRate("1000000000000")
            await ETHRewards.setRewardsRate("10000000000000")
            await ETHRewards.setRewardsRate("100000000000000")
        })

        it("Shouldn't setup wrong rewardsRate", async () => {
            const {ETHRewards} = await contracts
            await ETHRewards.setRewardsRate("999999999").then(
                () => assert.fail('Wrong rewards rate was accepted'),() => {}
            )
            await ETHRewards.setRewardsRate("1000000000000001").then(
                () => assert.fail('Wrong rewards rate was accepted'),() => {}
            )
        })

        it("Should setup rewardsRate only from owner", async () => {
            const {ETHRewards} = await contracts
            await ETHRewards.setRewardsRate("100000000000000", {from: user2}).then(
                () => assert.fail('Rewards rate from other accounts should not be accepted'),
                () => {}
            )
        })
})
