// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IStork
 * @dev Interface for interacting with the Stork oracle contract
 */
interface IStork {
    /**
     * @dev Structure for temporal numeric value storage
     */
    struct TemporalNumericValue {
        // nanosecond level precision timestamp of latest publisher update in batch
        uint64 timestampNs; // 8 bytes
        // should be able to hold all necessary numbers
        int192 quantizedValue; // 24 bytes
    }
    
    /**
     * @dev Structure for temporal numeric value input from publishers
     */
    struct TemporalNumericValueInput {
        TemporalNumericValue temporalNumericValue;
        bytes32 id;
        bytes32 publisherMerkleRoot;
        bytes32 valueComputeAlgHash;
        bytes32 r;
        bytes32 s;
        uint8 v;
    }
    
    /**
     * @dev Structure for publisher signatures
     */
    struct PublisherSignature {
        address pubKey;
        string assetPairId;
        uint64 timestamp; // 8 bytes
        uint256 quantizedValue; // 8 bytes
        bytes32 r;
        bytes32 s;
        uint8 v;
    }
    
    /**
     * @dev Updates multiple temporal numeric values by verifying signatures
     * @param updateData Array of TemporalNumericValueInput structs containing feed updates
     */
    function updateTemporalNumericValuesV1(
        TemporalNumericValueInput[] calldata updateData
    ) external payable;
    
    /**
     * @dev Retrieves the latest temporal numeric value for the specified feed ID
     * @param id The identifier of the feed
     * @return value The latest TemporalNumericValue struct for the feed
     */
    function getTemporalNumericValueV1(
        bytes32 id
    ) external view returns (TemporalNumericValue memory value);
    
    /**
     * @dev Retrieves the latest value without freshness check
     * @param id The identifier of the feed
     * @return value The latest TemporalNumericValue struct for the feed
     */
    function getTemporalNumericValueUnsafeV1(
        bytes32 id
    ) external view returns (TemporalNumericValue memory value);
    
    /**
     * @dev Calculates the total fee required for the given updates
     * @param updateData Array of TemporalNumericValueInput structs
     * @return feeAmount The total fee required for the updates
     */
    function getUpdateFeeV1(
        TemporalNumericValueInput[] calldata updateData
    ) external view returns (uint256 feeAmount);
    
    /**
     * @dev Verifies multiple publisher signatures against the provided Merkle root
     * @param signatures Array of PublisherSignature structs
     * @param merkleRoot The Merkle root to validate against
     * @return True if all signatures are valid
     */
    function verifyPublisherSignaturesV1(
        PublisherSignature[] calldata signatures,
        bytes32 merkleRoot
    ) external pure returns (bool);
    
    /**
     * @dev Gets the contract version
     * @return The version string
     */
    function version() external pure returns (string memory);
    
    /**
     * @dev Gets the Stork public key
     * @return The Stork public key
     */
    function storkPublicKey() external view returns (address);
}