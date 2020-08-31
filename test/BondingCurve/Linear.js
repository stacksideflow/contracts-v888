const {getBCContracts, toWei, timeTravel, MAX_INTEGER} = require("../utils/utils.js")
const toBN = web3.utils.toBN
const params = {
    BCSupply: toBN("753001000000000000000000000")
}

module.exports.test = () => contract("LinearBondingCurve", ([user1, user2, user3]) => {
    const contract = getBCContracts()

    it("Should provide HEGIC to BondingCurve", async () => {
        const {BondingCurve, HEGIC} = await contract
        await HEGIC.mintTo(BondingCurve.address, params.BCSupply)
    })

    it("Should buy HEGIC tokens", async () => {
        const {BondingCurve} = await contract
        await BondingCurve.buy(toWei(400000), {value:toWei(100)})
    })

    it("Should sell HEGIC tokens", async () => {
        const {BondingCurve, HEGIC} = await contract
        await HEGIC.approve(BondingCurve.address, toWei(400000))
        await BondingCurve.sell(toWei(400000))
    })
})
