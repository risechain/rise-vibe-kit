import { useCallback } from 'react';
import { createContractHookPayable } from '../useContractFactory';

const useBaseTokenLaunchpad = createContractHookPayable('TokenLaunchpad');

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
    return await write('buyToken', [tokenAddress], { value: ethAmount });
  }, [write]);

  const sellToken = useCallback(async (tokenAddress: string, tokenAmount: bigint) => {
    return await write('sellToken', [tokenAddress, tokenAmount]);
  }, [write]);

  const getActiveTokens = useCallback(async (): Promise<string[]> => {
    return await read('getActiveTokens', []) as string[];
  }, [read]);

  const getTokenInfo = useCallback(async (tokenAddress: string) => {
    const result = await read('tokens', [tokenAddress]) as unknown[];
    // Parse the array into a TokenInfo object
    if (Array.isArray(result) && result.length >= 10) {
      return {
        tokenAddress: result[0] as string,
        creator: result[1] as string,
        name: result[2] as string,
        symbol: result[3] as string,
        description: result[4] as string,
        imageUrl: result[5] as string,
        createdAt: result[6] as bigint,
        totalRaised: result[7] as bigint,
        targetRaise: result[8] as bigint,
        isActive: result[9] as boolean
      };
    }
    return null;
  }, [read]);

  const getCurrentPrice = useCallback(async (tokenAddress: string): Promise<bigint> => {
    return await read('getCurrentPrice', [tokenAddress]) as bigint;
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