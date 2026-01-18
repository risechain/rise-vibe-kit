import { riseTestnet } from "viem/chains";

// Centralized chain configuration for RISE network
export const RISE_TESTNET = riseTestnet

// Export individual values for convenience
export const RISE_CHAIN_ID = RISE_TESTNET.id;
export const RISE_RPC_URL = RISE_TESTNET.rpcUrls.default.http[0];
export const RISE_WS_URL = RISE_TESTNET.rpcUrls.default.webSocket[0];
export const RISE_EXPLORER_URL = RISE_TESTNET.blockExplorers.default.url;