// Pre-deployed contract for RISE testnet
// This allows developers to test the frontend without deploying contracts

// Import ABIs
import FrenPetABI from './abi/FrenPet.json';

export const contracts = {
  FrenPet: {
    address: '0x2d222d701b29e9d8652bb9afee0a1dabdad0bc23' as const,
    deploymentTxHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    blockNumber: 0x0,
    abi: FrenPetABI
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
export const FRENPET_ADDRESS = '0x2d222d701b29e9d8652bb9afee0a1dabdad0bc23' as const;
export const FRENPET_ABI = FrenPetABI;