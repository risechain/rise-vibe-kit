'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { RiseWebSocketManager } from '@/lib/websocket/RiseWebSocketManager';
import { ContractEvent } from '@/types/contracts';
import { contracts } from '@/contracts/contracts';
import { toast } from '@/lib/toast-manager';

interface WebSocketContextType {
  manager: RiseWebSocketManager | null;
  isConnected: boolean;
  error: unknown;
  contractEvents: ContractEvent[];
  subscribeToContract: (contractAddress: string) => void;
  unsubscribeFromContract: (contractAddress: string) => void;
  getContractEvents: (contractAddress: string) => ContractEvent[];
}

const WebSocketContext = createContext<WebSocketContextType>({
  manager: null,
  isConnected: false,
  error: null,
  contractEvents: [],
  subscribeToContract: () => {},
  unsubscribeFromContract: () => {},
  getContractEvents: () => [],
});

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [contractEvents, setContractEvents] = useState<ContractEvent[]>([]);
  const managerRef = useRef<RiseWebSocketManager | null>(null);
  const isInitializedRef = useRef(false);
  const subscribedContractsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Prevent double initialization in development
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    // Create a single WebSocket manager instance
    const manager = new RiseWebSocketManager();
    managerRef.current = manager;

    manager.on('connected', () => {
      setIsConnected(true);
      setError(null);
      console.log('WebSocket provider: connected');
      toast.websocketStatus(true);
      
      // Auto-subscribe to all deployed contracts
      Object.entries(contracts).forEach(([name, info]) => {
        if (!subscribedContractsRef.current.has(info.address)) {
          console.log(`Auto-subscribing to ${name} at ${info.address}`);
          manager.subscribeToContract(info.address);
          subscribedContractsRef.current.add(info.address);
        }
      });
    });

    manager.on('disconnected', () => {
      setIsConnected(false);
      console.log('WebSocket provider: disconnected');
      toast.websocketStatus(false);
    });

    manager.on('error', (err) => {
      setError(err);
      console.error('WebSocket provider error:', err);
      // Only show error toast for critical errors, not routine connection issues
      if (err && typeof err === 'object' && 'message' in err && 
          !err.message?.includes('WebSocket is closed')) {
        toast.error(`WebSocket error: ${err.message}`);
      }
    });

    manager.on('subscribed', (subscriptionId) => {
      console.log('WebSocket provider: subscribed with ID:', subscriptionId);
    });

    manager.on('contractEvent', (event) => {
      console.log('Contract event received:', event);
      setContractEvents(prev => {
        // Add timestamp if not present
        const eventWithTimestamp = {
          ...event,
          timestamp: event.timestamp || new Date(),
          logIndex: event.logIndex || 0 // Ensure logIndex exists
        };
        
        // Check for duplicates based on transaction hash and log index
        const isDuplicate = prev.some(e => 
          e.transactionHash === eventWithTimestamp.transactionHash && 
          e.logIndex === eventWithTimestamp.logIndex
        );
        
        if (isDuplicate) {
          console.log('Duplicate event filtered:', eventWithTimestamp.transactionHash);
          return prev;
        }
        
        // Limit array size to prevent memory issues
        const newEvents = [...prev, eventWithTimestamp];
        if (newEvents.length > 500) {
          return newEvents.slice(-400); // Keep last 400 events
        }
        return newEvents;
      });
    });

    return () => {
      console.log('WebSocket provider: cleaning up');
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []);

  const subscribeToContract = useCallback((contractAddress: string) => {
    if (!managerRef.current) {
      console.warn('WebSocket manager not initialized');
      return;
    }
    
    if (subscribedContractsRef.current.has(contractAddress)) {
      console.log(`Already subscribed to contract: ${contractAddress}`);
      return;
    }
    
    console.log(`Subscribing to contract: ${contractAddress}`);
    managerRef.current.subscribeToContract(contractAddress);
    subscribedContractsRef.current.add(contractAddress);
  }, []);
  
  const unsubscribeFromContract = useCallback((contractAddress: string) => {
    if (!managerRef.current) {
      console.warn('WebSocket manager not initialized');
      return;
    }
    
    console.log(`Unsubscribing from contract: ${contractAddress}`);
    // Note: RiseWebSocketManager doesn't currently have unsubscribe method
    // This would need to be implemented in the manager
    subscribedContractsRef.current.delete(contractAddress);
  }, []);
  
  const getContractEvents = useCallback((contractAddress: string) => {
    return contractEvents.filter(event => 
      event.address?.toLowerCase() === contractAddress.toLowerCase()
    );
  }, [contractEvents]);

  return (
    <WebSocketContext.Provider value={{ 
      manager: managerRef.current, 
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