// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/SimpleStorage.sol";

contract DeployMultipleScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy SimpleStorage
        SimpleStorage simpleStorage = new SimpleStorage();
        console.log("SimpleStorage deployed at:", address(simpleStorage));

        vm.stopBroadcast();
    }
}