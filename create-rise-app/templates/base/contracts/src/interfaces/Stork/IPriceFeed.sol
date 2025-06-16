// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IPriceFeed
 * @dev Interface for price feed oracles that provide asset price data
 */
interface IPriceFeed {
    /**
     * @dev Returns the latest price for the specified asset
     * @param asset The identifier of the asset (e.g., "BTC/USD")
     * @return price The latest price with 8 decimals precision
     * @return timestamp The timestamp when the price was last updated
     * @return success Whether the price retrieval was successful
     */
    function getLatestPrice(string memory asset) external view returns (uint256 price, uint256 timestamp, bool success);
    
    /**
     * @dev Returns the price at a specific timestamp or the closest available price
     * @param asset The identifier of the asset (e.g., "BTC/USD")
     * @param timestamp The target timestamp to get price for
     * @return price The price at the requested time with 8 decimals precision
     * @return actualTimestamp The actual timestamp of the returned price
     * @return success Whether the price retrieval was successful
     */
    function getPriceAtTime(string memory asset, uint256 timestamp) 
        external view returns (uint256 price, uint256 actualTimestamp, bool success);
        
    /**
     * @dev Sets the primary asset for the game (e.g., "BTC/USD")
     * @param asset The identifier of the asset to use as default
     */
    function setPrimaryAsset(string memory asset) external;
    
    /**
     * @dev Gets the primary asset identifier
     * @return The current primary asset identifier
     */
    function getPrimaryAsset() external view returns (string memory);
}