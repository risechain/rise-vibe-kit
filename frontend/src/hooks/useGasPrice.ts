import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { formatGwei } from 'viem';

interface GasPrice {
  raw: bigint;
  gwei: string;
  formatted: string;
}

interface UseGasPriceOptions {
  watch?: boolean;
  refreshInterval?: number;
}

/**
 * Hook to fetch and monitor gas prices
 * Useful for estimating transaction costs
 */
export function useGasPrice(options: UseGasPriceOptions = {}) {
  const { watch = true, refreshInterval = 15000 } = options;
  const publicClient = usePublicClient();
  
  const [gasPrice, setGasPrice] = useState<GasPrice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGasPrice = useCallback(async () => {
    if (!publicClient) return;

    try {
      const price = await publicClient.getGasPrice();
      
      setGasPrice({
        raw: price,
        gwei: formatGwei(price),
        formatted: `${formatGwei(price)} Gwei`
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching gas price:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  // Initial fetch
  useEffect(() => {
    fetchGasPrice();
  }, [fetchGasPrice]);

  // Set up polling if watch is enabled
  useEffect(() => {
    if (!watch) return;

    const interval = setInterval(fetchGasPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [watch, refreshInterval, fetchGasPrice]);

  return {
    gasPrice,
    isLoading,
    error,
    refetch: fetchGasPrice
  };
}

/**
 * Hook to estimate gas costs for a transaction
 */
export function useGasEstimate(
  estimatedGas: bigint | null,
  options: UseGasPriceOptions = {}
) {
  const { gasPrice } = useGasPrice(options);
  
  if (!estimatedGas || !gasPrice) return null;
  
  const totalCost = estimatedGas * gasPrice.raw;
  const totalCostInGwei = formatGwei(totalCost);
  const totalCostInEth = (Number(totalCost) / 1e18).toFixed(6);
  
  return {
    estimatedGas,
    gasPrice: gasPrice.raw,
    totalCost,
    totalCostInGwei,
    totalCostInEth,
    formatted: `~${totalCostInEth} ETH`
  };
}