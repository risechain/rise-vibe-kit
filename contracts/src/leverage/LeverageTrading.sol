// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "./PriceOracle.sol";

/**
 * @title LeverageTrading
 * @notice Leverage trading with simplified string-based feed IDs
 * @dev Works with PriceOracle using "BTCUSD", "ETHUSD" etc.
 */
contract LeverageTrading is Ownable {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;
    using SafeCast for int256;

    struct Position {
        address trader;
        uint256 amount;          // Collateral amount
        uint256 entryPrice;      // Entry price when position opened
        uint256 leverage;        // Leverage with LEVERAGE_PRECISION (e.g., 10x = 100000)
        bool isLong;            // true = long, false = short
        uint256 openTimestamp;   // When position was opened
        string feedId;          // Price feed ID (e.g., "BTCUSD")
    }

    // Constants
    uint256 public constant PRECISION = 1e18;
    uint256 public constant LEVERAGE_PRECISION = 10000; // Allows for 0.01x precision
    uint256 public constant DEFAULT_MAX_LEVERAGE = 1000 * LEVERAGE_PRECISION; // 1000x max leverage
    uint256 public constant LIQUIDATION_THRESHOLD = 80; // 80% loss triggers liquidation
    uint256 public constant PLATFORM_FEE_BPS = 50; // 0.5% platform fee in basis points
    uint256 public constant MAX_PRICE_STALENESS = 5 * 60; // 5 minutes in seconds
    
    // State variables
    IERC20 public immutable collateralToken;
    PriceOracle public priceOracle;
    
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public userPositions;
    mapping(string => bool) public activeFeedIds;
    mapping(string => uint256) public maxLeveragePerAsset; // feedId => maxLeverage with LEVERAGE_PRECISION
    
    uint256 public nextPositionId = 1;
    uint256 public accumulatedFees;
    bool public emergencyStop;
    
    // Events
    event PositionOpened(
        uint256 indexed positionId,
        address indexed trader,
        uint256 amount,
        uint256 entryPrice,
        uint256 leverage,
        bool isLong,
        string feedId
    );
    
    event PositionClosed(
        uint256 indexed positionId,
        address indexed trader,
        int256 pnl,
        uint256 exitPrice
    );
    
    event PositionLiquidated(
        uint256 indexed positionId,
        address indexed trader,
        uint256 exitPrice
    );
    
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    event EmergencyStopSet(bool stopped);
    event PriceOracleUpdated(address indexed newOracle);
    event FeedStatusChanged(string feedId, bool active);
    event MaxLeverageUpdated(string feedId, uint256 maxLeverage);
    
    modifier notEmergency() {
        require(!emergencyStop, "Emergency stop active");
        _;
    }
    
    constructor(
        address _collateralToken,
        address _priceOracle
    ) Ownable(msg.sender) {
        require(_collateralToken != address(0), "Invalid token address");
        require(_priceOracle != address(0), "Invalid oracle address");
        
        collateralToken = IERC20(_collateralToken);
        priceOracle = PriceOracle(_priceOracle);
        
        // Enable BTC and ETH feeds by default
        activeFeedIds["BTCUSD"] = true;
        activeFeedIds["ETHUSD"] = true;
        
        // Set default max leverages for assets
        maxLeveragePerAsset["BTCUSD"] = 100 * LEVERAGE_PRECISION; // 100x for BTC
        maxLeveragePerAsset["ETHUSD"] = 50 * LEVERAGE_PRECISION; // 50x for ETH
    }
    
    /**
     * @notice Opens a new leveraged position
     * @param amount Collateral amount to deposit
     * @param leverage Leverage multiplier with LEVERAGE_PRECISION (e.g., 10x = 100000)
     * @param isLong True for long position, false for short
     * @param feedId Price feed ID (e.g., "BTCUSD", "ETHUSD")
     */
    function openPosition(
        uint256 amount,
        uint256 leverage,
        bool isLong,
        string calldata feedId
    ) external notEmergency returns (uint256 positionId) {
        require(amount > 0, "Invalid amount");
        
        // Get max leverage for this asset
        uint256 maxLeverage = maxLeveragePerAsset[feedId];
        if (maxLeverage == 0) {
            maxLeverage = DEFAULT_MAX_LEVERAGE;
        }
        
        require(leverage >= LEVERAGE_PRECISION && leverage <= maxLeverage, "Invalid leverage");
        require(activeFeedIds[feedId], "Invalid feed ID");
        
        // Get current price from oracle
        (uint256 currentPrice, uint256 lastUpdate) = priceOracle.getLatestPrice(feedId);
        
        // Check price staleness
        require(block.timestamp <= lastUpdate + MAX_PRICE_STALENESS, "Price data too stale");
        
        // Calculate and transfer platform fee
        uint256 fee = (amount * PLATFORM_FEE_BPS) / 10000;
        uint256 netAmount = amount - fee;
        accumulatedFees += fee;
        
        // Transfer collateral from user
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Create position
        positionId = nextPositionId++;
        positions[positionId] = Position({
            trader: msg.sender,
            amount: netAmount,
            entryPrice: currentPrice,
            leverage: leverage,
            isLong: isLong,
            openTimestamp: block.timestamp,
            feedId: feedId
        });
        
        userPositions[msg.sender].push(positionId);
        
        emit PositionOpened(
            positionId,
            msg.sender,
            netAmount,
            currentPrice,
            leverage,
            isLong,
            feedId
        );
    }
    
    /**
     * @notice Closes an open position and realizes PnL
     * @param positionId ID of the position to close
     */
    function closePosition(uint256 positionId) external notEmergency {
        Position memory position = positions[positionId];
        require(position.trader == msg.sender, "Not position owner");
        require(position.amount > 0, "Position already closed");
        
        // Get current price from oracle
        (uint256 currentPrice, uint256 lastUpdate) = priceOracle.getLatestPrice(position.feedId);
        
        // Check price staleness
        require(block.timestamp <= lastUpdate + MAX_PRICE_STALENESS, "Price data too stale");
        
        // Calculate PnL
        (int256 pnl, uint256 payout) = calculatePnL(position, currentPrice);
        
        // Delete position
        delete positions[positionId];
        
        // Transfer payout if any
        if (payout > 0) {
            collateralToken.safeTransfer(msg.sender, payout);
        }
        
        emit PositionClosed(positionId, msg.sender, pnl, currentPrice);
    }
    
    /**
     * @notice Liquidates a position that has reached liquidation threshold
     * @param positionId ID of the position to liquidate
     */
    function liquidatePosition(uint256 positionId) external notEmergency {
        Position memory position = positions[positionId];
        require(position.amount > 0, "Position already closed");
        
        // Get current price from oracle
        (uint256 currentPrice, uint256 lastUpdate) = priceOracle.getLatestPrice(position.feedId);
        
        // Price can be slightly stale for liquidations (up to 10 minutes)
        require(block.timestamp <= lastUpdate + 10 * 60, "Price data too stale for liquidation");
        
        // Check if position should be liquidated
        require(shouldLiquidate(position, currentPrice), "Position not liquidatable");
        
        // Delete position (no payout for liquidated positions)
        delete positions[positionId];
        
        // Liquidator gets a small reward (0.1% of position)
        uint256 liquidatorReward = (position.amount * 10) / 10000; // 0.1%
        if (liquidatorReward > 0) {
            collateralToken.safeTransfer(msg.sender, liquidatorReward);
        }
        
        emit PositionLiquidated(positionId, position.trader, currentPrice);
    }
    
    /**
     * @notice Calculates current PnL for a position
     * @param positionId ID of the position
     * @return pnl Current profit/loss in collateral token units
     * @return currentPrice Current price of the asset
     */
    function getCurrentPnL(uint256 positionId) external view returns (int256 pnl, uint256 currentPrice) {
        Position memory position = positions[positionId];
        require(position.amount > 0, "Position closed");
        
        // Get current price from oracle
        (currentPrice, ) = priceOracle.getLatestPrice(position.feedId);
        (pnl, ) = calculatePnL(position, currentPrice);
    }
    
    /**
     * @notice Calculates profit/loss for a position
     * @param position The position to calculate PnL for
     * @param currentPrice Current asset price
     * @return pnl Profit/loss amount
     * @return payout Amount to pay out (0 if loss exceeds collateral)
     */
    function calculatePnL(
        Position memory position,
        uint256 currentPrice
    ) internal pure returns (int256 pnl, uint256 payout) {
        // Calculate price change percentage
        int256 priceChangePercent;
        
        if (position.isLong) {
            // Long: profit when price goes up
            priceChangePercent = ((int256(currentPrice) - int256(position.entryPrice)) * int256(PRECISION)) / int256(position.entryPrice);
        } else {
            // Short: profit when price goes down
            priceChangePercent = ((int256(position.entryPrice) - int256(currentPrice)) * int256(PRECISION)) / int256(position.entryPrice);
        }
        
        // Apply leverage
        int256 leveragedChangePercent = (priceChangePercent * int256(position.leverage)) / int256(LEVERAGE_PRECISION);
        
        // Calculate PnL
        pnl = (int256(position.amount) * leveragedChangePercent) / int256(PRECISION);
        
        // Calculate payout (can't lose more than collateral)
        if (pnl >= 0) {
            payout = position.amount + uint256(pnl);
        } else {
            uint256 loss = uint256(-pnl);
            if (loss >= position.amount) {
                payout = 0; // Total loss
            } else {
                payout = position.amount - loss;
            }
        }
    }
    
    /**
     * @notice Checks if a position should be liquidated
     * @param position The position to check
     * @param currentPrice Current asset price
     * @return shouldLiq True if position should be liquidated
     */
    function shouldLiquidate(
        Position memory position,
        uint256 currentPrice
    ) internal pure returns (bool shouldLiq) {
        (int256 pnl, ) = calculatePnL(position, currentPrice);
        
        // Liquidate if loss exceeds threshold
        if (pnl < 0) {
            uint256 loss = uint256(-pnl);
            uint256 lossPercent = (loss * 100) / position.amount;
            shouldLiq = lossPercent >= LIQUIDATION_THRESHOLD;
        }
    }
    
    /**
     * @notice Updates the price oracle address
     * @param newOracle New oracle address
     */
    function setPriceOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid oracle address");
        priceOracle = PriceOracle(newOracle);
        emit PriceOracleUpdated(newOracle);
    }
    
    /**
     * @notice Enables or disables a price feed
     * @param feedId Feed ID to update
     * @param active Whether to activate or deactivate
     */
    function setFeedStatus(string calldata feedId, bool active) external onlyOwner {
        activeFeedIds[feedId] = active;
        emit FeedStatusChanged(feedId, active);
    }
    
    /**
     * @notice Withdraws accumulated platform fees
     * @param recipient Address to receive fees
     */
    function withdrawFees(address recipient) external onlyOwner {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        
        accumulatedFees = 0;
        collateralToken.safeTransfer(recipient, amount);
        
        emit FeesWithdrawn(recipient, amount);
    }
    
    /**
     * @notice Sets emergency stop state
     * @param stop True to activate emergency stop
     */
    function setEmergencyStop(bool stop) external onlyOwner {
        emergencyStop = stop;
        emit EmergencyStopSet(stop);
    }
    
    /**
     * @notice Gets all position IDs for a user
     * @param user Address of the user
     * @return Position IDs array
     */
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }
    
    /**
     * @notice Gets oracle price data for multiple feeds
     * @param feedIds Array of feed IDs
     * @return prices Array of prices
     * @return lastUpdates Array of last update timestamps
     */
    function getOraclePrices(string[] calldata feedIds) 
        external 
        view 
        returns (uint256[] memory prices, uint256[] memory lastUpdates) 
    {
        return priceOracle.getPrices(feedIds);
    }
    
    /**
     * @notice Sets maximum leverage for a specific asset
     * @param feedId Feed ID (e.g., "BTCUSD", "ETHUSD")
     * @param maxLeverage Maximum leverage with LEVERAGE_PRECISION
     */
    function setMaxLeverageForAsset(string calldata feedId, uint256 maxLeverage) external onlyOwner {
        require(maxLeverage >= LEVERAGE_PRECISION && maxLeverage <= DEFAULT_MAX_LEVERAGE, "Invalid max leverage");
        maxLeveragePerAsset[feedId] = maxLeverage;
        emit MaxLeverageUpdated(feedId, maxLeverage);
    }
    
    /**
     * @notice Gets maximum leverage for an asset
     * @param feedId Feed ID
     * @return Maximum leverage with LEVERAGE_PRECISION
     */
    function getMaxLeverageForAsset(string calldata feedId) external view returns (uint256) {
        uint256 maxLeverage = maxLeveragePerAsset[feedId];
        return maxLeverage == 0 ? DEFAULT_MAX_LEVERAGE : maxLeverage;
    }
}