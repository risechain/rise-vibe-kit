import { useMemo } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { ContractName, getContract, contracts } from '@/contracts/contracts';

export function useContractEvents<T extends ContractName | string>(contractName: T) {
  const { contractEvents, isConnected } = useWebSocket();
  
  // Try to get contract info, but handle case where contract doesn't exist yet
  const contractInfo = contractName in contracts ? getContract(contractName as ContractName) : null;

  // Filter events for this specific contract
  const events = useMemo(() => {
    if (!contractInfo) return []; // Return empty array if contract not found
    return contractEvents.filter(event => 
      event.address?.toLowerCase() === contractInfo.address.toLowerCase()
    );
  }, [contractEvents, contractInfo]);

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
    contractAddress: contractInfo?.address,
  };
}