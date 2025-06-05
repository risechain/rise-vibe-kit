import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { embeddedWalletConnector } from './wagmi-embedded-connector';

// Define RISE Testnet
export const riseTestnet = {
  id: 11155931,
  name: 'RISE Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://testnet.riselabs.xyz'] },
    public: { http: ['https://testnet.riselabs.xyz'] },
  },
  blockExplorers: {
    default: { 
      name: 'RISE Explorer',
      url: 'https://explorer.testnet.riselabs.xyz' 
    },
  },
  testnet: true,
} as const;

// Create wagmi config
export const wagmiConfig = createConfig({
  chains: [riseTestnet],
  connectors: [
    injected(),
    embeddedWalletConnector({
      name: 'Browser Wallet',
      shimDisconnect: true,
    }),
  ],
  transports: {
    [riseTestnet.id]: http('https://testnet.riselabs.xyz'),
  },
  ssr: true, // Enable SSR support
});