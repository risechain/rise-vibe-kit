// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {ChatApp} from "../src/chatApp.sol";
import {TokenLaunchpad} from "../src/TokenLaunchpad.sol";
import {FrenPet} from "../src/FrenPet.sol";

contract DeployAllScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy ChatApp
        ChatApp chatApp = new ChatApp();
        console.log("ChatApp deployed to:", address(chatApp));

        // Deploy TokenLaunchpad
        TokenLaunchpad launchpad = new TokenLaunchpad();
        console.log("TokenLaunchpad deployed to:", address(launchpad));

        // Deploy FrenPet
        FrenPet frenpet = new FrenPet();
        console.log("FrenPet deployed to:", address(frenpet));

        console.log("");
        console.log("All contracts deployed successfully!");
        console.log("ChatApp:", address(chatApp));
        console.log("TokenLaunchpad:", address(launchpad));
        console.log("FrenPet:", address(frenpet));

        vm.stopBroadcast();
    }
}