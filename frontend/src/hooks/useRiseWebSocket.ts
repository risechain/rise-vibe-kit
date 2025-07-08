import { useCallback, useMemo } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { CONTRACTS } from '@/config/websocket';

export function useRiseWebSocket() {
  const { client, isConnected, error, subscribeToContract: wsSubscribe, unsubscribeFromContract } = useWebSocket();

  const subscribeToContract = useCallback((
    contractAddress: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _eventNames?: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback?: (event: unknown) => void
  ) => {
    // Note: eventNames filtering would need to be implemented in the callback
    // For now, just subscribe to all events from the contract
    console.log('Subscribing to contract:', contractAddress);
    wsSubscribe(contractAddress);
    
    // Return a dummy subscription ID for compatibility
    return `sub_${contractAddress}`;
  }, [wsSubscribe]);

  const subscribeToChatApp = useCallback((callback: (event: unknown) => void) => {
    return subscribeToContract(CONTRACTS.ChatApp, undefined, callback);
  }, [subscribeToContract]);

  const unsubscribe = useCallback((subscriptionId: string) => {
    // Extract address from subscription ID
    const address = subscriptionId.replace('sub_', '');
    unsubscribeFromContract(address);
  }, [unsubscribeFromContract]);

  const disconnect = useCallback(() => {
    // Client disconnection is handled automatically
    console.log('Disconnect requested (handled by WebSocketProvider)');
  }, []);

  return {
    isConnected,
    error,
    subscribeToContract,
    subscribeToChatApp,
    unsubscribe,
    disconnect,
    client
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