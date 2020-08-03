/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Hegic
 * Copyright (C) 2020 Hegic Protocol
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

pragma solidity 0.6.8;
import "./HegicPool_WBTC.sol";


/**
 * @author 0mllwntrmt3
 * @title Hegic WBTC (Wrapped Bitcoin) Bidirectional (Call and Put) Options
 * @notice Hegic Protocol Options Contract
 */
contract HegicWBTCOptions is Ownable {
    using SafeMath for uint256;

    address payable public settlementFeeRecipient;
    Option[] public options;
    uint256 public impliedVolRate;
    uint256 public optionCollateralizationRatio = 50;
    uint256 internal constant PRICE_DECIMALS = 1e8;
    uint256 internal contractCreationTimestamp;
    AggregatorV3Interface public priceProvider;
    HegicERCPool public pool;
    IUniswapV2Router01 public uniswapRouter;
    address[] public ETHToWBTCSwapPath;
    ERC20 WBTC;

    event Create(
        uint256 indexed id,
        address indexed account,
        uint256 settlementFee,
        uint256 totalFee
    );

    event Exercise(uint256 indexed id, uint256 profit);
    event Expire(uint256 indexed id, uint256 premium);
    enum State {Active, Exercised, Expired}
    enum OptionType {Put, Call}

    struct Option {
        State state;
        address payable holder;
        uint256 strike;
        uint256 amount;
        uint256 lockedAmount;
        uint256 premium;
        uint256 expiration;
        OptionType optionType;
    }

    /**
     * @param _priceProvider The address of ChainLink BTC/USD price feed contract
     * @param _uniswap The address of Uniswap router contract
     * @param _WBTC The address of WBTC ERC20 token contract
     */
    constructor(
        AggregatorV3Interface _priceProvider,
        IUniswapV2Router01 _uniswap,
        ERC20 _WBTC
    ) public {
        pool = new HegicERCPool(_WBTC);
        WBTC = _WBTC;
        priceProvider = _priceProvider;
        settlementFeeRecipient = msg.sender;
        impliedVolRate = 5500;
        uniswapRouter = _uniswap;
        contractCreationTimestamp = now;
        approve();

        ETHToWBTCSwapPath = new address[](2);
        ETHToWBTCSwapPath[0] = uniswapRouter.WETH();
        ETHToWBTCSwapPath[1] = address(WBTC);

    }

    /**
     * @notice Can be used to update the contract in critical situations
     *         in the first 14 days after deployment
     */
    function transferPoolOwnership() external onlyOwner {
        require(now < contractCreationTimestamp + 14 days);
        pool.transferOwnership(owner());
    }

    /**
     * @notice Used for adjusting the options prices while balancing asset's implied volatility rate
     * @param value New IVRate value
     */
    function setImpliedVolRate(uint256 value) external onlyOwner {
        require(value >= 1000, "ImpliedVolRate limit is too small");
        impliedVolRate = value;
    }

    /**
     * @notice Used for changing settlementFeeRecipient
     * @param recipient New settlementFee recipient address
     */
    function setSettlementFeeRecipient(address payable recipient) external onlyOwner {
        require(now < contractCreationTimestamp + 14 days);
        require(recipient != address(0));
        settlementFeeRecipient = recipient;
    }

    /**
     * @notice Used for changing option collateralization ratio
     * @param value New optionCollateralizationRatio value
     */
    function setOptionCollaterizationRatio(uint value) external onlyOwner {
        require(50 <= value && value <= 100, "wrong value");
        optionCollateralizationRatio = value;
    }

    /**
     * @notice Allows the ERC pool contract to receive and send tokens
     */
    function approve() public {
        require(
            WBTC.approve(address(pool), uint256(-1)),
            "WBTC approve failed"
        );
    }

    /**
     * @notice Creates a new option
     * @param period Option period in seconds (1 days <= period <= 4 weeks)
     * @param amount Option amount
     * @param strike Strike price of the option
     * @param optionType Call or Put option type
     * @return optionID Created option's ID
     */
    function create(
        uint256 period,
        uint256 amount,
        uint256 strike,
        OptionType optionType
    )
        external
        payable
        returns (uint256 optionID)
    {
        (uint256 total, uint256 totalETH, uint256 settlementFee, uint256 strikeFee, ) =
            fees(period, amount, strike, optionType);

        require(period >= 1 days, "Period is too short");
        require(period <= 4 weeks, "Period is too long");
        require(amount > strikeFee, "price difference is too large");
        require(msg.value >= totalETH, "value is too small");

        uint256 strikeAmount = amount.sub(strikeFee);
        uint premium = total.sub(settlementFee);
        optionID = options.length;

        Option memory option = Option(
            State.Active,
            msg.sender,
            strike,
            amount,
            strikeAmount.mul(optionCollateralizationRatio).div(100).add(strikeFee),
            premium,
            now + period,
            optionType
        );

        uint amountIn = swapToWBTC(msg.value, total);
        if (amountIn < msg.value) {
            msg.sender.transfer(msg.value.sub(amountIn));
        }

        options.push(option);
        settlementFeeRecipient.transfer(settlementFee);
        pool.sendPremium(option.premium);
        pool.lock(option.lockedAmount);

        emit Create(optionID, msg.sender, settlementFee, total);
    }

    /**
     * @notice Swap ETH to WBTC via Uniswap router
     * @param maxAmountIn The maximum amount of ETH that can be required before the transaction reverts.
     * @param amountOut The amount of WBTC tokens to receive.
     */
    function swapToWBTC(
        uint maxAmountIn,
        uint amountOut
    )
        internal
        returns (uint)
    {
            uint[] memory amounts = uniswapRouter.swapETHForExactTokens {
                value: maxAmountIn
            }(
                amountOut,
                ETHToWBTCSwapPath,
                address(this),
                now
            );
            return amounts[0];
    }

    /**
     * @notice Exercises an active option
     * @param optionID ID of your option
     */
    function exercise(uint256 optionID) external {
        Option storage option = options[optionID];

        require(option.expiration >= now, "Option has expired");
        require(option.holder == msg.sender, "Wrong msg.sender");
        require(option.state == State.Active, "Wrong state");

        option.state = State.Exercised;
        uint256 profit = payProfit(option);

        emit Exercise(optionID, profit);
    }

    /**
     * @notice Unlocks an array of options
     * @param optionIDs array of options
     */
    function unlockAll(uint256[] calldata optionIDs) external {
        uint arrayLength = optionIDs.length;
        for (uint256 i = 0; i < arrayLength; i++) {
            unlock(optionIDs[i]);
        }
    }

    /**
     * @notice Used for getting the actual options prices
     * @param period Option period in seconds (1 days <= period <= 4 weeks)
     * @param amount Option amount
     * @param strike Strike price of the option
     * @return total Total price to be paid
     * @return totalETH Total price in ETH to be paid
     * @return settlementFee Amount to be distributed to the HEGIC token holders
     * @return strikeFee Amount that covers the price difference in the ITM options
     * @return periodFee Option period fee amount
     */
    function fees(
        uint256 period,
        uint256 amount,
        uint256 strike,
        OptionType optionType
    )
        public
        view
        returns (
            uint256 total,
            uint256 totalETH,
            uint256 settlementFee,
            uint256 strikeFee,
            uint256 periodFee
        )
    {
        (,int latestPrice,,,) = priceProvider.latestRoundData();
        uint256 currentPrice = uint256(latestPrice);
        settlementFee = getSettlementFee(amount);
        periodFee = getPeriodFee(amount, period, strike, currentPrice, optionType);
        strikeFee = getStrikeFee(amount, strike, currentPrice, optionType);
        total = periodFee.add(strikeFee).add(settlementFee);
        totalETH = uniswapRouter.getAmountsIn(total, ETHToWBTCSwapPath)[0];
    }

    /**
     * @notice Unlock funds locked in the expired options
     * @param optionID ID of the option
     */
    function unlock(uint256 optionID) public {
        Option storage option = options[optionID];
        require(option.expiration < now, "Option has not expired yet");
        require(option.state == State.Active, "Option is not active");
        option.state = State.Expired;
        unlockFunds(option);
        emit Expire(optionID, option.premium);
    }

    /**
     * @notice Calculates settlementFee
     * @param amount Option amount
     * @return fee Settlement fee amount
     */
    function getSettlementFee(uint256 amount)
        internal
        pure
        returns (uint256 fee)
    {
        return amount / 100;
    }

    /**
     * @notice Calculates periodFee
     * @param amount Option amount
     * @param period Option period in seconds (1 days <= period <= 4 weeks)
     * @param strike Strike price of the option
     * @param currentPrice Current price of BTC
     * @return fee Period fee amount
     *
     * amount < 1e30        |
     * impliedVolRate < 1e10| => amount * impliedVolRate * strike < 1e60 < 2^uint256
     * strike < 1e20 ($1T)  |
     *
     * in case amount * impliedVolRate * strike >= 2^256
     * transaction will be reverted by the SafeMath
     */
    function getPeriodFee(
        uint256 amount,
        uint256 period,
        uint256 strike,
        uint256 currentPrice,
        OptionType optionType
    ) internal view returns (uint256 fee) {
        if (optionType == OptionType.Put)
            return amount
                .mul(sqrt(period))
                .mul(impliedVolRate)
                .mul(strike)
                .div(currentPrice)
                .div(PRICE_DECIMALS);
        else
            return amount
                .mul(sqrt(period))
                .mul(impliedVolRate)
                .mul(currentPrice)
                .div(strike)
                .div(PRICE_DECIMALS);
    }

    /**
     * @notice Calculates strikeFee
     * @param amount Option amount
     * @param strike Strike price of the option
     * @param currentPrice Current price of BTC
     * @return fee Strike fee amount
     */
    function getStrikeFee(
        uint256 amount,
        uint256 strike,
        uint256 currentPrice,
        OptionType optionType
    ) internal pure returns (uint256 fee) {
        if (strike > currentPrice && optionType == OptionType.Put)
            return strike.sub(currentPrice).mul(amount).div(currentPrice);
        if (strike < currentPrice && optionType == OptionType.Call)
            return currentPrice.sub(strike).mul(amount).div(currentPrice);
        return 0;
    }

    /**
     * @notice Sends profits in WBTC from the WBTC pool to an option holder's address
     * @param option A specific option contract
     */
    function payProfit(Option memory option)
        internal
        returns (uint profit)
    {
        (,int latestPrice,,,) = priceProvider.latestRoundData();
        uint256 currentPrice = uint256(latestPrice);
        if (option.optionType == OptionType.Call) {
            require(option.strike <= currentPrice, "Current price is too low");
            profit = currentPrice.sub(option.strike).mul(option.amount).div(currentPrice);
        } else {
            require(option.strike >= currentPrice, "Current price is too high");
            profit = option.strike.sub(currentPrice).mul(option.amount).div(currentPrice);
        }
        if (profit > option.lockedAmount)
            profit = option.lockedAmount;
        pool.send(option.holder, profit);
        unlockFunds(option);
    }

    /**
     * @notice Unlocks the amount that was locked in an option contract
     * @param option A specific option contract
     */
    function unlockFunds(Option memory option) internal {
        pool.unlockPremium(option.premium);
        pool.unlock(option.lockedAmount);
    }


    /**
     * @return result Square root of the number
     */
    function sqrt(uint256 x) private pure returns (uint256 result) {
        result = x;
        uint256 k = x.add(1).div(2);
        while (k < result) (result, k) = (k, x.div(k).add(k).div(2));
    }
}
