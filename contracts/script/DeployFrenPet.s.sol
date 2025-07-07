// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {FrenPet} from "../src/FrenPet.sol";

contract DeployFrenPetScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        FrenPet frenpet = new FrenPet();
        
        console.log("FrenPet deployed to:", address(frenpet));
        console.log("");
        console.log("Deployment successful! Contract address:", address(frenpet));

        vm.stopBroadcast();
    }
}