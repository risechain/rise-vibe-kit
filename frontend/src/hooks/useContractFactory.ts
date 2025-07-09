import { useState, useCallback } from 'react';
import { createPublicClient, createWalletClient, http, encodeFunctionData, parseEther, type PublicClient, type WalletClient, type Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { useAccount, useWalletClient } from 'wagmi';
import { RISE_RPC_URL, RISE_TESTNET } from '@/config/chain';
import { useEnsureNetwork } from './useEnsureNetwork';
import { RiseSyncClient } from '@/lib/rise-sync-client';
import { ContractName, getContract as getContractInfo } from '@/contracts/contracts';
import { toast } from '@/lib/toast-manager';
import { handleContractError } from '@/lib/web3-utils';

// Cache sync client instances per wallet
const syncClientCache = new Map<string, RiseSyncClient>();

/**
 * Generic contract hook factory with optional payable support
 * Creates a type-safe hook for any contract in the project
 * 
 * @param contractName - The name of the contract from contracts.ts
 * @param options - Configuration options
 * @param options.isPayable - Whether the contract has payable functions (default: false)
 * @returns A hook function that provides contract interaction methods
 * 
 * @example
 * // Create a hook for a regular contract
 * export const useMyContract = createContractHook('MyContract');
 * 
 * // Create a hook for a contract with payable functions
 * export const useMyPayableContract = createContractHook('MyPayableContract', { isPayable: true });
 * 
 * // Use it in a component
 * const { read, write, isLoading } = useMyContract();
 * 
 * // For payable contracts, pass value in options
 * await write('myPayableFunction', [arg1, arg2], { value: '0.1' }); // 0.1 ETH
 */
export function createContractHook<T extends ContractName>(
  contractName: T,
  options?: { isPayable?: boolean }
) {
  const isPayable = options?.isPayable ?? false;

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

    // Generic write function with optional payable support
    const write = useCallback(async (
      functionName: string, 
      args: unknown[] = [], 
      options?: { value?: string | bigint; gasLimit?: string | bigint }
    ) => {
      setIsLoading(true);
      const toastId = toast.loading(`Executing ${functionName}...`);
      
      try {
        const isEmbeddedWallet = connector?.id === 'embedded-wallet';
        
        if (isEmbeddedWallet) {
          console.log('🔄 Using sync transaction for', functionName);
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
          
          const transactionOptions: {
            to: string;
            data: string;
            value?: string;
            gasLimit?: string;
          } = {
            to: contractAddress,
            data,
          };

          // Add payable options if provided and contract is payable
          if (isPayable && options) {
            if (options.value !== undefined) {
              transactionOptions.value = options.value.toString();
            }
            if (options.gasLimit !== undefined) {
              transactionOptions.gasLimit = options.gasLimit.toString();
            }
          }
          
          const result = await syncClient.sendTransaction(transactionOptions);
          
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
          
          // Build transaction request
          const baseRequest = {
            address,
            abi,
            functionName,
            args,
            account: walletClient.account!,
          };
          
          // Add payable options if provided and contract is payable
          const request = {
            ...baseRequest,
            ...(isPayable && options?.value && {
              value: typeof options.value === 'string' 
                ? parseEther(options.value) 
                : options.value
            }),
            ...(isPayable && options?.gasLimit && {
              gas: BigInt(options.gasLimit)
            })
          };
          
          // Simulate the transaction first
          const { request: simulatedRequest } = await publicClient.simulateContract(request);
          
          // Execute the transaction
          const hash = await walletClient.writeContract(simulatedRequest);
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
        
        // Use our handleContractError utility for better error messages
        const errorInfo = handleContractError(error);
        
        toast.update(toastId, {
          render: errorInfo.title,
          type: 'error',
          isLoading: false,
          autoClose: 7000,
        });
        
        // Show detailed error in a second toast if available
        if (errorInfo.description && errorInfo.description !== errorInfo.title) {
          toast.error(errorInfo.description, {
            autoClose: 10000,
          });
        }
        
        throw new Error(errorInfo.description || errorInfo.title);
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

// Export the previous function names for backward compatibility
export const createContractHookPayable = <T extends ContractName>(contractName: T) => 
  createContractHook(contractName, { isPayable: true });