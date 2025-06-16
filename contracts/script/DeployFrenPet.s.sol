// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {FrenPet} from "../src/FrenPet.sol";

contract DeployFrenPetScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        FrenPet frenpet = new FrenPet();
        
        console.log("FrenPet deployed to:", address(frenpet));

        vm.stopBroadcast();
    }
}