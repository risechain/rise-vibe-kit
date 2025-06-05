import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { embeddedWalletConnector } from './wagmi-embedded-connector';
import { RISE_TESTNET, RISE_RPC_URL } from '@/config/chain';

// Re-export for backward compatibility
export const riseTestnet = RISE_TESTNET;

// Create wagmi config
export const wagmiConfig = createConfig({
  chains: [RISE_TESTNET],
  connectors: [
    injected(),
    embeddedWalletConnector({
      name: 'Browser Wallet',
      shimDisconnect: true,
    }),
  ],
  transports: {
    [RISE_TESTNET.id]: http(RISE_RPC_URL),
  },
  ssr: true, // Enable SSR support
});