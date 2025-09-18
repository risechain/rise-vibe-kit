// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {IUniswapV2Factory} from "../src/uniswapV2/interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Router} from "../src/uniswapV2/interfaces/IUniswapV2Router.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IWETH} from "../src/uniswapV2/interfaces/IWETH.sol";

contract AddLiquidityV2 is Script {
    // Contract addresses - update these after deployment
    address constant UNISWAP_V2_FACTORY = address(0); // TODO: Update after deployment
    address constant UNISWAP_V2_ROUTER = address(0);  // TODO: Update after deployment

    // RISE testnet WETH address
    address constant WETH = 0x4200000000000000000000000000000000000006;

    // Token addresses - update these after deployment
    address constant USDC = address(0); // TODO: Update after deployment
    address constant DAI = address(0);  // TODO: Update after deployment
    address constant PEPE = address(0); // TODO: Update after deployment

    function setUp() public {}

    function run() public {
        require(UNISWAP_V2_FACTORY != address(0), "Factory not set");
        require(UNISWAP_V2_ROUTER != address(0), "Router not set");
        require(USDC != address(0), "USDC not set");
        require(DAI != address(0), "DAI not set");
        require(PEPE != address(0), "PEPE not set");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Adding liquidity with deployer:", deployer);
        console.log("UniswapV2Factory:", UNISWAP_V2_FACTORY);
        console.log("UniswapV2Router:", UNISWAP_V2_ROUTER);

        vm.startBroadcast(deployerPrivateKey);

        // Wrap ETH first
        console.log("Wrapping ETH...");
        IWETH(WETH).deposit{value: 10 ether}();

        // Approve router for all tokens
        approveAllTokens();

        // Add liquidity to all pairs
        addWethUsdcLiquidity();
        addWethDaiLiquidity();
        addUsdcDaiLiquidity();
        addWethPepeLiquidity();

        vm.stopBroadcast();

        console.log("\n========================================");
        console.log("Liquidity Added Successfully!");
        console.log("========================================");
        console.log("All trading pairs are now active:");
        console.log("  - WETH/USDC");
        console.log("  - WETH/DAI");
        console.log("  - USDC/DAI");
        console.log("  - WETH/PEPE");
    }

    function approveAllTokens() internal {
        console.log("Approving tokens for router...");
        IUniswapV2Router router = IUniswapV2Router(UNISWAP_V2_ROUTER);

        IERC20(WETH).approve(address(router), type(uint256).max);
        IERC20(USDC).approve(address(router), type(uint256).max);
        IERC20(DAI).approve(address(router), type(uint256).max);
        IERC20(PEPE).approve(address(router), type(uint256).max);

        console.log("All tokens approved!");
    }

    function addWethUsdcLiquidity() internal {
        console.log("\nAdding WETH/USDC liquidity...");
        IUniswapV2Factory factory = IUniswapV2Factory(UNISWAP_V2_FACTORY);
        IUniswapV2Router router = IUniswapV2Router(UNISWAP_V2_ROUTER);

        address pair = factory.getPair(WETH, USDC);
        if (pair == address(0)) {
            console.log("Creating WETH/USDC pair...");
            pair = factory.createPair(WETH, USDC);
            console.log("WETH/USDC pair created at:", pair);
        }

        uint256 wethAmount = 1 ether;
        uint256 usdcAmount = 3000 * 10**6; // 3000 USDC

        (uint amountA, uint amountB, uint liquidity) = router.addLiquidity(
            WETH,
            USDC,
            wethAmount,
            usdcAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 300
        );

        console.log("Added WETH/USDC liquidity:");
        console.log("  WETH added:", amountA);
        console.log("  USDC added:", amountB);
        console.log("  LP tokens received:", liquidity);
    }

    function addWethDaiLiquidity() internal {
        console.log("\nAdding WETH/DAI liquidity...");
        IUniswapV2Factory factory = IUniswapV2Factory(UNISWAP_V2_FACTORY);
        IUniswapV2Router router = IUniswapV2Router(UNISWAP_V2_ROUTER);

        address pair = factory.getPair(WETH, DAI);
        if (pair == address(0)) {
            console.log("Creating WETH/DAI pair...");
            pair = factory.createPair(WETH, DAI);
            console.log("WETH/DAI pair created at:", pair);
        }

        uint256 wethAmount = 1 ether;
        uint256 daiAmount = 3000 * 10**18; // 3000 DAI

        (uint amountA, uint amountB, uint liquidity) = router.addLiquidity(
            WETH,
            DAI,
            wethAmount,
            daiAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 300
        );

        console.log("Added WETH/DAI liquidity:");
        console.log("  WETH added:", amountA);
        console.log("  DAI added:", amountB);
        console.log("  LP tokens received:", liquidity);
    }

    function addUsdcDaiLiquidity() internal {
        console.log("\nAdding USDC/DAI liquidity...");
        IUniswapV2Factory factory = IUniswapV2Factory(UNISWAP_V2_FACTORY);
        IUniswapV2Router router = IUniswapV2Router(UNISWAP_V2_ROUTER);

        address pair = factory.getPair(USDC, DAI);
        if (pair == address(0)) {
            console.log("Creating USDC/DAI pair...");
            pair = factory.createPair(USDC, DAI);
            console.log("USDC/DAI pair created at:", pair);
        }

        uint256 usdcAmount = 1000 * 10**6; // 1000 USDC
        uint256 daiAmount = 1000 * 10**18; // 1000 DAI

        (uint amountA, uint amountB, uint liquidity) = router.addLiquidity(
            USDC,
            DAI,
            usdcAmount,
            daiAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 300
        );

        console.log("Added USDC/DAI liquidity:");
        console.log("  USDC added:", amountA);
        console.log("  DAI added:", amountB);
        console.log("  LP tokens received:", liquidity);
    }

    function addWethPepeLiquidity() internal {
        console.log("\nAdding WETH/PEPE liquidity...");
        IUniswapV2Factory factory = IUniswapV2Factory(UNISWAP_V2_FACTORY);
        IUniswapV2Router router = IUniswapV2Router(UNISWAP_V2_ROUTER);

        address pair = factory.getPair(WETH, PEPE);
        if (pair == address(0)) {
            console.log("Creating WETH/PEPE pair...");
            pair = factory.createPair(WETH, PEPE);
            console.log("WETH/PEPE pair created at:", pair);
        }

        uint256 wethAmount = 1 ether;
        uint256 pepeAmount = 10000000 * 10**18; // 10M PEPE

        (uint amountA, uint amountB, uint liquidity) = router.addLiquidity(
            WETH,
            PEPE,
            wethAmount,
            pepeAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 300
        );

        console.log("Added WETH/PEPE liquidity:");
        console.log("  WETH added:", amountA);
        console.log("  PEPE added:", amountB);
        console.log("  LP tokens received:", liquidity);
    }
}