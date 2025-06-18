import { useState, useCallback } from 'react';
import { createPublicClient, createWalletClient, http, encodeFunctionData, type PublicClient, type WalletClient, type Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { useAccount, useWalletClient } from 'wagmi';
import { RISE_RPC_URL, RISE_TESTNET } from '@/config/chain';
import { useEnsureNetwork } from './useEnsureNetwork';
import { RiseSyncClient } from '@/lib/rise-sync-client';
import { ContractName, getContract as getContractInfo } from '@/contracts/contracts';
import { toast } from 'react-toastify';

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

    const getPublicClient = useCallback((): PublicClient => {
      console.log('🔧 Creating public client with RPC URL:', RISE_RPC_URL);
      return createPublicClient({
        chain: RISE_TESTNET,
        transport: http(RISE_RPC_URL),
      });
    }, []);

    const getWalletClient = useCallback(async (): Promise<WalletClient> => {
      if (!walletClient) throw new Error('No wallet connected');
      
      // Ensure we're on the correct network first
      await ensureCorrectNetwork();
      
      // Check if it's an embedded wallet by checking the connector ID
      const isEmbeddedWallet = connector?.id === 'embedded-wallet';
      
      if (isEmbeddedWallet) {
        // For embedded wallet, create a wallet client with the private key
        const privateKey = localStorage.getItem('rise-embedded-wallet');
        if (!privateKey) throw new Error('Embedded wallet private key not found');
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        return createWalletClient({
          account,
          chain: RISE_TESTNET,
          transport: http(RISE_RPC_URL),
        });
      } else {
        // For external wallets, use the wagmi wallet client
        return walletClient;
      }
    }, [walletClient, connector, ensureCorrectNetwork]);

    // Helper to get contract params for viem
    const getContractParams = useCallback(() => {
      return {
        address: contractAddress as `0x${string}`,
        abi: contractABI as Abi,
      };
    }, [contractAddress, contractABI]);

    // Generic read function
    const read = useCallback(async (functionName: string, args: unknown[] = []) => {
      const publicClient = getPublicClient();
      const { address, abi } = getContractParams();
      
      const result = await publicClient.readContract({
        address,
        abi,
        functionName,
        args,
      });
      
      return result;
    }, [getPublicClient, getContractParams]);

    // Generic write function with sync transaction support
    const write = useCallback(async (functionName: string, args: unknown[] = []) => {
      setIsLoading(true);
      const toastId = toast.loading(`Executing ${functionName}...`);
      
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
          
          const { abi } = getContractParams();
          const data = encodeFunctionData({
            abi,
            functionName,
            args,
          });
          
          const result = await syncClient.sendTransaction({
            to: contractAddress,
            data,
          });
          
          console.log(`✅ ${functionName} confirmed instantly with sync tx`);
          
          toast.update(toastId, {
            render: `${functionName} confirmed!`,
            type: 'success',
            isLoading: false,
            autoClose: 5000,
          });
          
          // Return consistent format that includes success indicator
          return {
            ...result,
            success: true,
            isSync: true
          };
        } else {
          // Use regular transaction flow for external wallets
          const walletClient = await getWalletClient();
          const publicClient = getPublicClient();
          const { address, abi } = getContractParams();
          
          // Simulate the transaction first
          const { request } = await publicClient.simulateContract({
            address,
            abi,
            functionName,
            args,
            account: walletClient.account!,
          });
          
          // Execute the transaction
          const hash = await walletClient.writeContract(request);
          console.log(`${functionName} tx:`, hash);
          
          // Update toast to show pending state
          toast.update(toastId, {
            render: `Waiting for ${functionName} confirmation...`,
            isLoading: true,
          });
          
          // Wait for confirmation
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          console.log(`${functionName} confirmed:`, receipt);
          
          toast.update(toastId, {
            render: `${functionName} confirmed!`,
            type: 'success',
            isLoading: false,
            autoClose: 5000,
          });
          
          return {
            ...receipt,
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber.toString(),
            gasUsed: receipt.gasUsed.toString(),
            status: receipt.status === 'success' ? 1 : 0,
            success: true,
            isSync: false
          };
        }
      } catch (error) {
        console.error(`${functionName} error:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
        toast.update(toastId, {
          render: `${functionName} failed: ${errorMessage}`,
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    }, [getWalletClient, getPublicClient, connector, contractAddress, getContractParams]);

    return {
      isLoading,
      read,
      write,
      contractAddress,
      contractName,
      // Expose lower level functions if needed
      getPublicClient,
      getWalletClient,
      getContractParams,
    };
  };
}