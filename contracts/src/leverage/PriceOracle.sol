// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @notice Simplified price oracle for leverage trading
 * @dev Uses string feed IDs (e.g., "BTCUSD") and removes timestamp complexity
 */
contract PriceOracle is Ownable {
    struct PriceData {
        uint256 price;          // Price with 18 decimals
        uint256 lastUpdate;     // Block timestamp of last update
        uint256 updateCount;    // Total updates
    }
    
    // Mapping from feed ID string to price data
    mapping(string => PriceData) public prices;
    
    // Authorized updaters (oracle runners)
    mapping(address => bool) public authorizedUpdaters;
    
    // Events
    event PriceUpdated(string indexed feedId, uint256 price, uint256 timestamp);
    event UpdaterAuthorized(address indexed updater, bool authorized);
    
    // Errors
    error UnauthorizedUpdater(address updater);
    error InvalidPrice();
    
    modifier onlyAuthorized() {
        if (!authorizedUpdaters[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedUpdater(msg.sender);
        }
        _;
    }
    
    constructor() Ownable(msg.sender) {
        // Owner is automatically authorized
        authorizedUpdaters[msg.sender] = true;
    }
    
    /**
     * @notice Updates the price for a given feed
     * @param feedId The feed identifier (e.g., "BTCUSD", "ETHUSD")
     * @param price The new price with 18 decimals
     */
    function updatePrice(
        string calldata feedId,
        uint256 price
    ) external onlyAuthorized {
        if (price == 0) revert InvalidPrice();
        
        PriceData storage data = prices[feedId];
        
        // Update price data
        data.price = price;
        data.lastUpdate = block.timestamp;
        data.updateCount++;
        
        emit PriceUpdated(feedId, price, block.timestamp);
    }
    
    /**
     * @notice Updates multiple prices in a single transaction
     * @param feedIds Array of feed identifiers
     * @param _prices Array of prices
     */
    function updatePrices(
        string[] calldata feedIds,
        uint256[] calldata _prices
    ) external onlyAuthorized {
        require(feedIds.length == _prices.length, "Array length mismatch");
        
        for (uint256 i = 0; i < feedIds.length; i++) {
            if (_prices[i] == 0) continue; // Skip invalid prices
            
            PriceData storage data = prices[feedIds[i]];
            
            // Update price data
            data.price = _prices[i];
            data.lastUpdate = block.timestamp;
            data.updateCount++;
            
            emit PriceUpdated(feedIds[i], _prices[i], block.timestamp);
        }
    }
    
    /**
     * @notice Gets the latest price for a feed
     * @param feedId The feed identifier
     * @return price The latest price
     * @return lastUpdate The timestamp of the last update
     */
    function getLatestPrice(string calldata feedId) external view returns (uint256 price, uint256 lastUpdate) {
        PriceData memory data = prices[feedId];
        require(data.price > 0, "No price data available");
        return (data.price, data.lastUpdate);
    }
    
    /**
     * @notice Checks if price data is stale
     * @param feedId The feed identifier
     * @param maxAge Maximum age in seconds
     * @return True if data is stale
     */
    function isStale(string calldata feedId, uint256 maxAge) external view returns (bool) {
        PriceData memory data = prices[feedId];
        if (data.price == 0) return true;
        return block.timestamp > data.lastUpdate + maxAge;
    }
    
    /**
     * @notice Authorizes or revokes an updater
     * @param updater The address to authorize/revoke
     * @param authorized Whether to authorize or revoke
     */
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        authorizedUpdaters[updater] = authorized;
        emit UpdaterAuthorized(updater, authorized);
    }
    
    /**
     * @notice Gets price data for multiple feeds
     * @param feedIds Array of feed identifiers
     * @return _prices Array of prices
     * @return lastUpdates Array of last update timestamps
     */
    function getPrices(string[] calldata feedIds) 
        external 
        view 
        returns (uint256[] memory _prices, uint256[] memory lastUpdates) 
    {
        _prices = new uint256[](feedIds.length);
        lastUpdates = new uint256[](feedIds.length);
        
        for (uint256 i = 0; i < feedIds.length; i++) {
            PriceData memory data = prices[feedIds[i]];
            _prices[i] = data.price;
            lastUpdates[i] = data.lastUpdate;
        }
    }
}