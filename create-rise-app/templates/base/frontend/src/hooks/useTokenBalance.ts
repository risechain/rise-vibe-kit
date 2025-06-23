import { useState, useEffect, useCallback } from 'react';
import { type Address } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';

interface TokenBalance {
  raw: bigint;
  formatted: string;
  symbol: string;
  decimals: number;
}

interface UseTokenBalanceOptions {
  watch?: boolean;
  refreshInterval?: number;
}

/**
 * Hook to fetch and watch token balances
 * Supports both ETH and ERC20 tokens
 */
export function useTokenBalance(
  tokenAddress?: Address,
  accountAddress?: Address,
  options: UseTokenBalanceOptions = {}
) {
  const { watch = true, refreshInterval = 10000 } = options;
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  
  const address = accountAddress || connectedAddress;
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address || !publicClient) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!tokenAddress) {
        // Fetch ETH balance
        const rawBalance = await publicClient.getBalance({ address });
        setBalance({
          raw: rawBalance,
          formatted: formatEther(rawBalance),
          symbol: 'ETH',
          decimals: 18
        });
      } else {
        // Fetch ERC20 token balance
        const [rawBalance, symbol, decimals] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: [
              {
                name: 'balanceOf',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'account', type: 'address' }],
                outputs: [{ name: 'balance', type: 'uint256' }]
              }
            ],
            functionName: 'balanceOf',
            args: [address]
          }) as Promise<bigint>,
          publicClient.readContract({
            address: tokenAddress,
            abi: [
              {
                name: 'symbol',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ name: 'symbol', type: 'string' }]
              }
            ],
            functionName: 'symbol'
          }) as Promise<string>,
          publicClient.readContract({
            address: tokenAddress,
            abi: [
              {
                name: 'decimals',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ name: 'decimals', type: 'uint8' }]
              }
            ],
            functionName: 'decimals'
          }) as Promise<number>
        ]);

        const formatted = (Number(rawBalance) / Math.pow(10, decimals)).toFixed(6);
        
        setBalance({
          raw: rawBalance,
          formatted,
          symbol,
          decimals
        });
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [address, tokenAddress, publicClient]);

  // Initial fetch
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Set up polling if watch is enabled
  useEffect(() => {
    if (!watch || !address) return;

    const interval = setInterval(fetchBalance, refreshInterval);
    return () => clearInterval(interval);
  }, [watch, address, refreshInterval, fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance
  };
}

/**
 * Hook to fetch multiple token balances at once
 */
export function useMultipleTokenBalances(
  tokenAddresses: Address[],
  accountAddress?: Address
) {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const address = accountAddress || connectedAddress;
  
  const [balances, setBalances] = useState<Map<Address, TokenBalance>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!address || !publicClient || tokenAddresses.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        tokenAddresses.map(async (tokenAddress) => {
          try {
            const [rawBalance, symbol, decimals] = await Promise.all([
              publicClient.readContract({
                address: tokenAddress,
                abi: [
                  {
                    name: 'balanceOf',
                    type: 'function',
                    stateMutability: 'view',
                    inputs: [{ name: 'account', type: 'address' }],
                    outputs: [{ name: 'balance', type: 'uint256' }]
                  }
                ],
                functionName: 'balanceOf',
                args: [address]
              }) as Promise<bigint>,
              publicClient.readContract({
                address: tokenAddress,
                abi: [
                  {
                    name: 'symbol',
                    type: 'function',
                    stateMutability: 'view',
                    inputs: [],
                    outputs: [{ name: 'symbol', type: 'string' }]
                  }
                ],
                functionName: 'symbol'
              }) as Promise<string>,
              publicClient.readContract({
                address: tokenAddress,
                abi: [
                  {
                    name: 'decimals',
                    type: 'function',
                    stateMutability: 'view',
                    inputs: [],
                    outputs: [{ name: 'decimals', type: 'uint8' }]
                  }
                ],
                functionName: 'decimals'
              }) as Promise<number>
            ]);

            const formatted = (Number(rawBalance) / Math.pow(10, decimals)).toFixed(6);
            
            return {
              address: tokenAddress,
              balance: {
                raw: rawBalance,
                formatted,
                symbol,
                decimals
              }
            };
          } catch {
            return null;
          }
        })
      );

      const newBalances = new Map<Address, TokenBalance>();
      results.forEach(result => {
        if (result) {
          newBalances.set(result.address, result.balance);
        }
      });
      
      setBalances(newBalances);
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [address, tokenAddresses, publicClient]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    balances,
    isLoading,
    error,
    refetch: fetchBalances
  };
}