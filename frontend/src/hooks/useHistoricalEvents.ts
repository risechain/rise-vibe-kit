'use client';

import { useState, useCallback, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import { getContract, type ContractName } from '@/contracts/contracts';
import type { ContractEvent } from '@/types/contracts';

interface UseHistoricalEventsOptions {
  blockRange?: number;
  batchSize?: number;
  onProgress?: (progress: number) => void;
  fromBlock?: bigint;
  toBlock?: bigint;
}

interface UseHistoricalEventsReturn {
  events: ContractEvent[];
  isLoading: boolean;
  error: Error | null;
  fetchHistorical: () => Promise<void>;
  hasMore: boolean;
  clear: () => void;
}

export function useHistoricalEvents(
  contractName: ContractName,
  eventName?: string,
  options?: UseHistoricalEventsOptions
): UseHistoricalEventsReturn {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const lastBlockRef = useRef<bigint | null>(null);
  const publicClient = usePublicClient();
  
  const {
    blockRange = 1000,
    batchSize = 100,
    onProgress,
    fromBlock,
    toBlock
  } = options || {};

  const clear = useCallback(() => {
    setEvents([]);
    setError(null);
    setHasMore(true);
    lastBlockRef.current = null;
  }, []);

  const fetchHistorical = useCallback(async () => {
    if (!publicClient || isLoading || !hasMore) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = getContract(contractName);
      const contractAddress = contract.address;
      const abi = contract.abi;
      
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
      
      console.log(`Fetching events from block ${startBlock} to ${currentBlock}`);
      
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
      setEvents(prev => {
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
    contractName,
    eventName,
    blockRange,
    batchSize,
    onProgress,
    fromBlock,
    toBlock,
    isLoading,
    hasMore
  ]);

  return {
    events,
    isLoading,
    error,
    fetchHistorical,
    hasMore,
    clear
  };
}