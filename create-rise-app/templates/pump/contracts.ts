// Pre-deployed contract for RISE testnet
// This allows developers to test the frontend without deploying contracts

// Import ABIs
import TokenLaunchpadABI from './abi/TokenLaunchpad.json';

export const contracts = {
  TokenLaunchpad: {
    address: '0x04f339ec4d75cf2833069e6e61b60ef56461cd7c' as const,
    deploymentTxHash: '0x6dda1f873079b1f69820f8ceb5a1c060bc2b9c5afc3134be7dcc0cfebc983c6d',
    blockNumber: 0xef69ab,
    abi: TokenLaunchpadABI
  }
} as const;

// Type exports
export type ContractName = keyof typeof contracts;
export type Contracts = typeof contracts;

// Helper functions
export function getContract<T extends ContractName>(name: T): Contracts[T] {
  return contracts[name];
}

export function getContractAddress(name: ContractName): string {
  return contracts[name].address;
}

export function getContractABI(name: ContractName) {
  return contracts[name].abi;
}

// Re-export specific contracts for convenience
export const TOKENLAUNCHPAD_ADDRESS = '0x04f339ec4d75cf2833069e6e61b60ef56461cd7c' as const;
export const TOKENLAUNCHPAD_ABI = TokenLaunchpadABI;