const tests = {
    poolEth: require('./Pool/HegicPoolETH.js'),
    poolWBTC: require('./Pool/HegicPoolWBTC.js'),
    ETH_CALL: require('./Options/HegicOptionsETH_CALL.js'),
    ETH_PUT: require('./Options/HegicOptionsETH_PUT.js'),
    StakingETH: require('./Staking/HegicStakingETH.js'),
    StakingWBTC: require('./Staking/HegicStakingWBTC.js'),
}

if(process.env.DEVMOD){
    tests.poolEth.test()
    tests.poolWBTC.test()
    // tests.ETH_CALL.test()
    // tests.ETH_PUT.test()
    tests.StakingETH.test()
    tests.StakingWBTC.test()
} else {
    Object.values(tests).forEach(x => x.test());
}
