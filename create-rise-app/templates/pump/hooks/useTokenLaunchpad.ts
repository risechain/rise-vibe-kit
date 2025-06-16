import { useCallback } from 'react';
import { createContractHook } from './useContractFactory';

const useBaseTokenLaunchpad = createContractHook('TokenLaunchpad');

export function useTokenLaunchpad() {
  const { read, write, isLoading } = useBaseTokenLaunchpad();

  const launchToken = useCallback(async (
    name: string,
    symbol: string,
    description: string,
    imageUrl: string
  ) => {
    return await write('launchToken', [name, symbol, description, imageUrl]);
  }, [write]);

  const buyToken = useCallback(async (tokenAddress: string, ethAmount: bigint) => {
    return await write('buyToken', [tokenAddress], ethAmount);
  }, [write]);

  const sellToken = useCallback(async (tokenAddress: string, tokenAmount: bigint) => {
    return await write('sellToken', [tokenAddress, tokenAmount]);
  }, [write]);

  const getActiveTokens = useCallback(async (): Promise<string[]> => {
    return await read('getActiveTokens', []);
  }, [read]);

  const getTokenInfo = useCallback(async (tokenAddress: string) => {
    return await read('tokens', [tokenAddress]);
  }, [read]);

  const getCurrentPrice = useCallback(async (tokenAddress: string): Promise<bigint> => {
    return await read('getCurrentPrice', [tokenAddress]);
  }, [read]);

  const getTokenTrades = useCallback(async (tokenAddress: string) => {
    return await read('getTokenTrades', [tokenAddress]);
  }, [read]);

  return {
    isLoading,
    launchToken,
    buyToken,
    sellToken,
    getActiveTokens,
    getTokenInfo,
    getCurrentPrice,
    getTokenTrades,
  };
}