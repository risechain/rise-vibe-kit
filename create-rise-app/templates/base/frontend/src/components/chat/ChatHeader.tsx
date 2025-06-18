'use client';

interface ChatHeaderProps {
  isConnected: boolean;
  messageCount: number;
  username: string;
  address: string;
}

export function ChatHeader({ isConnected, messageCount, username, address }: ChatHeaderProps) {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chat Room</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'} • {messageCount} messages
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{username}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{address.slice(0, 6)}...{address.slice(-4)}</p>
        </div>
      </div>
    </div>
  );
}