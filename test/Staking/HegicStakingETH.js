const {getContracts, toWei, timeTravel, MAX_INTEGER} = require("../utils/utils.js")
const toBN = web3.utils.toBN
const LOT_PRICE = toBN(toWei(888000))

module.exports.test = () => contract("HegicStakingETH", ([user1, user2, user3]) => {
    const contracts = getContracts()

    async function buy(amount = 1, from = user1){
        const {HEGIC, StakingETH} = await contracts
        await HEGIC.mint(
            LOT_PRICE.mul(toBN(amount)),
            {from}
        )
        await HEGIC.approve(
            StakingETH.address,
            LOT_PRICE.mul(toBN(amount)),
            {from}
        )
        await StakingETH.buy(toBN(amount), {from})

    }

    async function sendProfit(_value, from = user1) {
        const {StakingETH} = await contracts
        const value = toBN(_value)
        await StakingETH.sendProfit({from, value})
    }

    it("Should buy a lot", async () => {
        await buy();
    })

    it("Should give all the profit to user1", async () => {
        const {StakingETH} = await contracts
        const expectedProfit = "1000"
        const startProfit = await StakingETH.profitOf(user1).then(toBN)
        await sendProfit(expectedProfit);
        const profit = await StakingETH.profitOf(user1)
            .then(toBN).then(x => x.sub(startProfit))
            .then(x => x.toString())
        assert.equal(profit, expectedProfit, "Wrong profit")
    })

    it("Should save profit after transfer", async () => {
        const {StakingETH} = await contracts
        const startProfit = await StakingETH.profitOf(user1)
            .then(x => x.toString())
        await StakingETH.transfer(user2, "1", {from: user1})
        const profit = await StakingETH.profitOf(user1)
            .then(x => x.toString())
        assert.equal(profit, startProfit, "Wrong profit")
    })

    it("Should buy another lot and distribute profit", async () => {
        const {StakingETH} = await contracts
        const summaryProfit = "10000"
        const expectedProfit = ["7500", "2500"]
        await buy(3);
        const startProfit = await Promise.all([
            StakingETH.profitOf(user1),
            StakingETH.profitOf(user2)
        ])
        await sendProfit(summaryProfit);

        const profit = await Promise.all([
            StakingETH.profitOf(user1),
            StakingETH.profitOf(user2)
        ]).then(x => x.map((x, i) =>
            x.sub(startProfit[i]).toString()
        ))

        profit.forEach((x, i) => {
            assert.equal(x, expectedProfit[i], "Wrong profit")
        })
    })

    it("Should zero profit after claim", async () => {
        const {StakingETH} = await contracts
        const profit = await StakingETH.profitOf(user1)
            .then(x => x.toString())
        const event = await StakingETH.claimProfit()
            .then(x => x.logs.find(x => x.event == 'Claim'))
        assert.isDefined(event, "Claim event wasn't found")
        assert.equal(
            event.args.amount.toString(),
            profit,
            "wrong claimed profit"
        )
        const zeroProfit = await StakingETH.profitOf(user1)
            .then(x => x.toString())
        assert.equal(
            zeroProfit,
            "0",
            "profit is not equal 0"
        )
    })

    it("Shouldn't claim twice", async () => {
        const {StakingETH} = await contracts
        await StakingETH.claimProfit().then(
          () => assert.fail("A profit was claimed twice"),
          (x) => assert.equal(x.reason, "Zero profit", "Wrong error reason")
        )
    })

    it("Should sell a lot", async () => {
        const {StakingETH} = await contracts
        await StakingETH.sell("1")
    })

    it("Shouldn't lost profit after selling", async () => {
        const {StakingETH} = await contracts
        await sendProfit(3000)
        const startProfit = await StakingETH.profitOf(user1).then(x=>x.toString())
        await StakingETH.sell("2")
        const endProfit = await StakingETH.profitOf(user1).then(x=>x.toString())
        assert.equal(startProfit, endProfit)
    })

    it("Should claim saved profit after selling", async () => {
        const {StakingETH} = await contracts

        await buy()
        await sendProfit("3000")

        const profit = await StakingETH.profitOf(user1).then(x => x.toString())

        await StakingETH.balanceOf(user1).then(x => StakingETH.sell(x) )

        const event = await StakingETH.claimProfit()
            .then(x => x.logs.find(x => x.event == 'Claim'))
        assert.isDefined(event, "Claim event wasn't found")
        assert.equal(
            event.args.amount.toString(),
            profit,
            "wrong claimed profit"
        )
    })

    it("Should buy 1500th lots", async () => {
        await buy(1499, user2);
    })

    it("Shouldn't buy an 1501st lot", async () => {
        await buy().then(
          () => assert.fail("A 1501st lot was sold"),
          () => {}
        )
    })

})
