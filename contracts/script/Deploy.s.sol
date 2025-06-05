// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {ChatApp} from "../src/chatApp.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ChatApp app = new ChatApp();
        
        console.log("app deployed to:", address(app));

        vm.stopBroadcast();
    }
}