'use client';

import { useWebSocket } from '@/providers/WebSocketProvider';
import { appConfig } from '@/config/app';

export function WebSocketStatus() {
  const { isConnected, error } = useWebSocket();

  // Don't render if showStatus is disabled
  if (!appConfig.websocket.showStatus) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-gray-700 dark:text-gray-300">
          WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      {error ? (
        <div className="mt-1 text-red-600 dark:text-red-400">
          {error instanceof Error ? error.message : 'Connection error'}
        </div>
      ) : null}
    </div>
  );
}