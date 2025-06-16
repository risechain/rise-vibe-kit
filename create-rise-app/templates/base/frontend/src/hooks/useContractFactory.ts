import { useState, useCallback } from 'react';
import { JsonRpcProvider, BrowserProvider, Contract, Interface } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { RISE_RPC_URL } from '@/config/chain';
import { useEnsureNetwork } from './useEnsureNetwork';
import { RiseSyncClient } from '@/lib/rise-sync-client';
import { ContractName, getContract as getContractInfo } from '@/contracts/contracts';

// Cache sync client instances per wallet
const syncClientCache = new Map<string, RiseSyncClient>();

/**
 * Generic contract hook factory
 * Creates a type-safe hook for any contract in the project
 * 
 * @param contractName - The name of the contract from contracts.ts
 * @returns A hook function that provides contract interaction methods
 * 
 * @example
 * // Create a hook for your contract
 * export const useMyContract = createContractHook('MyContract');
 * 
 * // Use it in a component
 * const { read, write, isLoading } = useMyContract();
 */
export function createContractHook<T extends ContractName>(contractName: T) {
  return function useContract() {
    const [isLoading, setIsLoading] = useState(false);
    const { connector } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { ensureCorrectNetwork } = useEnsureNetwork();
    
    // Get contract info
    const contractInfo = getContractInfo(contractName);
    const contractAddress = contractInfo.address;
    const contractABI = contractInfo.abi;

    const getProvider = useCallback(() => {
      console.log('🔧 Creating provider with RPC URL:', RISE_RPC_URL);
      return new JsonRpcProvider(RISE_RPC_URL);
    }, []);

    const getSigner = useCallback(async () => {
      if (!walletClient) throw new Error('No wallet connected');
      
      // Ensure we're on the correct network first
      await ensureCorrectNetwork();
      
      // Check if it's an embedded wallet by checking the connector ID
      const isEmbeddedWallet = connector?.id === 'embedded-wallet';
      
      if (isEmbeddedWallet) {
        // For embedded wallet, use ethers Wallet directly with RISE RPC
        const { Wallet } = await import('ethers');
        const privateKey = localStorage.getItem('rise-embedded-wallet');
        if (!privateKey) throw new Error('Embedded wallet private key not found');
        const provider = getProvider();
        return new Wallet(privateKey, provider);
      } else {
        // For external wallets, use the injected provider
        if (typeof window !== 'undefined' && (window as { ethereum?: unknown }).ethereum) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const web3Provider = new BrowserProvider((window as { ethereum: unknown }).ethereum as any);
          return web3Provider.getSigner();
        }
      }
      
      throw new Error('No wallet provider found');
    }, [walletClient, connector, getProvider, ensureCorrectNetwork]);

    const getContract = useCallback(async () => {
      const signer = await getSigner();
      return new Contract(contractAddress, contractABI, signer);
    }, [getSigner, contractAddress, contractABI]);

    const getReadOnlyContract = useCallback(() => {
      const provider = getProvider();
      return new Contract(contractAddress, contractABI, provider);
    }, [getProvider, contractAddress, contractABI]);

    // Generic read function
    const read = useCallback(async (functionName: string, args: unknown[] = []) => {
      const contract = getReadOnlyContract();
      return await contract[functionName](...args);
    }, [getReadOnlyContract]);

    // Generic write function with sync transaction support
    const write = useCallback(async (functionName: string, args: unknown[] = []) => {
      setIsLoading(true);
      
      try {
        const isEmbeddedWallet = connector?.id === 'embedded-wallet';
        
        if (isEmbeddedWallet) {
          console.log('🚀 Using sync transaction for', functionName);
          const privateKey = localStorage.getItem('rise-embedded-wallet');
          if (!privateKey) throw new Error('Embedded wallet private key not found');
          
          // Use cached sync client or create new one
          let syncClient = syncClientCache.get(privateKey);
          if (!syncClient) {
            syncClient = new RiseSyncClient(privateKey);
            syncClientCache.set(privateKey, syncClient);
          }
          
          const iface = new Interface(contractABI);
          const data = iface.encodeFunctionData(functionName, args);
          
          const result = await syncClient.sendTransaction({
            to: contractAddress,
            data,
          });
          
          console.log(`✅ ${functionName} confirmed instantly with sync tx`);
          
          // Return consistent format that includes success indicator
          return {
            ...result,
            success: true,
            isSync: true
          };
        } else {
          // Use regular transaction flow for external wallets
          const contract = await getContract();
          const tx = await contract[functionName](...args);
          
          console.log(`${functionName} tx:`, tx.hash);
          const receipt = await tx.wait();
          console.log(`${functionName} confirmed:`, receipt);
          
          return {
            ...receipt,
            success: true,
            isSync: false
          };
        }
      } catch (error) {
        console.error(`${functionName} error:`, error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    }, [getContract, connector, contractABI, contractAddress]);

    return {
      isLoading,
      read,
      write,
      contractAddress,
      contractName,
      // Expose lower level functions if needed
      getContract,
      getReadOnlyContract,
    };
  };
}