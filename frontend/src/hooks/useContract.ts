import { useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { getContract as viemGetContract } from 'viem';
import { toast } from 'react-toastify';
import { ContractName, getContract } from '@/contracts/contracts';
import { useEnsureNetwork } from './useEnsureNetwork';
import { RiseSyncClient } from '@/lib/rise-sync-client';

// Cache for sync clients
const syncClientCache = new Map<string, RiseSyncClient>();

export function useContract<T extends ContractName>(contractName: T) {
  const { address, isConnected, connector } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { ensureCorrectNetwork } = useEnsureNetwork();

  const contractInfo = getContract(contractName);
  const isEmbeddedWallet = connector?.id === 'embedded-wallet';

  // Read function - works for any contract
  const read = useCallback(async (functionName: string, args: unknown[] = []) => {
    if (!publicClient) throw new Error('Public client not available');

    try {
      const contract = viemGetContract({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        client: publicClient,
      });

      const result = await contract.read[functionName](args);
      return result;
    } catch (error) {
      console.error(`Error reading ${functionName}:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to read ${functionName}`;
      throw new Error(errorMessage);
    }
  }, [publicClient, contractInfo]);

  // Write function - works for any contract
  const write = useCallback(async (functionName: string, args: unknown[] = [], value?: bigint) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    await ensureCorrectNetwork();

    try {
      // Handle embedded wallet sync transactions
      if (isEmbeddedWallet) {
        console.log(`🚀 Using sync transaction for embedded wallet on ${contractName}`);
        const privateKey = localStorage.getItem('rise-embedded-wallet');
        if (!privateKey) throw new Error('Embedded wallet private key not found');
        
        // Get or create sync client
        let syncClient = syncClientCache.get(privateKey);
        if (!syncClient) {
          syncClient = new RiseSyncClient(privateKey);
          syncClientCache.set(privateKey, syncClient);
        }
        
        // Encode function data using viem's encodeFunctionData
        const { encodeFunctionData } = await import('viem');
        const data = encodeFunctionData({
          abi: contractInfo.abi,
          functionName,
          args,
        });
        
        // Send sync transaction
        const result = await syncClient.sendTransaction({
          to: contractInfo.address,
          data,
          value: value ? `0x${value.toString(16)}` : undefined,
        });
        
        console.log('Sync transaction result:', result);
        return result;
      }

      // Handle external wallet transactions
      if (!walletClient) throw new Error('Wallet client not available');

      const contract = viemGetContract({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        client: walletClient,
      });

      const hash = await contract.write[functionName](args, { value });
      
      console.log(`Transaction sent: ${hash}`);
      toast.info(`Transaction sent: ${hash.slice(0, 10)}...`);

      // Wait for confirmation
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        console.log('Transaction confirmed:', receipt);
        return { hash, receipt };
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error(`Error writing ${functionName}:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to execute ${functionName}`;
      throw new Error(errorMessage);
    }
  }, [isConnected, address, walletClient, publicClient, contractInfo, isEmbeddedWallet, contractName, ensureCorrectNetwork]);

  // Estimate gas
  const estimateGas = useCallback(async (functionName: string, args: unknown[] = [], value?: bigint) => {
    if (!publicClient || !address) throw new Error('Client not available');

    try {
      const contract = viemGetContract({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        client: publicClient,
      });

      const gas = await contract.estimateGas[functionName](args, {
        account: address,
        value,
      });

      return gas;
    } catch (error) {
      console.error(`Error estimating gas for ${functionName}:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to estimate gas for ${functionName}`;
      throw new Error(errorMessage);
    }
  }, [publicClient, address, contractInfo]);

  return {
    address: contractInfo.address,
    abi: contractInfo.abi,
    read,
    write,
    estimateGas,
    isConnected,
    isEmbeddedWallet,
  };
}