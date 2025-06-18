'use client';

import { useWebSocket } from '@/providers/WebSocketProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function WebSocketTestPage() {
  const { isConnected, error, contractEvents, manager } = useWebSocket();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">WebSocket Connection Test</h1>
      
      <div className="grid gap-4">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </Badge>
              {manager && (
                <span className="text-sm text-gray-500">
                  Subscriptions: {manager.getSubscriptionCount()}
                </span>
              )}
            </div>
            {error ? (
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error: {String(error)}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Event Signatures */}
        <Card>
          <CardHeader>
            <CardTitle>Event Signatures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {manager && Object.entries(manager.getEventSignatures()).map(([name, hash]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{name}</span>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {hash}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Contract Events ({contractEvents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {contractEvents.length === 0 ? (
                <p className="text-gray-500">No events received yet...</p>
              ) : (
                contractEvents.slice(-10).reverse().map((event, index) => (
                  <div key={index} className="p-3 border rounded text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <Badge>{event.eventName || 'Unknown Event'}</Badge>
                      <span className="text-xs text-gray-500">
                        {event.decoded ? '✓ Decoded' : '✗ Raw'}
                      </span>
                    </div>
                    {event.decoded && event.args && (
                      <div className="text-xs space-y-1">
                        {Object.entries(event.args).map(([key, value]) => (
                          typeof value !== 'function' && (
                            <div key={key}>
                              <span className="font-medium">{key}:</span>{' '}
                              {String(value)}
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      TX: {event.transactionHash?.slice(0, 10)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}