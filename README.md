# contracts-v888
Hegic Protocol v888 Beta

### Important: not deployable unless you apply the timeout workaround from 

https://github.com/trufflesuite/truffle/issues/3356#issuecomment-721352724


### steps for full migration + option minting on ropsten
1. https://github.com/trufflesuite/truffle/issues/3356#issuecomment-721352724
2. add `plugin-verify` and etherscan api creds
3. `truffle migrate --network ropsten`
4. `truffle run verify FakeExchange FakeWBTC FakeHEGIC FakePriceProvider FakeBTCPriceProvider BrokenETHOptions HegicWBTCOptions HegicETHPool HegicERCPool HegicStakingETH  HegicStakingETH HegicStakingWBTC HegicETHRewards HegicWBTCRewards ETHStakingRewards WBTCStakingRewards LinearBondingCurve --network ropsten
`
5. `HegicETHPool`'s `provide()`: 0.2 ETH, 5 `minMint`
6. go to `BrokenETHOptions`, `create()`: 0.00001 ETH, 604800 `period`, 1 `amount`, 61080000000 `strike`, 1 `optionType`
