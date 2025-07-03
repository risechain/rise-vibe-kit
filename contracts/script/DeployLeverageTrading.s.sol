// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/leverage/LeverageTrading.sol";

contract DeployLeverageTrading is Script {
    // RISE USDC and Oracle addresses
    address constant RISE_USDC = 0x8A93d247134d91e0de6f96547cB0204e5BE8e5D8;
    address constant RISE_ORACLE = 0x5A569Ad19272Afa97103fD4DbadF33B2FcbaA175;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy LeverageTrading contract with RISE USDC and Oracle
        LeverageTrading leverageTrading = new LeverageTrading(
            RISE_USDC,
            RISE_ORACLE
        );
        
        console.log("LeverageTrading deployed at:", address(leverageTrading));
        console.log("Using RISE USDC:", RISE_USDC);
        console.log("Using RISE Oracle:", RISE_ORACLE);
        
        vm.stopBroadcast();
    }
}