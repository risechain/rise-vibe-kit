import { useCallback } from 'react';
import { createContractHookPayable } from '../useContractFactory';
import { parseEther } from 'viem';

const useBaseFrenPet = createContractHookPayable('FrenPet');

export function useFrenPet() {
  const { read, write, isLoading } = useBaseFrenPet();

  const createPet = useCallback(async (name: string) => {
    return await write('createPet', [name]);
  }, [write]);

  const feedPet = useCallback(async () => {
    return await write('feedPet', [], { value: parseEther('0.001') });
  }, [write]);

  const playWithPet = useCallback(async () => {
    return await write('playWithPet', [], { value: parseEther('0.0005') });
  }, [write]);

  const initiateBattle = useCallback(async (opponent: string) => {
    return await write('initiateBattle', [opponent], { value: parseEther('0.002') });
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