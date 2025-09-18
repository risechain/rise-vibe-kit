// UniswapV2 Contract Addresses and ABIs
// Auto-generated from deployment - DO NOT EDIT MANUALLY

// RISE Testnet Official Tokens
export const RISE_TESTNET_TOKENS = {
  weth: '0x4200000000000000000000000000000000000006',    // RISE testnet WETH
  usdc: '0x8a93d247134d91e0de6f96547cb0204e5be8e5d8',    // RISE testnet USDC
  usdt: '0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849',    // RISE testnet USDT
} as const;

export const UNISWAP_V2_ADDRESSES = {
  factory: '0xB506E780805a945e13691560ADf90421A1c6f03b', // Deployed on RISE testnet
  router: '0x9a5Ae52Cfb54a589FbF602191358a293C1681173',  // Deployed on RISE testnet
  ...RISE_TESTNET_TOKENS
} as const;

// Minimal ABIs for frontend interaction
export const UNISWAP_V2_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
  'function allPairs(uint) external view returns (address pair)',
  'function allPairsLength() external view returns (uint)',
  'function createPair(address tokenA, address tokenB) external returns (address pair)',
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
] as const;

export const UNISWAP_V2_ROUTER_ABI = [
  'function factory() external pure returns (address)',
  'function WETH() external pure returns (address)',
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
  'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
  'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts)',
  'function getAmountsIn(uint amountOut, address[] memory path) external view returns (uint[] memory amounts)',
] as const;

export const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function mint(address to) external returns (uint liquidity)',
  'function burn(address to) external returns (uint amount0, uint amount1)',
  'function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external',
  'event Mint(address indexed sender, uint amount0, uint amount1)',
  'event Burn(address indexed sender, uint amount0, uint amount1, address indexed to)',
  'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
] as const;

export const MOCK_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function faucet() external',
  'function mint(address to, uint256 amount) external',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

export const WETH_ABI = [
  ...MOCK_TOKEN_ABI,
  'function deposit() external payable',
  'function withdraw(uint256 amount) external',
  'event Deposit(address indexed from, uint256 amount)',
  'event Withdrawal(address indexed to, uint256 amount)',
] as const;

// Token metadata
export const TOKEN_INFO = {
  weth: { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: RISE_TESTNET_TOKENS.weth },
  usdc: { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: RISE_TESTNET_TOKENS.usdc },
  usdt: { symbol: 'USDT', name: 'Tether USD', decimals: 8, address: RISE_TESTNET_TOKENS.usdt },
} as const;

// Faucet URL for getting test tokens
export const RISE_FAUCET_URL = 'https://faucet.risechain.com/';

// Trading Pair Addresses (Created on RISE testnet)
export const TRADING_PAIRS = {
  'WETH/USDC': '0x1918e77a4350f64CE29Ee3B29337026c1571fEBF',
  'WETH/USDT': '0xE40388194734e817BFCAcBcecC98B9A5ABAcafcc',
  'USDC/USDT': '0x467E62403E5668F7aB8fcC26a6A46639cBCf0969',
} as const;

// Helper function to get token address by symbol
export function getTokenAddress(symbol: string): string | undefined {
  const symbolLower = symbol.toLowerCase();
  if (symbolLower in UNISWAP_V2_ADDRESSES) {
    return UNISWAP_V2_ADDRESSES[symbolLower as keyof typeof UNISWAP_V2_ADDRESSES];
  }
  return undefined;
}

// Helper function to get pair address
export function getPairAddress(tokenA: string, tokenB: string): string | undefined {
  const pair1 = `${tokenA}/${tokenB}`;
  const pair2 = `${tokenB}/${tokenA}`;

  if (pair1 in TRADING_PAIRS) {
    return TRADING_PAIRS[pair1 as keyof typeof TRADING_PAIRS];
  }
  if (pair2 in TRADING_PAIRS) {
    return TRADING_PAIRS[pair2 as keyof typeof TRADING_PAIRS];
  }
  return undefined;
}