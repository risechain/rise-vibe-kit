import { createConfig, http, type CreateConnectorFn, createStorage, cookieStorage } from 'wagmi';
import { riseWallet } from 'rise-wallet/wagmi';
import { RiseWallet, Chains } from 'rise-wallet';
import type { Chain } from 'viem';

// Re-export RISE testnet chain
export const riseTestnet = Chains.riseTestnet;

// Create rise-wallet connector
const rwConnector = riseWallet(RiseWallet.defaultConfig);

// Create wagmi config with Rise Wallet
export const wagmiConfig = createConfig({
  chains: [Chains.riseTestnet as Chain],
  connectors: [rwConnector as CreateConnectorFn],
  transports: {
    [Chains.riseTestnet.id]: http('https://testnet.riselabs.xyz'),
  },
  ssr: true, // Enable SSR support
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : cookieStorage,
  }),
});