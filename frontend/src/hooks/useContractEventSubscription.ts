import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { ContractEvent } from '@/types/contracts';
import { ContractName, getContract } from '@/contracts/contracts';

/**
 * Hook for subscribing to specific contract events
 * Provides filtered events and callback handling for contract-specific event subscriptions
 * 
 * @param contractName - Name of the contract from contracts.ts
 * @param eventName - Optional specific event name to filter
 * @param callback - Optional callback function for each matching event
 * @returns Filtered events array for the specified contract/event
 * 
 * @example
 * // Subscribe to all events from a contract
 * const events = useContractEventSubscription('ChatApp');
 * 
 * @example
 * // Subscribe to specific event with callback
 * const messageEvents = useContractEventSubscription('ChatApp', 'MessageSent', (event) => {
 *   console.log('New message:', event.args);
 * });
 */
export function useContractEventSubscription(
  contractName: ContractName,
  eventName?: string,
  callback?: (event: ContractEvent) => void
) {
  const { contractEvents, subscribeToContract, getContractEvents } = useWebSocket();
  const contract = getContract(contractName);
  const callbackRef = useRef(callback);
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Subscribe to contract on mount
  useEffect(() => {
    subscribeToContract(contract.address);
  }, [contract.address, subscribeToContract]);
  
  // Get filtered events for this contract
  const filteredEvents = useCallback(() => {
    let events = getContractEvents(contract.address);
    
    // Further filter by event name if specified
    if (eventName) {
      events = events.filter(e => e.eventName === eventName);
    }
    
    return events;
  }, [contract.address, eventName, getContractEvents]);
  
  // Process new events with callback
  useEffect(() => {
    if (!callbackRef.current) return;
    
    const events = filteredEvents();
    const processedEventsRef = new Set<string>();
    
    events.forEach(event => {
      const eventId = `${event.transactionHash}-${event.logIndex}`;
      if (!processedEventsRef.has(eventId)) {
        processedEventsRef.add(eventId);
        callbackRef.current?.(event);
      }
    });
  }, [contractEvents, filteredEvents]);
  
  return filteredEvents();
}

/**
 * Hook for subscribing to multiple events from a contract
 * 
 * @param contractName - Name of the contract
 * @param eventHandlers - Map of event names to handler functions
 * 
 * @example
 * useContractEventHandlers('ChatApp', {
 *   MessageSent: (event) => console.log('Message sent:', event),
 *   UserRegistered: (event) => console.log('User registered:', event),
 *   KarmaUpdated: (event) => console.log('Karma updated:', event)
 * });
 */
export function useContractEventHandlers(
  contractName: ContractName,
  eventHandlers: Record<string, (event: ContractEvent) => void>
) {
  const { contractEvents, subscribeToContract } = useWebSocket();
  const contract = getContract(contractName);
  const handlersRef = useRef(eventHandlers);
  const processedEventsRef = useRef(new Set<string>());
  
  // Keep handlers ref updated
  useEffect(() => {
    handlersRef.current = eventHandlers;
  }, [eventHandlers]);
  
  // Subscribe to contract
  useEffect(() => {
    subscribeToContract(contract.address);
  }, [contract.address, subscribeToContract]);
  
  // Process events
  useEffect(() => {
    const relevantEvents = contractEvents.filter(
      e => e.address?.toLowerCase() === contract.address.toLowerCase()
    );
    
    relevantEvents.forEach(event => {
      const eventId = `${event.transactionHash}-${event.logIndex}`;
      
      // Skip if already processed
      if (processedEventsRef.current.has(eventId)) return;
      
      // Mark as processed
      processedEventsRef.current.add(eventId);
      
      // Call appropriate handler if event has a name and handler exists
      if (event.eventName && handlersRef.current[event.eventName]) {
        handlersRef.current[event.eventName](event);
      }
    });
  }, [contractEvents, contract.address]);
}

/**
 * Hook for getting the latest event of a specific type
 * Useful for tracking state changes
 * 
 * @example
 * const latestMessage = useLatestContractEvent('ChatApp', 'MessageSent');
 */
export function useLatestContractEvent(
  contractName: ContractName,
  eventName: string
): ContractEvent | null {
  const events = useContractEventSubscription(contractName, eventName);
  return events.length > 0 ? events[events.length - 1] : null;
}