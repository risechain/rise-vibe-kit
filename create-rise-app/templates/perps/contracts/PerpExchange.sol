// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/Stork/IStork.sol";

contract PerpExchange {
    // Stork oracle integration
    IStork public immutable storkOracle;
    bytes32 public immutable priceFeedId;
    
    // Position structure
    struct Position {
        address trader;
        bool isLong;
        uint256 size;
        uint256 collateral;
        uint256 entryPrice;
        uint256 entryTimestamp;
        uint256 lastFundingTimestamp;
        bool isOpen;
    }
    
    // Positions
    mapping(uint256 => Position) public positions;
    uint256 public nextPositionId;
    
    // Price data
    uint256 public lastPrice;
    uint256 public lastPriceTimestamp;
    
    // Constants
    uint256 public constant MAX_LEVERAGE = 100;
    uint256 public constant MIN_COLLATERAL = 1e16; // 0.01 ETH
    uint256 public constant LIQUIDATION_THRESHOLD = 80; // 80% loss triggers liquidation
    uint256 public constant STALENESS_PERIOD = 3600; // 1 hour
    uint256 public constant PRICE_PRECISION = 1e8; // 8 decimals for price
    
    // Events
    event PositionOpened(uint256 indexed positionId, address indexed trader, bool isLong, uint256 size, uint256 collateral, uint256 entryPrice);
    event PositionClosed(uint256 indexed positionId, uint256 closePrice, int256 pnl);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice, uint256 timestamp);
    event PositionLiquidated(uint256 indexed positionId, uint256 liquidationPrice);
    
    modifier priceNotStale() {
        require(block.timestamp - lastPriceTimestamp <= STALENESS_PERIOD, "Price data is stale");
        _;
    }
    
    constructor(address _storkOracle, bytes32 _priceFeedId) {
        require(_storkOracle != address(0), "Invalid Stork oracle address");
        storkOracle = IStork(_storkOracle);
        priceFeedId = _priceFeedId;
        
        // Get initial price
        _updatePrice();
    }
    
    // Submit price updates to Stork oracle
    function submitPriceUpdate(IStork.TemporalNumericValueInput calldata updateData) external payable {
        require(updateData.id == priceFeedId, "Invalid feed ID");
        
        // Calculate required fee
        IStork.TemporalNumericValueInput[] memory updates = new IStork.TemporalNumericValueInput[](1);
        updates[0] = updateData;
        uint256 requiredFee = storkOracle.getUpdateFeeV1(updates);
        require(msg.value >= requiredFee, "Insufficient fee");
        
        // Submit update to Stork
        storkOracle.updateTemporalNumericValuesV1{value: msg.value}(updates);
        
        // Update our cached price
        _updatePrice();
    }
    
    // Open a new position using current oracle price
    function openPosition(bool _isLong, uint256 _leverage) external payable priceNotStale {
        require(msg.value >= MIN_COLLATERAL, "Insufficient collateral");
        require(_leverage > 0 && _leverage <= MAX_LEVERAGE, "Invalid leverage");
        
        // Update price from oracle
        _updatePrice();
        
        uint256 size = msg.value * _leverage;
        uint256 positionId = nextPositionId++;
        
        positions[positionId] = Position({
            trader: msg.sender,
            isLong: _isLong,
            size: size,
            collateral: msg.value,
            entryPrice: lastPrice,
            entryTimestamp: block.timestamp,
            lastFundingTimestamp: block.timestamp,
            isOpen: true
        });
        
        emit PositionOpened(positionId, msg.sender, _isLong, size, msg.value, lastPrice);
    }
    
    // Close position
    function closePosition(uint256 _positionId) external priceNotStale {
        Position storage position = positions[_positionId];
        require(position.trader == msg.sender, "Not position owner");
        require(position.isOpen, "Position already closed");
        
        // Update price from oracle
        _updatePrice();
        
        // Calculate PnL
        int256 pnl = calculatePnL(_positionId);
        position.isOpen = false;
        
        // Transfer funds
        if (pnl > 0) {
            uint256 payout = position.collateral + uint256(pnl);
            payable(msg.sender).transfer(payout);
        } else if (int256(position.collateral) + pnl > 0) {
            uint256 payout = uint256(int256(position.collateral) + pnl);
            payable(msg.sender).transfer(payout);
        }
        // If pnl is negative and exceeds collateral, trader loses all collateral
        
        emit PositionClosed(_positionId, lastPrice, pnl);
    }
    
    // Calculate profit/loss for a position
    function calculatePnL(uint256 _positionId) public view returns (int256) {
        Position memory position = positions[_positionId];
        if (!position.isOpen || position.entryPrice == 0) return 0;
        
        uint256 currentPrice = lastPrice;
        if (currentPrice == 0) return 0;
        
        // Use signed arithmetic to handle negative PnL
        int256 priceDiff = int256(currentPrice) - int256(position.entryPrice);
        
        if (position.isLong) {
            // Long position: profit if price goes up
            return (priceDiff * int256(position.size)) / int256(position.entryPrice);
        } else {
            // Short position: profit if price goes down
            return (-priceDiff * int256(position.size)) / int256(position.entryPrice);
        }
    }
    
    // Liquidate underwater positions
    function liquidatePosition(uint256 _positionId) external {
        Position storage position = positions[_positionId];
        require(position.isOpen, "Position not open");
        
        // Update price before checking liquidation
        _updatePrice();
        
        int256 pnl = calculatePnL(_positionId);
        require(pnl < 0 && uint256(-pnl) >= (position.collateral * LIQUIDATION_THRESHOLD) / 100, "Not liquidatable");
        
        position.isOpen = false;
        
        // Liquidator gets 10% of remaining collateral as reward
        uint256 liquidatorReward = position.collateral / 10;
        if (liquidatorReward > 0) {
            payable(msg.sender).transfer(liquidatorReward);
        }
        
        emit PositionLiquidated(_positionId, lastPrice);
    }
    
    // Internal function to update price from Stork oracle
    function _updatePrice() internal {
        try storkOracle.getTemporalNumericValueV1(priceFeedId) returns (IStork.TemporalNumericValue memory value) {
            require(value.quantizedValue >= 0, "Negative price not supported");
            
            uint256 oldPrice = lastPrice;
            lastPrice = uint256(int256(value.quantizedValue));
            lastPriceTimestamp = uint256(value.timestampNs) / 1e9; // Convert nanoseconds to seconds
            
            emit PriceUpdated(oldPrice, lastPrice, lastPriceTimestamp);
        } catch {
            // If oracle call fails, we keep the last known price
            // This could be enhanced with more sophisticated error handling
        }
    }
    
    // Force price update (can be called by anyone)
    function updatePrice() external {
        _updatePrice();
    }
    
    // View functions
    function getPosition(uint256 _positionId) external view returns (Position memory) {
        return positions[_positionId];
    }
    
    function getPositionHealth(uint256 _positionId) external view returns (int256 pnl, uint256 healthRatio) {
        Position memory position = positions[_positionId];
        if (!position.isOpen || position.entryPrice == 0) return (0, 100);
        
        pnl = calculatePnL(_positionId);
        
        if (pnl >= 0) {
            healthRatio = 100;
        } else {
            uint256 loss = uint256(-pnl);
            if (loss >= position.collateral) {
                healthRatio = 0;
            } else {
                healthRatio = 100 - (loss * 100 / position.collateral);
            }
        }
    }
    
    // Get current price info
    function getCurrentPrice() external view returns (uint256 price, uint256 timestamp) {
        return (lastPrice, lastPriceTimestamp);
    }
    
    // Check if price is stale
    function isPriceStale() external view returns (bool) {
        return block.timestamp - lastPriceTimestamp > STALENESS_PERIOD;
    }
}