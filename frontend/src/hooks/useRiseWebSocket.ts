import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { CONTRACTS } from '@/config/websocket';

export function useRiseWebSocket() {
  const { manager, isConnected, error } = useWebSocket();

  const subscribeToContract = useCallback((
    contractAddress: string,
    eventNames?: string[],
    callback?: (event: any) => void
  ) => {
    if (!manager) {
      console.warn('WebSocket manager not initialized');
      return null;
    }

    // Convert event names to topic hashes if provided
    const topics = eventNames?.map(name => {
      // This is a simplified version - in production, you'd use ethers.utils.id()
      return null; // Let the contract filter handle this for now
    }).filter(Boolean);

    return manager.subscribeToLogs(
      contractAddress,
      topics,
      callback
    );
  }, [manager]);

  const subscribeToChatApp = useCallback((callback: (event: any) => void) => {
    return subscribeToContract(CONTRACTS.ChatApp, undefined, callback);
  }, [subscribeToContract]);

  const unsubscribe = useCallback((subscriptionId: string) => {
    if (!manager) return;
    manager.unsubscribe(subscriptionId);
  }, [manager]);

  const disconnect = useCallback(() => {
    if (!manager) return;
    manager.disconnect();
  }, [manager]);

  return {
    isConnected,
    error,
    subscribeToContract,
    subscribeToChatApp,
    unsubscribe,
    disconnect,
    manager
  };
}

// Hook for subscribing to specific ChatApp events
export function useChatAppEvents() {
  const { contractEvents, isConnected } = useWebSocket();
  
  // Memoize processed events to prevent unnecessary re-renders
  const messages = useMemo(() => {
    try {
      return contractEvents
        .filter(event => event.decoded && event.eventName === 'MessageSent')
        .map(event => ({
          user: event.args?.user || '',
          userId: event.args?.userId || '',
          message: event.args?.message || '',
          msgId: event.args?.msgId?.toString() || '0',
          txHash: event.transactionHash || '',
          timestamp: event.timestamp || new Date()
        }));
    } catch (error) {
      console.error('Error processing messages:', error);
      return [];
    }
  }, [contractEvents]);

  const userRegistrations = useMemo(() => {
    try {
      return contractEvents
        .filter(event => event.decoded && event.eventName === 'UserRegistered')
        .map(event => ({
          user: event.args?.user || '',
          userId: event.args?.userId || '',
          txHash: event.transactionHash || '',
          timestamp: event.timestamp || new Date()
        }));
    } catch (error) {
      console.error('Error processing user registrations:', error);
      return [];
    }
  }, [contractEvents]);

  const karmaUpdates = useMemo(() => {
    try {
      return contractEvents
        .filter(event => event.decoded && event.eventName === 'KarmaChanged')
        .map(event => ({
          user: event.args?.user || '',
          userId: event.args?.userId || '',
          karma: event.args?.karma?.toString() || '0',
          txHash: event.transactionHash || '',
          timestamp: event.timestamp || new Date()
        }));
    } catch (error) {
      console.error('Error processing karma updates:', error);
      return [];
    }
  }, [contractEvents]);

  return {
    messages,
    userRegistrations,
    karmaUpdates,
    isConnected
  };
}