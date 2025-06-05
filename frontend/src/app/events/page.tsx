'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { contracts, ContractName } from '@/contracts/contracts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';


export default function EventsPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [selectedContract, setSelectedContract] = useState<string>('all');
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const maxEvents = 100; // Keep last 100 events

  // Use the centralized WebSocket provider's events
  const { contractEvents, isConnected } = useWebSocket();
  
  // Keep only the last maxEvents and add timestamps if missing
  const events = contractEvents
    .slice(-maxEvents)
    .map(event => ({
      ...event,
      timestamp: event.timestamp || new Date()
    }));

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isPaused) {
      eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, isPaused]);

  const filteredEvents = events.filter(event => {
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

  const eventTypes = ['all', 'UserRegistered', 'MessageSent', 'KarmaChanged'];

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

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Controls */}
          <Card className="p-4 mb-6">
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
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                </Button>
                
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
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Contract:</span>
                  <select
                    value={selectedContract}
                    onChange={(e) => setSelectedContract(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">All Contracts</option>
                    {Object.keys(contracts).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Event:</span>
                  {eventTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setFilter(type)}
                      className={`px-3 py-1 text-sm rounded ${
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
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              <p>Events: {filteredEvents.length} / {events.length} total</p>
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
                            event.eventName === 'MessageSent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            event.eventName === 'UserRegistered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            event.eventName === 'KarmaChanged' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
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
        </div>
    </div>
  );
}