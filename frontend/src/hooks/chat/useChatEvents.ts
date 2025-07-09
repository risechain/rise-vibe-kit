import { useMemo } from 'react';
import { useContractEventSubscription, useContractEventHandlers } from '../useContractEventSubscription';
import { ContractEvent } from '@/types/contracts';

/**
 * Example hook demonstrating how to use contract event subscriptions
 * for the ChatApp contract specifically
 */
export function useChatEvents() {
  // Get all MessageSent events
  const messageEvents = useContractEventSubscription('ChatApp', 'MessageSent');
  
  // Get all UserRegistered events
  const registrationEvents = useContractEventSubscription('ChatApp', 'UserRegistered');
  
  // Get all KarmaUpdated events
  const karmaEvents = useContractEventSubscription('ChatApp', 'KarmaUpdated');
  
  // Process messages into a more usable format
  const messages = useMemo(() => {
    return messageEvents.map(event => ({
      user: event.args?.user || '',
      userId: event.args?.userId || '',
      message: event.args?.message || '',
      msgId: event.args?.msgId?.toString() || '0',
      txHash: event.transactionHash || '',
      timestamp: event.timestamp || new Date(),
      blockNumber: event.blockNumber
    }));
  }, [messageEvents]);
  
  // Process registrations
  const registrations = useMemo(() => {
    return registrationEvents.map(event => ({
      user: event.args?.user || '',
      userId: event.args?.userId || '',
      timestamp: event.timestamp || new Date()
    }));
  }, [registrationEvents]);
  
  // Process karma updates
  const karmaUpdates = useMemo(() => {
    return karmaEvents.map(event => ({
      user: event.args?.user || '',
      karma: event.args?.karma?.toString() || '0',
      timestamp: event.timestamp || new Date()
    }));
  }, [karmaEvents]);
  
  return {
    messages,
    registrations,
    karmaUpdates,
    // Raw events if needed
    messageEvents,
    registrationEvents,
    karmaEvents
  };
}

/**
 * Example of using event handlers for real-time notifications
 */
export function useChatNotifications(
  onNewMessage?: (event: ContractEvent) => void,
  onUserRegistered?: (event: ContractEvent) => void,
  onKarmaUpdate?: (event: ContractEvent) => void
) {
  useContractEventHandlers('ChatApp', {
    MessageSent: (event) => {
      console.log('New chat message:', event.args);
      onNewMessage?.(event);
    },
    UserRegistered: (event) => {
      console.log('New user registered:', event.args);
      onUserRegistered?.(event);
    },
    KarmaUpdated: (event) => {
      console.log('Karma updated:', event.args);
      onKarmaUpdate?.(event);
    }
  });
}