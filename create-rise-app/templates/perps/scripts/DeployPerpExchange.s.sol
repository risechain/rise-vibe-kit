// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/PerpExchange.sol";

contract DeployPerpExchange is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address storkOracle = vm.envAddress("STORK_ORACLE_ADDRESS");
        bytes32 priceFeedId = vm.envBytes32("PRICE_FEED_ID");
        
        vm.startBroadcast(deployerPrivateKey);
        
        PerpExchange perpExchange = new PerpExchange(storkOracle, priceFeedId);
        
        console.log("PerpExchange deployed to:", address(perpExchange));
        console.log("Stork Oracle:", storkOracle);
        console.log("Price Feed ID:", uint256(priceFeedId));
        
        // Get initial price info
        (uint256 price, uint256 timestamp) = perpExchange.getCurrentPrice();
        console.log("Initial price:", price);
        console.log("Last update timestamp:", timestamp);
        console.log("Is price stale:", perpExchange.isPriceStale());
        
        vm.stopBroadcast();
    }
}