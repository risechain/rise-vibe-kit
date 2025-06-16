'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useChainId } from 'wagmi';
import { EventCacheManager } from '@/lib/cache/EventCacheManager';
import { useHistoricalEvents } from './useHistoricalEvents';
import { useWebSocket } from '@/providers/WebSocketProvider';
import type { ContractName } from '@/contracts/contracts';
import type { ContractEvent } from '@/types/contracts';

interface UseEventCacheOptions {
  autoFetch?: boolean;
  blockRange?: number;
  cacheOptions?: {
    maxSize?: number;
    ttl?: number;
    storage?: 'memory' | 'indexeddb';
  };
  onNewEvent?: (event: ContractEvent) => void;
}

interface UseEventCacheReturn {
  events: ContractEvent[];
  isLoading: boolean;
  error: Error | null;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
  cacheStats: {
    size: number;
    keys: string[];
    storage: string;
  };
}

// Global cache instance
let cacheManager: EventCacheManager | null = null;

function getCacheManager(options?: UseEventCacheOptions['cacheOptions']): EventCacheManager {
  if (!cacheManager) {
    cacheManager = new EventCacheManager(options);
  }
  return cacheManager;
}

export function useEventCache(
  contractName: ContractName,
  eventName?: string,
  options: UseEventCacheOptions = {}
): UseEventCacheReturn {
  const chainId = useChainId();
  const [cachedEvents, setCachedEvents] = useState<ContractEvent[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const cache = getCacheManager(options.cacheOptions);
  const cacheKey = cache.getCacheKey(contractName, eventName, chainId);
  
  const { contractEvents } = useWebSocket();
  const lastProcessedBlockRef = useRef<bigint | null>(null);
  
  // Use historical events hook
  const {
    events: historicalEvents,
    isLoading,
    error,
    fetchHistorical,
    hasMore,
    clear
  } = useHistoricalEvents(contractName, eventName, {
    blockRange: options.blockRange,
    onProgress: (progress) => {
      console.log(`Loading historical events: ${progress}%`);
    }
  });

  // Initialize cache
  useEffect(() => {
    const initCache = async () => {
      const cached = await cache.getEvents(cacheKey);
      setCachedEvents(cached);
      setIsInitialized(true);
    };
    
    initCache();
  }, [cache, cacheKey]);

  // Merge historical events with cache
  useEffect(() => {
    if (historicalEvents.length > 0 && isInitialized) {
      cache.mergeEvents(cacheKey, historicalEvents).then(() => {
        cache.getEvents(cacheKey).then(setCachedEvents);
      });
    }
  }, [historicalEvents, cache, cacheKey, isInitialized]);

  // Handle real-time events
  useEffect(() => {
    // Filter relevant real-time events
    const relevantEvents = contractEvents.filter(event => {
      // Check if event is from our contract
      const eventContract = (event as unknown as { contractName?: string }).contractName;
      if (eventContract && eventContract !== contractName) return false;
      
      // Check if event name matches (if specified)
      if (eventName && event.eventName !== eventName) return false;
      
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
        if (options.onNewEvent) {
          relevantEvents.forEach(event => options.onNewEvent!(event));
        }
      });
    }
  }, [contractEvents, cache, cacheKey, contractName, eventName, options]);

  // Fetch more historical events
  const fetchMore = useCallback(async () => {
    if (!isLoading && hasMore) {
      await fetchHistorical();
    }
  }, [fetchHistorical, isLoading, hasMore]);

  // Refresh cache
  const refresh = useCallback(async () => {
    clear();
    await cache.clear(cacheKey);
    setCachedEvents([]);
    lastProcessedBlockRef.current = null;
    
    if (options.autoFetch !== false) {
      await fetchHistorical();
    }
  }, [clear, cache, cacheKey, fetchHistorical, options.autoFetch]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (options.autoFetch !== false && isInitialized && cachedEvents.length === 0) {
      fetchHistorical();
    }
  }, [options.autoFetch, isInitialized, cachedEvents.length, fetchHistorical]);

  // Get cache statistics
  const cacheStats = cache.getStats();

  return {
    events: cachedEvents,
    isLoading,
    error,
    fetchMore,
    refresh,
    hasMore,
    cacheStats
  };
}

// Hook for managing multiple event types
export function useMultiEventCache(
  contracts: Array<{
    contractName: ContractName;
    eventName?: string;
  }>,
  options: UseEventCacheOptions = {}
): Record<string, UseEventCacheReturn> {
  const results: Record<string, UseEventCacheReturn> = {};
  
  contracts.forEach(({ contractName, eventName }) => {
    const key = `${contractName}_${eventName || 'all'}`;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[key] = useEventCache(contractName, eventName, options);
  });
  
  return results;
}