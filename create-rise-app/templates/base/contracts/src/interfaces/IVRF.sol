// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IVRFCoordinator {
    function requestRandomNumbers(uint32 numNumbers, uint256 seed) external returns (uint256);
}

interface IVRFConsumer {
    function rawFulfillRandomNumbers(
        uint256 requestId,
        uint256[] memory randomNumbers
    ) external;
}