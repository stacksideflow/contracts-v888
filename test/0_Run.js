const tests = {
    poolEth: require('./Pool/HegicPoolETH.js'),
    poolWBTC: require('./Pool/HegicPoolWBTC.js'),
    ETH_CALL: require('./Options/HegicOptionsETH_CALL.js'),
    WBTC_CALL: require('./Options/HegicOptionsWBTC_CALL.js'),
    WBTC_PUT: require('./Options/HegicOptionsWBTC_PUT.js'),
    ETH_PUT: require('./Options/HegicOptionsETH_PUT.js'),
    StakingETH: require('./Staking/HegicStakingETH.js'),
    StakingWBTC: require('./Staking/HegicStakingWBTC.js'),
    RewardsWBTC: require('./Rewards/WBTCRewards.js'),
    RewardsETH: require('./Rewards/ETHRewards.js'),
    BC: require('./BondingCurve/Linear.js'),
    IO: require('./InitialOffering/HegicInitialOffering.js'),
}

if(process.env.DEVMOD){
    // tests.poolEth.test()
    // tests.poolWBTC.test()
    // tests.ETH_CALL.test()
    // tests.WBTC_CALL.test()
    // tests.WBTC_PUT.test()
    // tests.ETH_PUT.test()
    // tests.StakingETH.test()
    // tests.StakingWBTC.test()
    //
    // tests.RewardsWBTC.test()
    // tests.RewardsETH.test()
    // tests.BC.test()
    tests.IO.test()
} else {
    Object.values(tests).forEach(x => x.test());
}
