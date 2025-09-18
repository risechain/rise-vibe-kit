// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {IUniswapV2Factory} from "../src/uniswapV2/interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Router} from "../src/uniswapV2/interfaces/IUniswapV2Router.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract InitializePairs is Script {
    // Deployed UniswapV2 contracts
    address constant FACTORY = 0xB506E780805a945e13691560ADf90421A1c6f03b;
    address constant ROUTER = 0x9a5Ae52Cfb54a589FbF602191358a293C1681173;

    // RISE testnet official tokens
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x8A93d247134d91e0de6f96547cB0204e5BE8e5D8;
    address constant USDT = 0x40918Ba7f132E0aCba2CE4de4c4baF9BD2D7D849;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Initializing UniswapV2 pairs on RISE testnet");
        console.log("Deployer:", deployer);
        console.log("\nUniswapV2 Contracts:");
        console.log("  Factory:", FACTORY);
        console.log("  Router:", ROUTER);
        console.log("\nRISE Testnet Tokens:");
        console.log("  WETH:", WETH);
        console.log("  USDC:", USDC);
        console.log("  USDT:", USDT);

        vm.startBroadcast(deployerPrivateKey);

        IUniswapV2Factory factory = IUniswapV2Factory(FACTORY);

        // Create pairs
        console.log("\nCreating trading pairs...");

        // 1. WETH/USDC - Main trading pair
        address wethUsdcPair = createOrGetPair(factory, WETH, USDC, "WETH/USDC");

        // 2. WETH/USDT - Alternative stable pair
        address wethUsdtPair = createOrGetPair(factory, WETH, USDT, "WETH/USDT");

        // 3. USDC/USDT - Stable swap
        address usdcUsdtPair = createOrGetPair(factory, USDC, USDT, "USDC/USDT");

        vm.stopBroadcast();

        // Display results
        console.log("\n========================================");
        console.log("Pair Initialization Complete!");
        console.log("========================================");
        console.log("\nTrading Pairs Created:");
        console.log("  WETH/USDC:", wethUsdcPair);
        console.log("  WETH/USDT:", wethUsdtPair);
        console.log("  USDC/USDT:", usdcUsdtPair);

        console.log("\nNext Steps:");
        console.log("1. Get tokens from faucet: https://faucet.risechain.com/");
        console.log("2. Add liquidity using the AddLiquidity script");
        console.log("3. Test swaps on the frontend");

        // Output for frontend
        console.log("\nUpdate frontend with these addresses:");
        console.log("{");
        console.log('  "WETH_USDC_PAIR": "', wethUsdcPair, '",');
        console.log('  "WETH_USDT_PAIR": "', wethUsdtPair, '",');
        console.log('  "USDC_USDT_PAIR": "', usdcUsdtPair, '"');
        console.log("}");
    }

    function createOrGetPair(
        IUniswapV2Factory factory,
        address tokenA,
        address tokenB,
        string memory pairName
    ) internal returns (address) {
        address pair = factory.getPair(tokenA, tokenB);

        if (pair == address(0)) {
            console.log("Creating pair:", pairName);
            pair = factory.createPair(tokenA, tokenB);
            console.log("  Created at:", pair);
        } else {
            console.log("Pair already exists:", pairName);
            console.log("  Address:", pair);
        }

        return pair;
    }
}