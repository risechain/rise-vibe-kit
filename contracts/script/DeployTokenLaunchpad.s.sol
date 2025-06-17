// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {TokenLaunchpad} from "../src/TokenLaunchpad.sol";

contract DeployTokenLaunchpadScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        TokenLaunchpad launchpad = new TokenLaunchpad();
        
        console.log("TokenLaunchpad deployed to:", address(launchpad));
        console.log("");
        console.log("Deployment successful! Contract address:", address(launchpad));

        vm.stopBroadcast();
    }
}