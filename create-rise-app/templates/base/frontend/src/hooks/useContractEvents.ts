import { useMemo } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { ContractName, getContract } from '@/contracts/contracts';

export function useContractEvents<T extends ContractName>(contractName: T) {
  const { contractEvents, isConnected } = useWebSocket();
  const contractInfo = getContract(contractName);

  // Filter events for this specific contract
  const events = useMemo(() => {
    return contractEvents.filter(event => 
      event.address?.toLowerCase() === contractInfo.address.toLowerCase()
    );
  }, [contractEvents, contractInfo.address]);

  // Get events by name
  const getEventsByName = (eventName: string) => {
    return events.filter(event => event.eventName === eventName);
  };

  // Get unique event names
  const eventNames = useMemo(() => {
    const names = new Set<string>();
    events.forEach(event => {
      if (event.eventName) names.add(event.eventName);
    });
    return Array.from(names);
  }, [events]);

  return {
    events,
    isConnected,
    getEventsByName,
    eventNames,
    contractAddress: contractInfo.address,
  };
}