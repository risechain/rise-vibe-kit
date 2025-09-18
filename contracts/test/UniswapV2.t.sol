// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test, console2} from "forge-std/Test.sol";
import {MockTokenFactory, MockToken} from "../src/MockTokens.sol";
import {MockWETH} from "./mocks/MockWETH.sol";
import {UniswapV2Factory} from "../src/uniswapV2/UniswapV2Factory.sol";
import {UniswapV2Router} from "../src/uniswapV2/UniswapV2Router.sol";
import {IUniswapV2Pair} from "../src/uniswapV2/interfaces/IUniswapV2Pair.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniswapV2Test is Test {
    MockTokenFactory tokenFactory;
    UniswapV2Factory factory;
    UniswapV2Router router;

    address payable weth;
    address usdc;
    address dai;
    address pepe;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        // Deploy mock WETH for local testing
        MockWETH wethContract = new MockWETH();
        weth = payable(address(wethContract));

        // Deploy token factory
        tokenFactory = new MockTokenFactory();
        (usdc, dai, pepe) = tokenFactory.getAllTokens();

        // Deploy UniswapV2
        factory = new UniswapV2Factory(address(this));
        router = new UniswapV2Router(address(factory), weth);

        // Transfer ownership of tokens to test contract
        // The MockTokenFactory deploys tokens with itself as owner
        vm.startPrank(address(tokenFactory));
        MockToken(usdc).transferOwnership(address(this));
        MockToken(dai).transferOwnership(address(this));
        MockToken(pepe).transferOwnership(address(this));
        vm.stopPrank();

        // Mint tokens for testing
        MockToken(usdc).mint(alice, 100000 * 10**6);   // 100k USDC
        MockToken(dai).mint(alice, 100000 * 10**18);   // 100k DAI
        MockToken(pepe).mint(alice, 1000000 * 10**18); // 1M PEPE

        // Give alice some ETH
        vm.deal(alice, 100 ether);

        // Mint tokens for liquidity
        MockToken(usdc).mint(address(this), 100000 * 10**6);
        MockToken(dai).mint(address(this), 100000 * 10**18);
        MockToken(pepe).mint(address(this), 1000000 * 10**18);
        vm.deal(address(this), 100 ether);
    }

    function testCreatePair() public {
        address pair = factory.createPair(weth, usdc);
        assertNotEq(pair, address(0));
        assertEq(factory.getPair(weth, usdc), pair);
        assertEq(factory.getPair(usdc, weth), pair); // Should work both ways
    }

    function testAddLiquidity() public {
        // Create pair
        factory.createPair(weth, usdc);

        // Approve router
        MockToken(usdc).approve(address(router), type(uint256).max);
        MockWETH(weth).deposit{value: 1 ether}();
        MockWETH(weth).approve(address(router), type(uint256).max);

        // Add liquidity
        (uint amountA, uint amountB, uint liquidity) = router.addLiquidity(
            weth,
            usdc,
            1 ether,
            3000 * 10**6, // 3000 USDC
            0,
            0,
            address(this),
            block.timestamp + 300
        );

        assertGt(liquidity, 0);
        assertEq(amountA, 1 ether);
        assertEq(amountB, 3000 * 10**6);
    }

    function testSwapExactTokensForTokens() public {
        // Setup liquidity
        _addInitialLiquidity();

        vm.startPrank(alice);

        // Approve router
        MockToken(usdc).approve(address(router), type(uint256).max);

        // Swap 100 USDC for DAI
        address[] memory path = new address[](2);
        path[0] = usdc;
        path[1] = dai;

        uint256 usdcBefore = IERC20(usdc).balanceOf(alice);
        uint256 daiBefore = IERC20(dai).balanceOf(alice);

        uint[] memory amounts = router.swapExactTokensForTokens(
            100 * 10**6, // 100 USDC
            0, // Accept any amount of DAI
            path,
            alice,
            block.timestamp + 300
        );

        uint256 usdcAfter = IERC20(usdc).balanceOf(alice);
        uint256 daiAfter = IERC20(dai).balanceOf(alice);

        assertEq(usdcBefore - usdcAfter, 100 * 10**6);
        assertGt(daiAfter - daiBefore, 0);
        assertEq(amounts[0], 100 * 10**6);
        assertGt(amounts[1], 0);

        vm.stopPrank();
    }

    function testSwapWithMultiHop() public {
        // Setup liquidity for multiple pairs
        _addInitialLiquidity();

        vm.startPrank(alice);

        // Approve router
        MockToken(usdc).approve(address(router), type(uint256).max);

        // Swap USDC -> WETH -> PEPE
        address[] memory path = new address[](3);
        path[0] = usdc;
        path[1] = weth;
        path[2] = pepe;

        uint256 pepeBefore = IERC20(pepe).balanceOf(alice);

        router.swapExactTokensForTokens(
            100 * 10**6, // 100 USDC
            0, // Accept any amount of PEPE
            path,
            alice,
            block.timestamp + 300
        );

        uint256 pepeAfter = IERC20(pepe).balanceOf(alice);
        assertGt(pepeAfter - pepeBefore, 0);

        vm.stopPrank();
    }

    function testRemoveLiquidity() public {
        // Add liquidity first
        _addInitialLiquidity();

        address pair = factory.getPair(weth, usdc);
        uint256 liquidity = IERC20(pair).balanceOf(address(this));

        // Approve router to spend LP tokens
        IERC20(pair).approve(address(router), liquidity);

        uint256 wethBefore = IERC20(weth).balanceOf(address(this));
        uint256 usdcBefore = IERC20(usdc).balanceOf(address(this));

        // Remove liquidity
        (uint amountA, uint amountB) = router.removeLiquidity(
            weth,
            usdc,
            liquidity / 2, // Remove half
            0,
            0,
            address(this),
            block.timestamp + 300
        );

        uint256 wethAfter = IERC20(weth).balanceOf(address(this));
        uint256 usdcAfter = IERC20(usdc).balanceOf(address(this));

        assertGt(amountA, 0);
        assertGt(amountB, 0);
        assertGt(wethAfter - wethBefore, 0);
        assertGt(usdcAfter - usdcBefore, 0);
    }

    function testFaucet() public {
        vm.startPrank(bob);

        uint256 balanceBefore = IERC20(usdc).balanceOf(bob);
        MockToken(usdc).faucet();
        uint256 balanceAfter = IERC20(usdc).balanceOf(bob);

        assertGt(balanceAfter - balanceBefore, 0);
        assertEq(balanceAfter - balanceBefore, 1000 * 10**6); // Faucet gives 1000 USDC

        // Test cooldown
        vm.expectRevert("Faucet: Cooldown period not met");
        MockToken(usdc).faucet();

        // Skip time
        vm.warp(block.timestamp + 1 hours + 1);
        uint256 balanceBefore2 = IERC20(usdc).balanceOf(bob);
        MockToken(usdc).faucet(); // Should work now
        uint256 balanceAfter2 = IERC20(usdc).balanceOf(bob);
        assertEq(balanceAfter2 - balanceBefore2, 1000 * 10**6);

        vm.stopPrank();
    }

    // Helper function to add initial liquidity
    function _addInitialLiquidity() internal {
        // Create pairs
        factory.createPair(weth, usdc);
        factory.createPair(weth, dai);
        factory.createPair(usdc, dai);
        factory.createPair(weth, pepe);

        // Approve router
        MockToken(usdc).approve(address(router), type(uint256).max);
        MockToken(dai).approve(address(router), type(uint256).max);
        MockToken(pepe).approve(address(router), type(uint256).max);

        // Wrap ETH
        MockWETH(weth).deposit{value: 10 ether}();
        MockWETH(weth).approve(address(router), type(uint256).max);

        // Add liquidity to all pairs
        router.addLiquidity(weth, usdc, 1 ether, 3000 * 10**6, 0, 0, address(this), block.timestamp + 300);
        router.addLiquidity(weth, dai, 1 ether, 3000 * 10**18, 0, 0, address(this), block.timestamp + 300);
        router.addLiquidity(usdc, dai, 1000 * 10**6, 1000 * 10**18, 0, 0, address(this), block.timestamp + 300);
        router.addLiquidity(weth, pepe, 1 ether, 100000 * 10**18, 0, 0, address(this), block.timestamp + 300);
    }
}