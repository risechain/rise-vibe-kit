'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { createPublicClient, webSocket, type PublicClient } from 'viem';
import { riseTestnet } from 'viem/chains';
import { ContractEvent, ContractEventArgs } from '@/types/contracts';
import { contracts } from '@/contracts/contracts';
import { toast } from '@/lib/toast-manager';

interface WebSocketContextType {
  client: PublicClient | null;
  isConnected: boolean;
  error: unknown;
  contractEvents: ContractEvent[];
  subscribeToContract: (contractAddress: string) => void;
  unsubscribeFromContract: (contractAddress: string) => void;
  getContractEvents: (contractAddress: string) => ContractEvent[];
}

const WebSocketContext = createContext<WebSocketContextType>({
  client: null,
  isConnected: false,
  error: null,
  contractEvents: [],
  subscribeToContract: () => {},
  unsubscribeFromContract: () => {},
  getContractEvents: () => [],
});

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [error] = useState<unknown>(null);
  const [contractEvents, setContractEvents] = useState<ContractEvent[]>([]);
  const clientRef = useRef<PublicClient | null>(null);
  const isInitializedRef = useRef(false);
  const unsubscribeFunctionsRef = useRef<Map<string, () => void>>(new Map());
  
  // Optional: Uncomment to omit specific contracts from subscriptions
  // const omitContracts = ['USDC'];

  useEffect(() => {
    // Prevent double initialization in development
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    // Create Viem client with WebSocket transport
    const client = createPublicClient({
      chain: riseTestnet,
      transport: webSocket('wss://testnet.riselabs.xyz/ws', {
        reconnect: true,
        retryCount: 3,
      }),
    });
    clientRef.current = client;

    // Set initial connected state (WebSocket will auto-connect)
    setIsConnected(true);
    console.log('WebSocket provider: initializing');
    toast.websocketStatus(true);

    // Subscribe to all contracts
    Object.entries(contracts).forEach(([name, contractInfo]) => {
      // Optional: Skip omitted contracts
      // if (omitContracts?.includes(name)) {
      //   console.log(`⏭️ Skipping subscription for ${name} (omitted)`);
      //   return;
      // }
      
      console.log(`Auto-subscribing to ${name} at ${contractInfo.address}`);
      
      const unwatch = client.watchContractEvent({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        onLogs: (logs) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          logs.forEach((log: any) => {
            console.log(`${name} event:`, log.eventName, log.args);
            
            // Convert Viem log format to our ContractEvent format
            const contractEvent: ContractEvent = {
              address: log.address,
              topics: log.topics,
              data: log.data,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber ? log.blockNumber.toString() : null,
              logIndex: log.logIndex ?? 0,
              timestamp: new Date(),
              decoded: true,
              eventName: log.eventName,
              args: log.args as ContractEventArgs,
            };
            
            setContractEvents(prev => {
              // Check for duplicates
              const isDuplicate = prev.some(e => 
                e.transactionHash === contractEvent.transactionHash && 
                e.logIndex === contractEvent.logIndex
              );
              
              if (isDuplicate) {
                console.log('Duplicate event filtered:', contractEvent.transactionHash);
                return prev;
              }
              
              // Limit array size
              const newEvents = [...prev, contractEvent];
              if (newEvents.length > 500) {
                return newEvents.slice(-400);
              }
              return newEvents;
            });
          });
        },
        onError: (error) => {
          console.error(`Error watching ${name} events:`, error);
        },
      });
      
      unsubscribeFunctionsRef.current.set(contractInfo.address, unwatch);
    });

    return () => {
      console.log('WebSocket provider: cleaning up');
      
      // Copy refs to avoid stale closure issues
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const unsubscribeFunctions = unsubscribeFunctionsRef.current;
      const client = clientRef.current;
      
      // Unsubscribe from all contracts
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctions.clear();
      
      if (client && 'destroy' in client.transport) {
        client.transport.destroy();
      }
      clientRef.current = null;
      isInitializedRef.current = false;
    };
  }, []);

  const subscribeToContract = useCallback((contractAddress: string) => {
    if (!clientRef.current) {
      console.warn('WebSocket client not initialized');
      return;
    }
    
    if (unsubscribeFunctionsRef.current.has(contractAddress)) {
      console.log(`Already subscribed to contract: ${contractAddress}`);
      return;
    }
    
    // Find contract info by address
    const contractEntry = Object.entries(contracts).find(
      ([, contract]) => contract.address.toLowerCase() === contractAddress.toLowerCase()
    );
    
    if (!contractEntry) {
      console.error(`Contract ABI not found for address: ${contractAddress}`);
      return;
    }
    
    const [name, contractInfo] = contractEntry;
    console.log(`Subscribing to contract ${name}: ${contractAddress}`);
    
    const unwatch = clientRef.current.watchContractEvent({
      address: contractAddress as `0x${string}`,
      abi: contractInfo.abi,
      onLogs: (logs) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logs.forEach((log: any) => {
          console.log(`${name} event:`, log.eventName, log.args);
          
          const contractEvent: ContractEvent = {
            address: log.address,
            topics: log.topics,
            data: log.data,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber ? log.blockNumber.toString() : null,
            logIndex: log.logIndex ?? 0,
            timestamp: new Date(),
            decoded: true,
            eventName: log.eventName,
            args: log.args as ContractEventArgs,
          };
          
          setContractEvents(prev => {
            const isDuplicate = prev.some(e => 
              e.transactionHash === contractEvent.transactionHash && 
              e.logIndex === contractEvent.logIndex
            );
            
            if (isDuplicate) return prev;
            
            const newEvents = [...prev, contractEvent];
            if (newEvents.length > 500) {
              return newEvents.slice(-400);
            }
            return newEvents;
          });
        });
      },
    });
    
    unsubscribeFunctionsRef.current.set(contractAddress, unwatch);
  }, []);
  
  const unsubscribeFromContract = useCallback((contractAddress: string) => {
    const unsubscribe = unsubscribeFunctionsRef.current.get(contractAddress);
    if (unsubscribe) {
      console.log(`Unsubscribing from contract: ${contractAddress}`);
      unsubscribe();
      unsubscribeFunctionsRef.current.delete(contractAddress);
    }
  }, []);
  
  const getContractEvents = useCallback((contractAddress: string) => {
    return contractEvents.filter(event => 
      event.address?.toLowerCase() === contractAddress.toLowerCase()
    );
  }, [contractEvents]);

  return (
    <WebSocketContext.Provider value={{ 
      client: clientRef.current, 
      isConnected, 
      error,
      contractEvents,
      subscribeToContract,
      unsubscribeFromContract,
      getContractEvents
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}