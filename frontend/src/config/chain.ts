// Centralized chain configuration for RISE network
export const RISE_TESTNET = {
  id: 11155931,
  name: 'RISE Testnet',
  network: 'rise-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { 
      http: [process.env.NEXT_PUBLIC_RISE_RPC_URL || 'https://testnet.riselabs.xyz'],
      webSocket: [process.env.NEXT_PUBLIC_RISE_WS_URL || 'wss://testnet.riselabs.xyz/ws']
    },
    public: { 
      http: [process.env.NEXT_PUBLIC_RISE_RPC_URL || 'https://testnet.riselabs.xyz'],
      webSocket: [process.env.NEXT_PUBLIC_RISE_WS_URL || 'wss://testnet.riselabs.xyz/ws']
    },
  },
  blockExplorers: {
    default: { 
      name: 'RISE Explorer', 
      url: 'https://explorer.testnet.riselabs.xyz' 
    },
  },
  contracts: {
    vrfCoordinator: {
      address: '0x9d57aB4517ba97349551C876a01a7580B1338909' as const,
    },
  },
  testnet: true,
} as const;

// Export individual values for convenience
export const RISE_CHAIN_ID = RISE_TESTNET.id;
export const RISE_RPC_URL = RISE_TESTNET.rpcUrls.default.http[0];
export const RISE_WS_URL = RISE_TESTNET.rpcUrls.default.webSocket[0];
export const RISE_EXPLORER_URL = RISE_TESTNET.blockExplorers.default.url;