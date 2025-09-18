// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {IUniswapV2Factory} from "../src/uniswapV2/interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Router} from "../src/uniswapV2/interfaces/IUniswapV2Router.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IWETH} from "../src/uniswapV2/interfaces/IWETH.sol";

contract AddLiquidityRISE is Script {
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

        console.log("Adding liquidity to UniswapV2 pairs on RISE testnet");
        console.log("Deployer:", deployer);

        // Check balances first
        uint256 ethBalance = deployer.balance;
        uint256 wethBalance = IERC20(WETH).balanceOf(deployer);
        uint256 usdcBalance = IERC20(USDC).balanceOf(deployer);
        uint256 usdtBalance = IERC20(USDT).balanceOf(deployer);

        console.log("\nCurrent balances:");
        console.log("  ETH:", ethBalance);
        console.log("  WETH:", wethBalance);
        console.log("  USDC:", usdcBalance);
        console.log("  USDT:", usdtBalance);

        if (usdcBalance == 0 && usdtBalance == 0) {
            console.log("\n[WARNING] You have no USDC or USDT!");
            console.log("Please get tokens from: https://faucet.risechain.com/");
            console.log("Then run this script again.");
            return;
        }

        vm.startBroadcast(deployerPrivateKey);

        IUniswapV2Router router = IUniswapV2Router(ROUTER);

        // Wrap some ETH if we don't have WETH
        if (wethBalance == 0 && ethBalance > 0.1 ether) {
            console.log("\nWrapping 0.1 ETH to WETH...");
            IWETH(WETH).deposit{value: 0.1 ether}();
            wethBalance = IERC20(WETH).balanceOf(deployer);
            console.log("New WETH balance:", wethBalance);
        }

        // Approve router for all tokens
        console.log("\nApproving router for all tokens...");
        IERC20(WETH).approve(ROUTER, type(uint256).max);
        IERC20(USDC).approve(ROUTER, type(uint256).max);
        IERC20(USDT).approve(ROUTER, type(uint256).max);

        // Add liquidity to pairs based on available balances
        uint256 liquidityAdded = 0;

        // 1. Add WETH/USDC liquidity
        if (wethBalance >= 0.01 ether && usdcBalance >= 100 * 10**6) {
            console.log("\nAdding liquidity to WETH/USDC pair...");
            try router.addLiquidity(
                WETH,
                USDC,
                0.01 ether,      // 0.01 WETH
                100 * 10**6,     // 100 USDC (assuming 1 WETH = 10,000 USDC)
                0,
                0,
                deployer,
                block.timestamp + 300
            ) returns (uint amountA, uint amountB, uint liquidity) {
                console.log("  WETH added:", amountA);
                console.log("  USDC added:", amountB);
                console.log("  LP tokens received:", liquidity);
                liquidityAdded++;
            } catch Error(string memory reason) {
                console.log("  Failed:", reason);
            }
        }

        // 2. Add WETH/USDT liquidity
        if (wethBalance >= 0.01 ether && usdtBalance >= 100 * 10**8) {
            console.log("\nAdding liquidity to WETH/USDT pair...");
            try router.addLiquidity(
                WETH,
                USDT,
                0.01 ether,      // 0.01 WETH
                100 * 10**8,     // 100 USDT (8 decimals)
                0,
                0,
                deployer,
                block.timestamp + 300
            ) returns (uint amountA, uint amountB, uint liquidity) {
                console.log("  WETH added:", amountA);
                console.log("  USDT added:", amountB);
                console.log("  LP tokens received:", liquidity);
                liquidityAdded++;
            } catch Error(string memory reason) {
                console.log("  Failed:", reason);
            }
        }

        // 3. Add USDC/USDT liquidity
        if (usdcBalance >= 100 * 10**6 && usdtBalance >= 100 * 10**8) {
            console.log("\nAdding liquidity to USDC/USDT pair...");
            try router.addLiquidity(
                USDC,
                USDT,
                100 * 10**6,     // 100 USDC
                100 * 10**8,     // 100 USDT
                0,
                0,
                deployer,
                block.timestamp + 300
            ) returns (uint amountA, uint amountB, uint liquidity) {
                console.log("  USDC added:", amountA);
                console.log("  USDT added:", amountB);
                console.log("  LP tokens received:", liquidity);
                liquidityAdded++;
            } catch Error(string memory reason) {
                console.log("  Failed:", reason);
            }
        }

        vm.stopBroadcast();

        if (liquidityAdded > 0) {
            console.log("\n========================================");
            console.log("Liquidity Added Successfully!");
            console.log("========================================");
            console.log("Pairs with liquidity:", liquidityAdded);
        } else {
            console.log("\n========================================");
            console.log("No liquidity added");
            console.log("========================================");
            console.log("Make sure you have sufficient token balances");
        }
    }
}