'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { getContract, type ContractName, contracts } from '@/contracts/contracts';
import { EventCacheManager } from '@/lib/cache/EventCacheManager';
import type { ContractEvent } from '@/types/contracts';

interface UseContractEventsOptions {
  // Enable historical event fetching
  enableHistorical?: boolean;
  // Auto-fetch historical events on mount
  autoFetch?: boolean;
  // Block range for historical fetching
  blockRange?: number;
  // Batch size for RPC calls
  batchSize?: number;
  // Cache configuration (only used when enableHistorical is true)
  cacheOptions?: {
    maxSize?: number;
    ttl?: number;
    storage?: 'memory' | 'indexeddb';
  };
  // Callback for new events
  onNewEvent?: (event: ContractEvent) => void;
  // Progress callback for historical fetching
  onProgress?: (progress: number) => void;
  // Custom block range
  fromBlock?: bigint;
  toBlock?: bigint;
}

interface UseContractEventsReturn {
  events: ContractEvent[];
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
  // Historical fetching methods (only available when enableHistorical is true)
  fetchMore?: () => Promise<void>;
  refresh?: () => Promise<void>;
  hasMore?: boolean;
  // Utility methods
  getEventsByName: (eventName: string) => ContractEvent[];
  eventNames: string[];
  contractAddress?: string;
  // Cache stats (only available when enableHistorical is true)
  cacheStats?: {
    size: number;
    keys: string[];
    storage: string;
  };
}

// Global cache instance
let cacheManager: EventCacheManager | null = null;

function getCacheManager(options?: UseContractEventsOptions['cacheOptions']): EventCacheManager {
  if (!cacheManager) {
    cacheManager = new EventCacheManager(options);
  }
  return cacheManager;
}

export function useContractEvents<T extends ContractName | string>(
  contractName: T,
  eventName?: string,
  options: UseContractEventsOptions = {}
): UseContractEventsReturn {
  const { contractEvents, isConnected } = useWebSocket();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  // Contract info
  const contractInfo = contractName in contracts ? getContract(contractName as ContractName) : null;

  // State for historical fetching
  const [historicalEvents, setHistoricalEvents] = useState<ContractEvent[]>([]);
  const [cachedEvents, setCachedEvents] = useState<ContractEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const lastBlockRef = useRef<bigint | null>(null);
  const lastProcessedBlockRef = useRef<bigint | null>(null);

  const {
    enableHistorical = false,
    autoFetch = false,
    blockRange = 1000,
    batchSize = 100,
    cacheOptions,
    onNewEvent,
    onProgress,
    fromBlock,
    toBlock
  } = options;

  // Get cache manager if historical is enabled
  const cache = enableHistorical ? getCacheManager(cacheOptions) : null;
  const cacheKey = cache ? cache.getCacheKey(contractName as ContractName, eventName, chainId) : '';

  // Initialize cache if historical is enabled
  useEffect(() => {
    if (!enableHistorical || !cache) return;

    const initCache = async () => {
      const cached = await cache.getEvents(cacheKey);
      setCachedEvents(cached);
      setIsInitialized(true);
    };

    initCache();
  }, [enableHistorical, cache, cacheKey]);

  // Filter real-time WebSocket events
  const realtimeEvents = useMemo(() => {
    if (!contractInfo) return [];

    let filtered = contractEvents.filter(event =>
      event.address?.toLowerCase() === contractInfo.address.toLowerCase()
    );

    // Further filter by event name if specified
    if (eventName) {
      filtered = filtered.filter(event => event.eventName === eventName);
    }

    return filtered;
  }, [contractEvents, contractInfo, eventName]);

  // Fetch historical events
  const fetchHistorical = useCallback(async () => {
    if (!publicClient || isLoading || !hasMore || !contractInfo || !enableHistorical) return;

    setIsLoading(true);
    setError(null);

    try {
      const contractAddress = contractInfo.address;
      const abi = contractInfo.abi;

      // Get current block if not specified
      const currentBlock = toBlock || await publicClient.getBlockNumber();

      // Calculate block range
      let startBlock: bigint;
      if (lastBlockRef.current !== null) {
        startBlock = lastBlockRef.current - BigInt(1);
      } else if (fromBlock !== undefined) {
        startBlock = fromBlock;
      } else {
        startBlock = currentBlock - BigInt(blockRange);
      }

      if (startBlock < BigInt(0)) startBlock = BigInt(0);

      // Don't fetch if we've reached the start
      if (startBlock <= BigInt(0) && lastBlockRef.current !== null) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      // Fetch logs in batches
      const allLogs: ContractEvent[] = [];
      let currentBatchStart = currentBlock;
      const totalBlocks = Number(currentBlock - startBlock);
      let processedBlocks = 0;

      while (currentBatchStart > startBlock) {
        const batchEnd = currentBatchStart;
        const batchStart = currentBatchStart - BigInt(batchSize) > startBlock
          ? currentBatchStart - BigInt(batchSize)
          : startBlock;

        try {
          const logs = await publicClient.getLogs({
            address: contractAddress as `0x${string}`,
            fromBlock: batchStart,
            toBlock: batchEnd
          });

          // Decode logs
          const decodedLogs = await Promise.all(logs.map(async (log) => {
            try {
              // Find matching event in ABI
              const eventAbi = abi.find(
                item => item.type === 'event' &&
                (!eventName || item.name === eventName)
              );

              if (!eventAbi) return null;

              // Get block timestamp
              const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

              return {
                address: log.address,
                topics: log.topics,
                data: log.data,
                transactionHash: log.transactionHash,
                blockNumber: log.blockNumber.toString(),
                logIndex: log.logIndex,
                timestamp: new Date(Number(block.timestamp) * 1000),
                decoded: true,
                eventName: eventName || 'Unknown',
                args: log as unknown as Record<string, unknown>
              } as ContractEvent;
            } catch (err) {
              console.warn('Failed to decode log:', err);
              return null;
            }
          }));

          // Filter out null values and add to results
          const validLogs = decodedLogs.filter((log): log is ContractEvent => log !== null);
          allLogs.push(...validLogs);

          // Update progress
          processedBlocks += Number(batchEnd - batchStart);
          if (onProgress) {
            const progress = Math.min(100, Math.round((processedBlocks / totalBlocks) * 100));
            onProgress(progress);
          }
        } catch (err) {
          console.error(`Error fetching logs for batch ${batchStart}-${batchEnd}:`, err);
        }

        currentBatchStart = batchStart - BigInt(1);
      }

      // Sort by block number (newest first)
      allLogs.sort((a, b) => {
        if (!a.blockNumber || !b.blockNumber) return 0;
        const aBlock = BigInt(a.blockNumber);
        const bBlock = BigInt(b.blockNumber);
        return Number(bBlock - aBlock);
      });

      // Update state
      setHistoricalEvents(prev => {
        // Remove duplicates
        const existingHashes = new Set(prev.map(e => e.transactionHash + e.logIndex));
        const newEvents = allLogs.filter(e => !existingHashes.has(e.transactionHash + e.logIndex));
        return [...prev, ...newEvents];
      });

      lastBlockRef.current = startBlock;

      // Check if there are more events to fetch
      if (startBlock <= BigInt(0)) {
        setHasMore(false);
      }

    } catch (err) {
      console.error('Error fetching historical events:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch events'));
    } finally {
      setIsLoading(false);
    }
  }, [
    publicClient,
    contractInfo,
    eventName,
    blockRange,
    batchSize,
    onProgress,
    fromBlock,
    toBlock,
    isLoading,
    hasMore,
    enableHistorical
  ]);

  // Merge historical events with cache
  useEffect(() => {
    if (!enableHistorical || !cache || !isInitialized) return;

    if (historicalEvents.length > 0) {
      cache.mergeEvents(cacheKey, historicalEvents).then(() => {
        cache.getEvents(cacheKey).then(setCachedEvents);
      });
    }
  }, [historicalEvents, cache, cacheKey, isInitialized, enableHistorical]);

  // Handle real-time events with cache
  useEffect(() => {
    if (!enableHistorical || !cache) return;

    // Filter relevant real-time events
    const relevantEvents = realtimeEvents.filter(event => {
      // Check if we've already processed this block
      if (lastProcessedBlockRef.current && event.blockNumber) {
        const eventBlockNumber = typeof event.blockNumber === 'string'
          ? BigInt(event.blockNumber)
          : event.blockNumber;
        if (eventBlockNumber <= lastProcessedBlockRef.current) {
          return false;
        }
      }

      return true;
    });

    if (relevantEvents.length > 0) {
      // Update last processed block
      const maxBlock = relevantEvents.reduce((max, event) => {
        if (!event.blockNumber) return max;
        const eventBlockNumber = typeof event.blockNumber === 'string'
          ? BigInt(event.blockNumber)
          : event.blockNumber;
        return eventBlockNumber > max ? eventBlockNumber : max;
      }, lastProcessedBlockRef.current || BigInt(0));
      lastProcessedBlockRef.current = maxBlock;

      // Merge new events
      cache.mergeEvents(cacheKey, relevantEvents).then(() => {
        cache.getEvents(cacheKey).then(setCachedEvents);

        // Notify about new events
        if (onNewEvent) {
          relevantEvents.forEach(event => onNewEvent(event));
        }
      });
    }
  }, [realtimeEvents, cache, cacheKey, onNewEvent, enableHistorical]);

  // Notify about new real-time events (when historical is disabled)
  useEffect(() => {
    if (enableHistorical || !onNewEvent) return;

    const relevantEvents = realtimeEvents.filter(event => {
      if (lastProcessedBlockRef.current && event.blockNumber) {
        const eventBlockNumber = typeof event.blockNumber === 'string'
          ? BigInt(event.blockNumber)
          : event.blockNumber;
        if (eventBlockNumber <= lastProcessedBlockRef.current) {
          return false;
        }
      }
      return true;
    });

    if (relevantEvents.length > 0) {
      const maxBlock = relevantEvents.reduce((max, event) => {
        if (!event.blockNumber) return max;
        const eventBlockNumber = typeof event.blockNumber === 'string'
          ? BigInt(event.blockNumber)
          : event.blockNumber;
        return eventBlockNumber > max ? eventBlockNumber : max;
      }, lastProcessedBlockRef.current || BigInt(0));
      lastProcessedBlockRef.current = maxBlock;

      relevantEvents.forEach(event => onNewEvent(event));
    }
  }, [realtimeEvents, onNewEvent, enableHistorical]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (enableHistorical && autoFetch && isInitialized && cachedEvents.length === 0) {
      fetchHistorical();
    }
  }, [enableHistorical, autoFetch, isInitialized, cachedEvents.length, fetchHistorical]);

  // Fetch more historical events
  const fetchMore = useCallback(async () => {
    if (enableHistorical && !isLoading && hasMore) {
      await fetchHistorical();
    }
  }, [enableHistorical, fetchHistorical, isLoading, hasMore]);

  // Refresh cache
  const refresh = useCallback(async () => {
    if (!enableHistorical || !cache) return;

    setHistoricalEvents([]);
    setError(null);
    setHasMore(true);
    lastBlockRef.current = null;

    await cache.clear(cacheKey);
    setCachedEvents([]);
    lastProcessedBlockRef.current = null;

    if (autoFetch) {
      await fetchHistorical();
    }
  }, [enableHistorical, cache, cacheKey, fetchHistorical, autoFetch]);

  // Determine which events to return
  const events = enableHistorical ? cachedEvents : realtimeEvents;

  // Debug logging
  useEffect(() => {
    if (events.length > 0) {
      console.log(`[useContractEvents] ${contractName} events:`, {
        count: events.length,
        mode: enableHistorical ? 'historical+realtime' : 'realtime-only',
        eventName: eventName || 'all',
        latestEvent: events[events.length - 1]
      });
    }
  }, [events.length, contractName, enableHistorical, eventName, events]);

  // Get events by name
  const getEventsByName = useCallback((name: string) => {
    return events.filter(event => event.eventName === name);
  }, [events]);

  // Get unique event names
  const eventNames = useMemo(() => {
    const names = new Set<string>();
    events.forEach(event => {
      if (event.eventName) names.add(event.eventName);
    });
    return Array.from(names);
  }, [events]);

  // Get cache statistics
  const cacheStats = cache ? cache.getStats() : undefined;

  return {
    events,
    isLoading: enableHistorical ? isLoading : false,
    error: enableHistorical ? error : null,
    isConnected,
    ...(enableHistorical && {
      fetchMore,
      refresh,
      hasMore,
      cacheStats
    }),
    getEventsByName,
    eventNames,
    contractAddress: contractInfo?.address,
  };
}
