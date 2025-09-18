'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Event {
  id: number;
  type: string;
  timestamp: Date;
  data: any;
}

export function EventLogger() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    // Mock event generation for demo
    const mockEvents: Event[] = [
      {
        id: 1,
        type: 'connect',
        timestamp: new Date(Date.now() - 10000),
        data: { address: '0x1234...', network: 'RISE Testnet' },
      },
      {
        id: 2,
        type: 'transaction',
        timestamp: new Date(Date.now() - 5000),
        data: { hash: '0xabc...', status: 'pending' },
      },
      {
        id: 3,
        type: 'signature',
        timestamp: new Date(Date.now() - 2000),
        data: { message: 'Hello World', signature: '0xdef...' },
      },
    ];
    setEvents(mockEvents);
  }, []);

  const clearEvents = () => {
    setEvents([]);
  };

  const exportEvents = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `porto-events-${Date.now()}.json`;
    a.click();
  };

  const filteredEvents = filter === 'all'
    ? events
    : events.filter(e => e.type === filter);

  const eventTypes = ['all', 'connect', 'transaction', 'signature', 'error'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Event Logger
        </h3>
        <div className="flex gap-2">
          <Button onClick={clearEvents} variant="outline" size="sm">
            Clear
          </Button>
          <Button onClick={exportEvents} variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {eventTypes.map(type => (
          <Button
            key={type}
            onClick={() => setFilter(type)}
            variant={filter === type ? 'default' : 'outline'}
            size="sm"
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
            {type !== 'all' && (
              <span className="ml-1">
                ({events.filter(e => e.type === type).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No events to display
          </p>
        ) : (
          filteredEvents.map(event => (
            <div
              key={event.id}
              className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-sm"
            >
              <div className="flex justify-between mb-1">
                <span className={`
                  font-medium px-2 py-0.5 rounded text-xs
                  ${event.type === 'connect' ? 'bg-green-200 text-green-800' : ''}
                  ${event.type === 'transaction' ? 'bg-blue-200 text-blue-800' : ''}
                  ${event.type === 'signature' ? 'bg-purple-200 text-purple-800' : ''}
                  ${event.type === 'error' ? 'bg-red-200 text-red-800' : ''}
                `}>
                  {event.type.toUpperCase()}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  {event.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {events.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Total Events
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {events.filter(e => e.type === 'transaction').length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Transactions
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            {events.filter(e => e.type === 'signature').length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Signatures
          </p>
        </div>
      </div>
    </div>
  );
}