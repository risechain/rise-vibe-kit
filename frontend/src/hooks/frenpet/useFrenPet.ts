import { useCallback } from 'react';
import { parseEther, encodeFunctionData, getContract as viemGetContract, toHex } from 'viem';
import { usePublicClient } from 'wagmi';
import { FRENPET_ADDRESS, FRENPET_ABI } from '@/contracts/contracts';
import { useRiseWalletTransaction } from '@/hooks/useRiseWalletTransaction';
import { useRiseWalletSessionKey } from '@/hooks/useRiseWalletSessionKey';

export function useFrenPet() {
  const { execute, isLoading } = useRiseWalletTransaction();
  const publicClient = usePublicClient();
  const { keyPair, hasUsableSessionKey } = useRiseWalletSessionKey();

  const createPet = useCallback(async (name: string) => {
    const data = encodeFunctionData({
      abi: FRENPET_ABI,
      functionName: 'createPet',
      args: [name],
    });

    const result = await execute({
      calls: [{
        to: FRENPET_ADDRESS,
        data,
      }],
      sessionKey: hasUsableSessionKey && keyPair ? keyPair : undefined,
    });

    if (!result?.success) {
      throw new Error(result?.error?.message || 'Transaction failed');
    }

    return result;
  }, [execute, hasUsableSessionKey, keyPair]);

  const feedPet = useCallback(async () => {
    const data = encodeFunctionData({
      abi: FRENPET_ABI,
      functionName: 'feedPet',
    });

    const result = await execute({
      calls: [{
        to: FRENPET_ADDRESS,
        data,
        value: toHex(parseEther('0.001')),
      }],
      sessionKey: hasUsableSessionKey && keyPair ? keyPair : undefined,
    });

    if (!result?.success) {
      throw new Error(result?.error?.message || 'Transaction failed');
    }

    return result;
  }, [execute, hasUsableSessionKey, keyPair]);

  const playWithPet = useCallback(async () => {
    const data = encodeFunctionData({
      abi: FRENPET_ABI,
      functionName: 'playWithPet',
    });

    const result = await execute({
      calls: [{
        to: FRENPET_ADDRESS,
        data,
        value: toHex(parseEther('0.0005')),
      }],
      sessionKey: hasUsableSessionKey && keyPair ? keyPair : undefined,
    });

    if (!result?.success) {
      throw new Error(result?.error?.message || 'Transaction failed');
    }

    return result;
  }, [execute, hasUsableSessionKey, keyPair]);

  const initiateBattle = useCallback(async (opponent: string) => {
    const data = encodeFunctionData({
      abi: FRENPET_ABI,
      functionName: 'initiateBattle',
      args: [opponent as `0x${string}`],
    });

    const result = await execute({
      calls: [{
        to: FRENPET_ADDRESS,
        data,
        value: toHex(parseEther('0.002')),
      }],
      sessionKey: hasUsableSessionKey && keyPair ? keyPair : undefined,
    });

    if (!result?.success) {
      throw new Error(result?.error?.message || 'Transaction failed');
    }

    return result;
  }, [execute, hasUsableSessionKey, keyPair]);

  const getPetStats = useCallback(async (owner: string) => {
    if (!publicClient) throw new Error('Public client not available');

    const contract = viemGetContract({
      address: FRENPET_ADDRESS,
      abi: FRENPET_ABI,
      client: publicClient,
    });

    return await contract.read.getPetStats([owner as `0x${string}`]);
  }, [publicClient]);

  const hasPet = useCallback(async (address: string): Promise<boolean> => {
    if (!publicClient) throw new Error('Public client not available');

    const contract = viemGetContract({
      address: FRENPET_ADDRESS,
      abi: FRENPET_ABI,
      client: publicClient,
    });

    return await contract.read.hasPet([address as `0x${string}`]) as boolean;
  }, [publicClient]);

  return {
    isLoading,
    createPet,
    feedPet,
    playWithPet,
    initiateBattle,
    getPetStats,
    hasPet,
  };
}