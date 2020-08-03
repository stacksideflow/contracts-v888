const {getContracts, toWei, timeTravel, MAX_INTEGER} = require("./utils/utils.js")
const BN = web3.utils.BN

// const firstProvide  = new BN( '1000000000000000000' )
// const secondProvide = new BN( '1000000000000000000' )
// const thirdProvide  = new BN( '3000000000000000000' )
// const thirdWithdraw = new BN(  '500000000000000005' )
// const profit = new BN( '100' )

const firstProvide = new BN(toWei(Math.random()))
const secondProvide = new BN(toWei(Math.random()))
const thirdProvide = new BN(toWei(Math.random()))
const firstWithdraw = firstProvide
const profit = new BN(toWei(Math.random())).div(new BN(1000))

contract("HegicERCPool", ([user1, user2, user3]) => {
  const contracts = getContracts()

  it("Should mint tokens for the first provider correctly", async () => {
    const {WBTCPool, WBTC} = await contracts
    await WBTC.mint(firstProvide, {from: user1})
    await WBTC.approve(WBTCPool.address, firstProvide, {from: user1})
    await WBTCPool.provide(firstProvide, 0, {from: user1})
    assert.equal(
        firstProvide.toString(),
        await WBTCPool.shareOf(user1).then(x => x.toString()),
        "Wrong amount"
    )
  })

  it("Should mint tokens for the second provider correctly", async () => {
    const {WBTCPool, WBTC} = await contracts
    await WBTC.mint(secondProvide, {from: user2})
    await WBTC.approve(WBTCPool.address, secondProvide, {from: user2})
    await WBTCPool.provide(secondProvide, 0, {from: user2})
    assert(secondProvide.eq(await WBTCPool.shareOf(user2)), "Wrong amount")
  })

  it("Should distribute the profits correctly", async () => {
    const {WBTCPool, WBTC} = await contracts

    const [startShare1, startShare2] = await Promise.all([
      WBTCPool.shareOf(user1),
      WBTCPool.shareOf(user2),
    ])

    const expected1 = profit
      .mul(startShare1)
      .div(startShare1.add(startShare2))
      .add(startShare1)
    const expected2 = profit
      .mul(startShare2)
      .div(startShare1.add(startShare2))
      .add(startShare2)

    await WBTC.mint(profit, {from: user3})
    await WBTC.transfer(WBTCPool.address, profit, {from: user3})

    const [res1, res2] = await Promise.all([
      WBTCPool.shareOf(user1).then((x) => x.eq(expected1)),
      WBTCPool.shareOf(user2).then((x) => x.eq(expected2)),
    ])
    assert(res1 && res2, "The profits value isn't correct")
  })

  it("Should mint tokens for the third provider correctly", async () => {
    const {WBTCPool, WBTC} = await contracts
    const value = thirdProvide
    const [startShare1, startShare2] = await Promise.all([
      WBTCPool.shareOf(user1),
      WBTCPool.shareOf(user2),
    ])

    await WBTC.mint(thirdProvide, {from: user3})
    await WBTC.approve(WBTCPool.address, thirdProvide, {from: user3})
    await WBTCPool.provide(thirdProvide, 0, {from: user3})

    assert.isAtLeast(
      await WBTCPool.shareOf(user3).then((x) => x.sub(value).toNumber()),
      -1,
      "The third provider has lost funds"
    )
    assert(
      await WBTCPool.shareOf(user1).then((x) => x.eq(startShare1)),
      "The first provider has an incorrect share"
    )
    assert(
      await WBTCPool.shareOf(user2).then((x) => x.eq(startShare2)),
      "The second provider has an incorrect share"
    )
  })

  it("Should burn the first provider's tokens correctly", async () => {
    const {WBTCPool, WBTC} = await contracts
    const value = firstWithdraw
    const startBalance = await WBTC.balanceOf(user1)

    const [startShare1, startShare2, startShare3] = await Promise.all([
      WBTCPool.shareOf(user1),
      WBTCPool.shareOf(user2),
      WBTCPool.shareOf(user3),
    ])

    await timeTravel(14 * 24 * 3600 + 1)
    // await WBTCPool.lockupPeriod().then(timeTravel)
    const gasPrice = await web3.eth.getGasPrice().then((x) => new BN(x))
    const logs = await WBTCPool.withdraw(value, MAX_INTEGER)
    const endBalance = await WBTC.balanceOf(user1)
    const balanceDelta = endBalance.sub(startBalance)

    const [share1, share2, share3] = await Promise.all([
      WBTCPool.shareOf(user1),
      WBTCPool.shareOf(user2),
      WBTCPool.shareOf(user3),
    ])
    assert.isAtLeast(
      share2.sub(startShare2).toNumber(),
      -1,
      "The second provider has lost funds"
    )
    assert.isAtLeast(
      share3.sub(startShare3).toNumber(),
      -1,
      "The third provider has lost funds"
    )
    assert(
      balanceDelta.eq(value),
      "The first provider has received an incorrect amount"
    )
    assert.equal(
      share1.add(value).sub(startShare1),
      0,
      "The first provider has an incorrect share"
    )
  })
})
