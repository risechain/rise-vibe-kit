// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title ITimeOracle
 * @notice Interface for a high-resolution time oracle providing millisecond timestamps
 * @dev All timestamps are in milliseconds since Unix epoch (January 1, 1970 00:00:00 UTC)
 */
interface ITimeOracle {
    /// @notice Emitted when the oracle time is updated
    /// @param timestamp The new timestamp in milliseconds
    /// @param updatedBy The address that performed the update
    event TimeUpdated(uint256 indexed timestamp, address indexed updatedBy);

    /// @notice Returns the latest timestamp in milliseconds
    /// @return The current timestamp in milliseconds since Unix epoch
    function getLatestTimestamp() external view returns (uint256);

    /// @notice Returns when the oracle was last updated
    /// @return The block timestamp when the oracle was last updated
    function getLastUpdateTime() external view returns (uint256);

    /// @notice Updates the oracle with a new timestamp
    /// @param timestamp The new timestamp in milliseconds since Unix epoch
    function updateTimestamp(uint256 timestamp) external;

    /// @notice Checks if the oracle data is considered stale
    /// @param maxAge Maximum age in seconds before data is considered stale
    /// @return True if the data is stale, false otherwise
    function isStale(uint256 maxAge) external view returns (bool);
}

