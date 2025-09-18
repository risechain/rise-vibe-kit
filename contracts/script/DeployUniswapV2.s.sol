// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {MockTokenFactory, MockToken} from "../src/MockTokens.sol";
import {UniswapV2Factory} from "../src/uniswapV2/UniswapV2Factory.sol";
import {UniswapV2Router} from "../src/uniswapV2/UniswapV2Router.sol";
import {UniswapV2Deployer} from "../src/uniswapV2/UniswapV2Deployer.sol";
import {IWETH} from "../src/uniswapV2/interfaces/IWETH.sol";

contract DeployUniswapV2 is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying UniswapV2 and Mock Tokens with deployer:", deployer);

        // RISE testnet WETH address
        address weth = 0x4200000000000000000000000000000000000006;
        console.log("Using RISE testnet WETH at:", weth);

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy Mock Token Factory (without WETH)
        console.log("Deploying MockTokenFactory...");
        MockTokenFactory tokenFactory = new MockTokenFactory();
        console.log("MockTokenFactory deployed at:", address(tokenFactory));

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

        // Step 2: Deploy UniswapV2Factory
        console.log("\nDeploying UniswapV2Factory...");
        UniswapV2Factory factory = new UniswapV2Factory(deployer);
        console.log("UniswapV2Factory deployed at:", address(factory));

        // Step 3: Deploy UniswapV2Router
        console.log("\nDeploying UniswapV2Router...");
        UniswapV2Router router = new UniswapV2Router(address(factory), weth);
        console.log("UniswapV2Router deployed at:", address(router));

        // Step 4: Deploy UniswapV2Deployer helper
        console.log("\nDeploying UniswapV2Deployer helper...");
        UniswapV2Deployer uniswapDeployer = new UniswapV2Deployer(
            address(factory),
            address(router),
            weth
        );
        console.log("UniswapV2Deployer deployed at:", address(uniswapDeployer));

        // Step 5: Note - tokens are already minted to the tokenFactory during deployment
        // The deployer would need ownership to mint more tokens
        console.log("\nTokens initially minted to TokenFactory during deployment");
        console.log("Use the faucet() function to get test tokens!");

        vm.stopBroadcast();

        // Output contract info for frontend
        console.log("\n========================================");
        console.log("Deployment Summary");
        console.log("========================================");
        console.log("Network: RISE Testnet");
        console.log("\nUniswapV2 Contracts:");
        console.log("  Factory:", address(factory));
        console.log("  Router:", address(router));
        console.log("  Deployer Helper:", address(uniswapDeployer));
        console.log("\nToken Contracts:");
        console.log("  WETH:", weth);
        console.log("  USDC:", usdc);
        console.log("  DAI:", dai);
        console.log("  PEPE:", pepe);
        console.log("\nContract addresses for frontend/src/contracts/uniswapV2.ts:");
        console.log("{");
        console.log('  "factory": "', address(factory), '",');
        console.log('  "router": "', address(router), '",');
        console.log('  "weth": "', weth, '",');
        console.log('  "usdc": "', usdc, '",');
        console.log('  "dai": "', dai, '",');
        console.log('  "pepe": "', pepe, '"');
        console.log("}");
    }
}