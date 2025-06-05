// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {ChatApp} from "../src/chatApp.sol";

contract DeployAndUpdateScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ChatApp app = new ChatApp();
        
        console.log("ChatApp deployed to:", address(app));
        console.log("");
        console.log("Deployment successful! Contract address:", address(app));
        console.log("");
        console.log("Run the following command to update the frontend:");
        console.log("npm run update-frontend -- %s", address(app));

        vm.stopBroadcast();
    }
}