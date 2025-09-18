// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {MockTokenFactory, MockToken} from "../src/MockTokens.sol";
import {UniswapV2Deployer} from "../src/uniswapV2/UniswapV2Deployer.sol";

contract DeployPlayground is Script {
    // UniswapV2 addresses on RISE testnet
    // These should be replaced with actual deployed addresses
    address constant UNISWAP_V2_FACTORY = address(0); // TODO: Deploy or use existing
    address constant UNISWAP_V2_ROUTER = address(0);  // TODO: Deploy or use existing

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying Wallet Playground contracts with deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy Mock Token Factory
        console.log("Deploying MockTokenFactory...");
        MockTokenFactory tokenFactory = new MockTokenFactory();
        console.log("MockTokenFactory deployed at:", address(tokenFactory));

        // Use RISE testnet WETH
        address weth = 0x4200000000000000000000000000000000000006;

        // Get all token addresses
        (
            address usdc,
            address dai,
            address pepe
        ) = tokenFactory.getAllTokens();

        console.log("Mock Tokens deployed:");
        console.log("  USDC:", usdc);
        console.log("  DAI:", dai);
        console.log("  PEPE:", pepe);
        console.log("Using RISE testnet WETH:", weth);

        // Step 2: Deploy UniswapV2 contracts if needed
        // For now, we'll skip this and assume they're already deployed
        // In production, you'd either use existing UniswapV2 or deploy your own

        if (UNISWAP_V2_FACTORY != address(0) && UNISWAP_V2_ROUTER != address(0)) {
            // Step 3: Deploy UniswapV2Deployer helper
            console.log("Deploying UniswapV2Deployer...");
            UniswapV2Deployer uniswapDeployer = new UniswapV2Deployer(
                UNISWAP_V2_FACTORY,
                UNISWAP_V2_ROUTER,
                weth
            );
            console.log("UniswapV2Deployer deployed at:", address(uniswapDeployer));

            // Step 4: Initialize pairs with liquidity (optional)
            // This would require having tokens and ETH in the deployer account
            // uniswapDeployer.initializePairs{value: 1 ether}(usdc, dai, pepe);
        } else {
            console.log("Skipping UniswapV2 setup - addresses not configured");
        }

        // Step 5: Mint initial tokens to deployer for testing
        console.log("Minting initial tokens to deployer...");
        MockToken(usdc).mint(deployer, 100000 * 10**6);   // 100k USDC
        MockToken(dai).mint(deployer, 100000 * 10**18);   // 100k DAI
        MockToken(pepe).mint(deployer, 1000000000 * 10**18); // 1B PEPE

        vm.stopBroadcast();

        console.log("\nDeployment complete!");
        console.log("\nContract addresses for frontend:");
        console.log("{");
        console.log('  "mockTokenFactory": "', address(tokenFactory), '",');
        console.log('  "weth": "', weth, '",');
        console.log('  "usdc": "', usdc, '",');
        console.log('  "dai": "', dai, '",');
        console.log('  "pepe": "', pepe, '"');
        console.log("}");
    }
}