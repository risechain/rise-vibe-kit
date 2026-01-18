import { Chains, RiseWallet } from 'rise-wallet'
import { riseWallet } from 'rise-wallet/wagmi'
import { createConfig, http, type CreateConnectorFn } from 'wagmi'
import type { Chain } from 'viem'

// Export the connector for advanced usage
export const rwConnector = riseWallet(RiseWallet.defaultConfig)

// Create wagmi config
export const config = createConfig({
  chains: [Chains.riseTestnet as Chain],
  connectors: [rwConnector as CreateConnectorFn],
  transports: {
    [Chains.riseTestnet.id]: http('https://testnet.riselabs.xyz'),
  },
})