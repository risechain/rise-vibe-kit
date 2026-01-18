import { useCallback } from 'react';
import { encodeFunctionData, getContract as viemGetContract } from 'viem';
import { usePublicClient } from 'wagmi';
import { CHATAPP_ADDRESS, CHATAPP_ABI } from '@/contracts/contracts';
import { useRiseWalletTransaction } from '@/hooks/useRiseWalletTransaction';
import { useRiseWalletSessionKey } from '@/hooks/useRiseWalletSessionKey';

/**
 * Custom hook for ChatApp contract interactions
 * Uses Rise Wallet for all transaction signing
 * Automatically uses session keys when available
 */
export function useChatAppContract() {
  const { execute, isLoading } = useRiseWalletTransaction();
  const publicClient = usePublicClient();
  const { keyPair, hasUsableSessionKey } = useRiseWalletSessionKey();

  // Read functions with proper typing
  const checkRegistration = useCallback(async (address: string): Promise<boolean> => {
    if (!publicClient) throw new Error('Public client not available');

    const contract = viemGetContract({
      address: CHATAPP_ADDRESS,
      abi: CHATAPP_ABI,
      client: publicClient,
    });

    return await contract.read.isUserRegistered([address as `0x${string}`]) as boolean;
  }, [publicClient]);

  const getUserId = useCallback(async (address: string): Promise<string> => {
    if (!publicClient) throw new Error('Public client not available');

    const contract = viemGetContract({
      address: CHATAPP_ADDRESS,
      abi: CHATAPP_ABI,
      client: publicClient,
    });

    return await contract.read.userId([address as `0x${string}`]) as string;
  }, [publicClient]);

  const getKarma = useCallback(async (address: string): Promise<string> => {
    if (!publicClient) throw new Error('Public client not available');

    const contract = viemGetContract({
      address: CHATAPP_ADDRESS,
      abi: CHATAPP_ABI,
      client: publicClient,
    });

    const karma = await contract.read.karma([address as `0x${string}`]) as bigint;
    return karma.toString();
  }, [publicClient]);

  // Write functions with proper typing
  const registerUser = useCallback(async (userId: string) => {
    const data = encodeFunctionData({
      abi: CHATAPP_ABI,
      functionName: 'registerUser',
      args: [userId],
    });

    const result = await execute({
      calls: [{
        to: CHATAPP_ADDRESS,
        data,
      }],
      sessionKey: hasUsableSessionKey && keyPair ? keyPair : undefined,
    });

    if (!result?.success) {
      throw new Error(result?.error?.message || 'Transaction failed');
    }

    return result;
  }, [execute, hasUsableSessionKey, keyPair]);

  const sendMessage = useCallback(async (message: string) => {
    console.log('[ChatApp] Sending message:', message);
    const data = encodeFunctionData({
      abi: CHATAPP_ABI,
      functionName: 'sendMessage',
      args: [message],
    });

    const result = await execute({
      calls: [{
        to: CHATAPP_ADDRESS,
        data,
      }],
      sessionKey: hasUsableSessionKey && keyPair ? keyPair : undefined,
    });

    console.log('[ChatApp] Send message result:', result);

    if (!result?.success) {
      throw new Error(result?.error?.message || 'Transaction failed');
    }

    return result;
  }, [execute, hasUsableSessionKey, keyPair]);

  const giveKarma = useCallback(async (msgId: string) => {
    const data = encodeFunctionData({
      abi: CHATAPP_ABI,
      functionName: 'giveKarma',
      args: [BigInt(msgId)],
    });

    const result = await execute({
      calls: [{
        to: CHATAPP_ADDRESS,
        data,
      }],
      sessionKey: hasUsableSessionKey && keyPair ? keyPair : undefined,
    });

    if (!result?.success) {
      throw new Error(result?.error?.message || 'Transaction failed');
    }

    return result;
  }, [execute, hasUsableSessionKey, keyPair]);

  const takeKarma = useCallback(async (msgId: string) => {
    const data = encodeFunctionData({
      abi: CHATAPP_ABI,
      functionName: 'takeKarma',
      args: [BigInt(msgId)],
    });

    const result = await execute({
      calls: [{
        to: CHATAPP_ADDRESS,
        data,
      }],
      sessionKey: hasUsableSessionKey && keyPair ? keyPair : undefined,
    });

    if (!result?.success) {
      throw new Error(result?.error?.message || 'Transaction failed');
    }

    return result;
  }, [execute, hasUsableSessionKey, keyPair]);

  return {
    // State
    isLoading,

    // Read functions
    checkRegistration,
    getUserId,
    getKarma,

    // Write functions
    registerUser,
    sendMessage: sendMessage, // Keep the same name for backward compatibility
    sendContractMessage: sendMessage, // Alias for backward compatibility
    giveKarma,
    takeKarma,
  };
}