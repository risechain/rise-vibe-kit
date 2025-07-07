import { useState, useCallback } from 'react';
import { parseEther } from 'viem';

// Temporary placeholder until FrenPet is deployed
// Will be replaced with createContractHook('FrenPet') after deployment

export function useFrenPet() {
  const [isLoading] = useState(false);

  // Mock functions that will work once the contract is deployed
  const read = useCallback(async (functionName: string, args: unknown[] = []) => {
    console.log(`[FrenPet] Mock read: ${functionName}`, args);
    // Return mock data based on function name
    if (functionName === 'hasPet') return false;
    if (functionName === 'getPetStats') return ['', 0, 0, 0, 0, false, 0];
    return null;
  }, []);
  
  const write = useCallback(async (functionName: string, args: unknown[] = [], value?: bigint) => {
    console.log(`[FrenPet] Mock write: ${functionName}`, args, value ? `value: ${value.toString()}` : '');
    return { success: true };
  }, []);

  const createPet = useCallback(async (name: string) => {
    return await write('createPet', [name]);
  }, [write]);

  const feedPet = useCallback(async () => {
    return await write('feedPet', [], parseEther('0.001'));
  }, [write]);

  const playWithPet = useCallback(async () => {
    return await write('playWithPet', [], parseEther('0.0005'));
  }, [write]);

  const initiateBattle = useCallback(async (opponent: string) => {
    return await write('initiateBattle', [opponent], parseEther('0.002'));
  }, [write]);

  const getPetStats = useCallback(async (owner: string) => {
    return await read('getPetStats', [owner]);
  }, [read]);

  const hasPet = useCallback(async (address: string): Promise<boolean> => {
    return await read('hasPet', [address]) as boolean;
  }, [read]);

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