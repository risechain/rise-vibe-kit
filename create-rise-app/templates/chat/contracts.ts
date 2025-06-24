// Pre-deployed contract for RISE testnet
// This allows developers to test the frontend without deploying contracts

// Import ABIs
import ChatAppABI from './abi/ChatApp.json';

export const contracts = {
  ChatApp: {
    address: '0x309bbe8e4745b0c832ac25183f633973aa8e2fd5' as const,
    deploymentTxHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    blockNumber: 0x0,
    abi: ChatAppABI
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
export const CHATAPP_ADDRESS = '0x309bbe8e4745b0c832ac25183f633973aa8e2fd5' as const;
export const CHATAPP_ABI = ChatAppABI;