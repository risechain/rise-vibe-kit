import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { useRiseWebSocket } from '../../hooks/useRiseWebSocket';

interface UseBlockNumberOptions {
  watch?: boolean;
  onNewBlock?: (blockNumber: bigint) => void;
}

/**
 * Hook to get the current block number and optionally watch for new blocks
 * Uses WebSocket for real-time updates when available
 */
export function useBlockNumber(options: UseBlockNumberOptions = {}) {
  const { watch = true, onNewBlock } = options;
  const publicClient = usePublicClient();
  const { isConnected: wsConnected } = useRiseWebSocket();
  
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch current block number
  const fetchBlockNumber = useCallback(async () => {
    if (!publicClient) return;

    try {
      const number = await publicClient.getBlockNumber();
      setBlockNumber(number);
      setError(null);
    } catch (err) {
      console.error('Error fetching block number:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  // Initial fetch
  useEffect(() => {
    fetchBlockNumber();
  }, [fetchBlockNumber]);

  // Watch for new blocks via polling (fallback when WebSocket not available)
  useEffect(() => {
    if (!watch || !publicClient || wsConnected) return;

    const unwatch = publicClient.watchBlockNumber({
      onBlockNumber: (newBlockNumber) => {
        setBlockNumber(newBlockNumber);
        onNewBlock?.(newBlockNumber);
      },
      poll: true,
      pollingInterval: 12_000, // 12 seconds for RISE
    });

    return () => unwatch();
  }, [watch, publicClient, wsConnected, onNewBlock]);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!watch || !wsConnected) return;

    // Listen for new block events from WebSocket
    const handleWebSocketMessage = (event: CustomEvent) => {
      const data = event.detail;
      if (data.method === 'rise_subscription' && data.params?.result?.number) {
        const newBlockNumber = BigInt(data.params.result.number);
        setBlockNumber(newBlockNumber);
        onNewBlock?.(newBlockNumber);
      }
    };

    window.addEventListener('rise-websocket-message', handleWebSocketMessage as EventListener);
    return () => {
      window.removeEventListener('rise-websocket-message', handleWebSocketMessage as EventListener);
    };
  }, [watch, wsConnected, onNewBlock]);

  return {
    blockNumber,
    isLoading,
    error,
    refetch: fetchBlockNumber
  };
}

/**
 * Hook to calculate blocks until a target block
 */
export function useBlocksUntil(targetBlock: bigint | null) {
  const { blockNumber } = useBlockNumber();
  
  if (!blockNumber || !targetBlock) return null;
  
  const blocksRemaining = targetBlock - blockNumber;
  return blocksRemaining > 0n ? blocksRemaining : 0n;
}

/**
 * Hook to estimate time until a target block
 * Based on RISE's ~1 second block time
 */
export function useTimeUntilBlock(targetBlock: bigint | null) {
  const blocksRemaining = useBlocksUntil(targetBlock);
  
  if (blocksRemaining === null) return null;
  
  const secondsRemaining = Number(blocksRemaining);
  const minutesRemaining = Math.floor(secondsRemaining / 60);
  const hoursRemaining = Math.floor(minutesRemaining / 60);
  
  return {
    seconds: secondsRemaining,
    minutes: minutesRemaining,
    hours: hoursRemaining,
    formatted: formatTimeRemaining(secondsRemaining)
  };
}

function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}