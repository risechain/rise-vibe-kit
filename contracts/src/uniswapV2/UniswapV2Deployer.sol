// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);

    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);

    function getAmountsIn(uint amountOut, address[] calldata path)
        external view returns (uint[] memory amounts);
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IWETH {
    function deposit() external payable;
}

/**
 * @title UniswapV2Deployer
 * @dev Helper contract to deploy and initialize UniswapV2 with liquidity
 */
contract UniswapV2Deployer {
    IUniswapV2Factory public immutable factory;
    IUniswapV2Router02 public immutable router;
    address public immutable weth;

    struct TokenPair {
        address tokenA;
        address tokenB;
        address pair;
    }

    TokenPair[] public pairs;

    event PairCreated(address indexed tokenA, address indexed tokenB, address pair);
    event LiquidityAdded(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    constructor(
        address _factory,
        address _router,
        address _weth
    ) {
        factory = IUniswapV2Factory(_factory);
        router = IUniswapV2Router02(_router);
        weth = _weth;
    }

    /**
     * @dev Create a trading pair
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        pair = factory.createPair(tokenA, tokenB);
        pairs.push(TokenPair({
            tokenA: tokenA,
            tokenB: tokenB,
            pair: pair
        }));
        emit PairCreated(tokenA, tokenB, pair);
    }

    /**
     * @dev Add liquidity to a pair
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external {
        IERC20(tokenA).approve(address(router), amountA);
        IERC20(tokenB).approve(address(router), amountB);

        (uint256 usedA, uint256 usedB, uint256 liquidity) = router.addLiquidity(
            tokenA,
            tokenB,
            amountA,
            amountB,
            0, // Accept any amount
            0, // Accept any amount
            msg.sender,
            block.timestamp + 300 // 5 minutes
        );

        emit LiquidityAdded(tokenA, tokenB, usedA, usedB, liquidity);
    }

    /**
     * @dev Add liquidity with ETH
     */
    function addLiquidityETH(
        address token,
        uint256 amountToken
    ) external payable {
        // Wrap ETH first
        IWETH(weth).deposit{value: msg.value}();

        // Approve tokens
        IERC20(token).approve(address(router), amountToken);
        IERC20(weth).approve(address(router), msg.value);

        // Add liquidity between token and WETH
        (uint256 usedToken, uint256 usedWETH, uint256 liquidity) = router.addLiquidity(
            token,
            weth,
            amountToken,
            msg.value,
            0,
            0,
            msg.sender,
            block.timestamp + 300
        );

        emit LiquidityAdded(token, weth, usedToken, usedWETH, liquidity);
    }

    /**
     * @dev Initialize multiple pairs with liquidity
     * Call this after deploying mock tokens
     */
    function initializePairs(
        address usdc,
        address dai,
        address pepe
    ) external payable {
        require(msg.value >= 1 ether, "Need at least 1 ETH for liquidity");

        // Wrap ETH for liquidity
        IWETH(weth).deposit{value: msg.value}();

        // Create pairs
        address wethUsdcPair = factory.createPair(weth, usdc);
        address wethDaiPair = factory.createPair(weth, dai);
        address wethPepePair = factory.createPair(weth, pepe);
        address usdcDaiPair = factory.createPair(usdc, dai);

        // Store pairs
        pairs.push(TokenPair(weth, usdc, wethUsdcPair));
        pairs.push(TokenPair(weth, dai, wethDaiPair));
        pairs.push(TokenPair(weth, pepe, wethPepePair));
        pairs.push(TokenPair(usdc, dai, usdcDaiPair));

        // Approve router to spend tokens
        uint256 wethAmount = msg.value / 3; // Split ETH across pairs
        IERC20(weth).approve(address(router), msg.value);
        IERC20(usdc).approve(address(router), type(uint256).max);
        IERC20(dai).approve(address(router), type(uint256).max);
        IERC20(pepe).approve(address(router), type(uint256).max);

        // Add liquidity to WETH pairs
        // WETH/USDC (1 ETH = 3000 USDC)
        router.addLiquidity(
            weth, usdc,
            wethAmount, 3000 * 10**6,
            0, 0,
            msg.sender,
            block.timestamp + 300
        );

        // WETH/DAI (1 ETH = 3000 DAI)
        router.addLiquidity(
            weth, dai,
            wethAmount, 3000 * 10**18,
            0, 0,
            msg.sender,
            block.timestamp + 300
        );

        // WETH/PEPE (1 ETH = 1,000,000 PEPE)
        router.addLiquidity(
            weth, pepe,
            wethAmount, 1000000 * 10**18,
            0, 0,
            msg.sender,
            block.timestamp + 300
        );

        // USDC/DAI (1:1 stable pair, 10000 each)
        router.addLiquidity(
            usdc, dai,
            10000 * 10**6, 10000 * 10**18,
            0, 0,
            msg.sender,
            block.timestamp + 300
        );
    }

    function getPairCount() external view returns (uint256) {
        return pairs.length;
    }

    function getAllPairs() external view returns (TokenPair[] memory) {
        return pairs;
    }
}