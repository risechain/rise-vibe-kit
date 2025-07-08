'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { contracts, ContractName, getContract } from '@/contracts/contracts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { createPublicClient, http } from 'viem';
import { riseTestnet } from '@/lib/wagmi-config';
import { toast } from '@/lib/toast-manager';
import { appConfig } from '@/config/app';

type ContractEvent = {
  args: Record<string, unknown>;
  blockNumber?: bigint;
  transactionHash?: string;
  logIndex?: number;
  eventName?: string;
};

export default function EventsPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [selectedContract, setSelectedContract] = useState<string>('all');
  const [showAllEventTypes, setShowAllEventTypes] = useState(false);
  const [autoScrollDisabled, setAutoScrollDisabled] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const maxEvents = 100; // Keep last 100 events
  
  // Historical events state
  const [historicalEvents, setHistoricalEvents] = useState<ContractEvent[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [blockRange, setBlockRange] = useState<{
    blocksBack: number;
    batchSize: number;
  }>({
    blocksBack: 100,
    batchSize: 20
  });
  const [selectedEventForHistory, setSelectedEventForHistory] = useState<string>('all');

  // Use the centralized WebSocket provider's events
  const { contractEvents, isConnected } = useWebSocket();
  
  // Paused events - events captured when paused
  const [pausedEvents, setPausedEvents] = useState<typeof contractEvents>([]);
  const pauseSnapshotRef = useRef<typeof contractEvents>([]);
  const pausedAtCountRef = useRef(0);
  
  // Default hidden event types (can be toggled)
  const [hiddenEventTypes, setHiddenEventTypes] = useState<Set<string>>(
    new Set(['Transfer', 'Approval', 'PriceUpdated']) // Hide common ERC20 events and PriceUpdated by default
  );
  
  // Handle pause toggle
  const handlePauseToggle = () => {
    if (!isPaused) {
      // About to pause - capture current state
      pauseSnapshotRef.current = [...contractEvents];
      pausedAtCountRef.current = contractEvents.length;
      setPausedEvents([...contractEvents]);
    } else {
      // About to resume - clear paused state
      setPausedEvents([]);
      pauseSnapshotRef.current = [];
      pausedAtCountRef.current = 0;
    }
    setIsPaused(!isPaused);
  };
  
  // Use paused events when paused, otherwise use live events
  const displayEvents = isPaused ? pausedEvents : contractEvents;
  const newEventCount = isPaused ? contractEvents.length - pausedAtCountRef.current : 0;
  
  // Keep only the last maxEvents and add timestamps if missing
  const events = displayEvents
    .slice(-maxEvents)
    .map(event => ({
      ...event,
      timestamp: event.timestamp || new Date()
    }));

  // Auto-scroll to bottom only when new events arrive (not on initial load)
  const prevEventsLength = useRef(0);
  useEffect(() => {
    // Check if auto-scroll should be disabled based on threshold
    if (events.length >= appConfig.debug.autoScrollThreshold && !autoScrollDisabled) {
      setAutoScrollDisabled(true);
    }
    
    // Auto-scroll if enabled and not paused
    if (appConfig.debug.autoScroll && 
        !isPaused && 
        !autoScrollDisabled &&
        events.length > prevEventsLength.current && 
        prevEventsLength.current > 0) {
      eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevEventsLength.current = events.length;
  }, [events.length, isPaused, autoScrollDisabled]);

  const filteredEvents = events.filter(event => {
    // Filter out hidden event types
    if (event.eventName && hiddenEventTypes.has(event.eventName)) {
      return false;
    }
    
    // Filter by contract
    if (selectedContract !== 'all') {
      const contractAddress = contracts[selectedContract as ContractName]?.address;
      if (event.address?.toLowerCase() !== contractAddress?.toLowerCase()) {
        return false;
      }
    }
    
    // Filter by event type
    if (filter === 'all') return true;
    return event.eventName === filter;
  });

  // Dynamically get all event types from selected contract or all contracts
  const getEventTypes = () => {
    const baseTypes = ['all'];
    
    if (selectedContract === 'all') {
      // Get all unique event names from all contracts
      const allEventNames = new Set<string>();
      Object.values(contracts).forEach(contract => {
        contract.abi.forEach((item) => {
          if (item.type === 'event' && 'name' in item && item.name) {
            allEventNames.add(item.name);
          }
        });
      });
      return [...baseTypes, ...Array.from(allEventNames).sort()];
    } else {
      // Get event names from selected contract
      const contract = contracts[selectedContract as ContractName];
      const eventNames = contract.abi
        .filter((item) => item.type === 'event' && 'name' in item && item.name)
        .map((item) => 'name' in item && item.name ? item.name : '')
        .filter((name): name is string => name !== '')
        .sort();
      return [...baseTypes, ...eventNames];
    }
  };
  
  const eventTypes = getEventTypes();

  const clearEvents = () => {
    // Can't clear centralized events - maybe show a message
    console.log('Events are managed centrally and cannot be cleared from this page');
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `rise-events-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getPublicClient = () => {
    return createPublicClient({
      chain: riseTestnet,
      transport: http('https://testnet.riselabs.xyz'),
    });
  };

  const fetchHistoricalEvents = async () => {
    if (!selectedContract || selectedContract === 'all') {
      toast.error('Please select a specific contract');
      return;
    }
    
    setIsLoadingHistory(true);
    setHistoricalEvents([]);
    
    try {
      const contract = getContract(selectedContract as ContractName);
      const publicClient = getPublicClient();
      const currentBlock = await publicClient.getBlockNumber();
      
      // Calculate batches
      const totalBlocks = blockRange.blocksBack;
      const batchSize = blockRange.batchSize;
      const batches = Math.ceil(totalBlocks / batchSize);
      
      // Get all event ABIs or filter by selected
      const eventAbis = contract.abi.filter((item) => {
        if (item.type !== 'event') return false;
        if (selectedEventForHistory === 'all') return true;
        return item.name === selectedEventForHistory;
      });
      
      if (eventAbis.length === 0) {
        throw new Error('No events found');
      }
      
      const allEvents: ContractEvent[] = [];
      
      // Fetch events in batches
      for (let i = 0; i < batches; i++) {
        const fromBlock = currentBlock - BigInt(Math.min((i + 1) * batchSize, totalBlocks));
        const toBlock = currentBlock - BigInt(i * batchSize);
        
        console.log(`Fetching batch ${i + 1}/${batches}: blocks ${fromBlock} to ${toBlock}`);
        
        // Fetch events for each event type
        for (const eventAbi of eventAbis) {
          const events = await publicClient.getContractEvents({
            address: contract.address as `0x${string}`,
            abi: [eventAbi],
            eventName: eventAbi.name,
            fromBlock,
            toBlock,
          }) as unknown as Array<{
            args: Record<string, unknown>;
            blockNumber: bigint;
            transactionHash: string;
            logIndex: number;
          }>;
          
          // Transform viem events to our ContractEvent type
          const transformedEvents = events.map(event => ({
            args: event.args,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            logIndex: event.logIndex,
            eventName: eventAbi.name,
          }));
          
          allEvents.push(...transformedEvents);
        }
        
        // Update UI with partial results
        setHistoricalEvents([...allEvents]);
        
        // Add small delay between batches to avoid rate limiting
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Sort by block number
      allEvents.sort((a, b) => {
        const blockA = a.blockNumber || BigInt(0);
        const blockB = b.blockNumber || BigInt(0);
        return Number(blockB - blockA);
      });
      
      setHistoricalEvents(allEvents);
      toast.success(`Fetched ${allEvents.length} historical events`);
    } catch (error) {
      console.error('Error fetching historical events:', error);
      toast.error('Failed to fetch historical events');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Explanatory Note */}
          <Card className="p-4 mb-6">
            <p className="text-sm text-gray-500">
              These real-time events are streamed directly from the RISE chain via a
              WebSocket connection (`rise_subscribe`).
            </p>
          </Card>

          {/* Controls */}
          <Card className="p-4 mb-6">
            <div className="space-y-4">
              {/* Connection Status and Actions */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  
                  <Button
                    variant={isPaused ? 'default' : 'outline'}
                    size="sm"
                    onClick={handlePauseToggle}
                  >
                    {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                  </Button>
                  
                  {autoScrollDisabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-yellow-600 dark:text-yellow-400">
                        Auto-scroll disabled ({events.length} events)
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAutoScrollDisabled(false)}
                      >
                        Re-enable
                      </Button>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearEvents}
                  >
                    Clear
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportEvents}
                    disabled={events.length === 0}
                  >
                    Export
                  </Button>
                </div>
              </div>
              
              {/* Filters */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 min-w-[80px]">Contract:</span>
                  <select
                    value={selectedContract}
                    onChange={(e) => {
                      setSelectedContract(e.target.value);
                      setFilter('all'); // Reset event filter when changing contract
                      setShowAllEventTypes(false);
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">All Contracts</option>
                    {Object.keys(contracts).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Event Type:</span>
                    {eventTypes.length > 6 && (
                      <button
                        onClick={() => setShowAllEventTypes(!showAllEventTypes)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {showAllEventTypes ? 'Show Less' : `Show All (${eventTypes.length})`}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(showAllEventTypes ? eventTypes : eventTypes.slice(0, 6)).map(type => (
                      <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`px-2 py-1 text-xs rounded ${
                          filter === type 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Hidden Event Types */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Hidden Events:</span>
                    <span className="text-xs text-gray-400">Click to toggle</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['Transfer', 'Approval', 'PriceUpdated', 'OwnershipTransferred'].map(eventType => (
                      <button
                        key={eventType}
                        onClick={() => {
                          const newHidden = new Set(hiddenEventTypes);
                          if (newHidden.has(eventType)) {
                            newHidden.delete(eventType);
                          } else {
                            newHidden.add(eventType);
                          }
                          setHiddenEventTypes(newHidden);
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          hiddenEventTypes.has(eventType)
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 line-through' 
                            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}
                      >
                        {eventType}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              <p>Events: {filteredEvents.length} / {events.length} total</p>
              {isPaused && (
                <p className="text-yellow-600 dark:text-yellow-400">
                  ⏸️ Paused - {newEventCount} new events waiting
                </p>
              )}
              {selectedContract !== 'all' && (
                <p>Contract: {contracts[selectedContract as ContractName]?.address}</p>
              )}
            </div>
          </Card>

          {/* Event Stream */}
          <Card className="h-[600px] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold">Real-time Event Stream</h2>
              <p className="text-sm text-gray-500">
                Live blockchain events via WebSocket subscription
              </p>
            </div>
            
            <div className="h-[calc(100%-80px)] overflow-y-auto p-4 space-y-2 font-mono text-sm">
              {filteredEvents.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {isConnected ? 'Waiting for events...' : 'Connect WebSocket to see events'}
                </div>
              ) : (
                filteredEvents.map((event, index) => (
                  <div 
                    key={`${event.transactionHash}-${index}`}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Event Name */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                            // ChatApp events
                            event.eventName === 'MessageSent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            event.eventName === 'UserRegistered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            event.eventName === 'KarmaChanged' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            // RicePet events
                            event.eventName === 'PetCreated' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' :
                            event.eventName === 'PetFed' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                            event.eventName === 'PetPlayed' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' :
                            event.eventName === 'PetLevelUp' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            event.eventName === 'BattleResult' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            // TokenLaunchpad events
                            event.eventName === 'TokenLaunched' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' :
                            event.eventName === 'TokenTraded' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' :
                            event.eventName === 'TokenGraduated' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {event.eventName || 'Unknown'}
                          </span>
                          {/* Show contract name if we have multiple contracts */}
                          {Object.keys(contracts).length > 1 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                              {Object.entries(contracts).find(([, contract]) => 
                                contract.address.toLowerCase() === event.address?.toLowerCase()
                              )?.[0] || 'Unknown Contract'}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        
                        {/* Event Data */}
                        {event.decoded && event.args && (
                          <div className="text-xs space-y-0.5 mb-2">
                            {/* ChatApp Events */}
                            {event.eventName === 'MessageSent' && (
                              <>
                                <p>User: {event.args.userId} ({event.args.user?.slice(0, 8)}...)</p>
                                <p>Message: &quot;{event.args.message}&quot;</p>
                                <p>ID: {event.args.msgId?.toString()}</p>
                              </>
                            )}
                            {event.eventName === 'UserRegistered' && (
                              <>
                                <p>User: {event.args.userId}</p>
                                <p>Address: {event.args.user}</p>
                              </>
                            )}
                            {event.eventName === 'KarmaChanged' && (
                              <>
                                <p>User: {event.args.userId}</p>
                                <p>Karma: {event.args.karma?.toString()}</p>
                              </>
                            )}
                            
                            {/* RicePet Events */}
                            {event.eventName === 'PetCreated' && (
                              <>
                                <p>Owner: {(event.args.owner as string)?.slice(0, 8)}...</p>
                                <p>Pet Name: {event.args.name as string}</p>
                              </>
                            )}
                            {event.eventName === 'PetFed' && (
                              <>
                                <p>Owner: {(event.args.owner as string)?.slice(0, 8)}...</p>
                                <p>New Hunger: {String(event.args.newHunger)}</p>
                              </>
                            )}
                            {event.eventName === 'PetPlayed' && (
                              <>
                                <p>Owner: {(event.args.owner as string)?.slice(0, 8)}...</p>
                                <p>New Happiness: {String(event.args.newHappiness)}</p>
                              </>
                            )}
                            {event.eventName === 'PetLevelUp' && (
                              <>
                                <p>Owner: {(event.args.owner as string)?.slice(0, 8)}...</p>
                                <p>New Level: {String(event.args.newLevel)}</p>
                              </>
                            )}
                            {event.eventName === 'BattleResult' && (
                              <>
                                <p>Winner: {(event.args.winner as string)?.slice(0, 8)}...</p>
                                <p>Loser: {(event.args.loser as string)?.slice(0, 8)}...</p>
                                <p>Request ID: {String(event.args.requestId)}</p>
                              </>
                            )}
                            
                            {/* TokenLaunchpad Events */}
                            {event.eventName === 'TokenLaunched' && (
                              <>
                                <p>Token: {(event.args.tokenAddress as string)?.slice(0, 8)}...</p>
                                <p>Creator: {(event.args.creator as string)?.slice(0, 8)}...</p>
                                <p>Name: {event.args.name as string}</p>
                                <p>Symbol: {event.args.symbol as string}</p>
                              </>
                            )}
                            {event.eventName === 'TokenTraded' && (
                              <>
                                <p>Token: {(event.args.token as string)?.slice(0, 8)}...</p>
                                <p>Trader: {(event.args.trader as string)?.slice(0, 8)}...</p>
                                <p>Type: {event.args.isBuy ? 'Buy' : 'Sell'}</p>
                                <p>ETH: {String(event.args.ethAmount)}</p>
                                <p>Tokens: {String(event.args.tokenAmount)}</p>
                              </>
                            )}
                            {event.eventName === 'TokenGraduated' && (
                              <>
                                <p>Token: {(event.args.token as string)?.slice(0, 8)}...</p>
                                <p>Total Raised: {String(event.args.totalRaised)}</p>
                              </>
                            )}
                            
                            {/* Generic display for unknown events */}
                            {!['MessageSent', 'UserRegistered', 'KarmaChanged', 'PetCreated', 'PetFed', 
                              'PetPlayed', 'PetLevelUp', 'BattleResult', 'TokenLaunched', 'TokenTraded', 
                              'TokenGraduated'].includes(event.eventName || '') && (
                              <>
                                {Object.entries(event.args).map(([key, value]) => (
                                  <p key={key}>{key}: {value?.toString()}</p>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Transaction Info */}
                        <div className="text-xs text-gray-500">
                          <a
                            href={`https://explorer.testnet.riselabs.xyz/tx/${event.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            tx: {event.transactionHash.slice(0, 10)}...
                          </a>
                          {event.blockNumber && (
                            <span className="ml-2">
                              block: {parseInt(event.blockNumber, 16)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Raw Data Toggle */}
                      <details className="ml-4">
                        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                          Raw
                        </summary>
                        <pre className="mt-2 text-xs overflow-auto max-w-xs">
                          {JSON.stringify({
                            topics: event.topics,
                            data: event.data,
                            decoded: event.decoded
                          }, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                ))
              )}
              <div ref={eventsEndRef} />
            </div>
          </Card>

          {/* Info Card */}
          <Card className="mt-6 p-6">
            <h3 className="font-semibold mb-2">About rise_subscribe</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>
                This page demonstrates RISE&apos;s WebSocket subscription API that provides real-time blockchain events.
              </p>
              <p>
                Events are pushed immediately as transactions are processed, enabling ultra-low latency applications.
              </p>
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs">
                <p className="text-gray-500 mb-2"># WebSocket subscription request</p>
                <pre>{`{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "rise_subscribe",
  "params": ["logs", { "address": "CONTRACT_ADDRESS" }]
}`}</pre>
              </div>
            </div>
          </Card>

          {/* Historical Events Lookup */}
          <Card className="mt-6 p-6">
            <h2 className="text-lg font-bold mb-4">Historical Events</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Contract
                  </label>
                  <select
                    value={selectedContract}
                    onChange={(e) => setSelectedContract(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">Select a contract</option>
                    {Object.keys(contracts).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Event Type
                  </label>
                  <select
                    value={selectedEventForHistory}
                    onChange={(e) => setSelectedEventForHistory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    disabled={!selectedContract || selectedContract === 'all'}
                  >
                    <option value="all">All events</option>
                    {selectedContract && selectedContract !== 'all' && 
                      getContract(selectedContract as ContractName).abi
                        .filter((item) => item.type === 'event' && item.name)
                        .map((event) => (
                          <option key={event.name} value={event.name}>
                            {event.name}
                          </option>
                        ))
                    }
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Blocks to Look Back
                  </label>
                  <Input
                    type="number"
                    value={blockRange.blocksBack}
                    onChange={(e) => setBlockRange({
                      ...blockRange,
                      blocksBack: parseInt(e.target.value) || 0
                    })}
                    min="1"
                    max="1000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Batch Size (max 20)
                  </label>
                  <Input
                    type="number"
                    value={blockRange.batchSize}
                    onChange={(e) => setBlockRange({
                      ...blockRange,
                      batchSize: Math.min(20, parseInt(e.target.value) || 20)
                    })}
                    min="1"
                    max="20"
                  />
                </div>
              </div>
              
              <Button
                onClick={fetchHistoricalEvents}
                disabled={isLoadingHistory || !selectedContract || selectedContract === 'all'}
                className="w-full"
              >
                {isLoadingHistory ? 'Loading Events...' : 'Fetch Historical Events'}
              </Button>
              
              {historicalEvents.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Found {historicalEvents.length} events</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const dataStr = JSON.stringify(historicalEvents, null, 2);
                        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                        const exportFileDefaultName = `historical-events-${Date.now()}.json`;
                        const linkElement = document.createElement('a');
                        linkElement.setAttribute('href', dataUri);
                        linkElement.setAttribute('download', exportFileDefaultName);
                        linkElement.click();
                      }}
                    >
                      Export Historical
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {historicalEvents.map((event, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                event.eventName === 'MessageSent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                event.eventName === 'UserRegistered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                event.eventName === 'KarmaChanged' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}>
                                {event.eventName || 'Unknown'}
                              </span>
                              <span className="font-mono text-xs">
                                Block #{event.blockNumber?.toString()}
                              </span>
                            </div>
                            
                            {/* Event Data */}
                            <div className="text-xs space-y-0.5 mb-2">
                              {event.eventName === 'MessageSent' && (
                                <>
                                  <p>User: {String(event.args.userId)} ({(event.args.user as string)?.slice(0, 8)}...)</p>
                                  <p>Message: &quot;{String(event.args.message)}&quot;</p>
                                  <p>ID: {String(event.args.msgId)}</p>
                                </>
                              )}
                              {event.eventName === 'UserRegistered' && (
                                <>
                                  <p>User: {String(event.args.userId)}</p>
                                  <p>Address: {String(event.args.user)}</p>
                                </>
                              )}
                              {event.eventName === 'KarmaChanged' && (
                                <>
                                  <p>User: {String(event.args.userId)}</p>
                                  <p>Karma: {String(event.args.karma)}</p>
                                </>
                              )}
                            </div>
                            
                            {/* Transaction Info */}
                            <div className="text-xs text-gray-500">
                              <a
                                href={`https://explorer.testnet.riselabs.xyz/tx/${event.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                tx: {event.transactionHash?.slice(0, 10)}...
                              </a>
                            </div>
                          </div>
                          
                          {/* Raw Data Toggle */}
                          <details className="ml-4">
                            <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                              Raw
                            </summary>
                            <pre className="mt-2 text-xs overflow-auto max-w-xs">
                              {JSON.stringify(event.args, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
    </div>
  );
}