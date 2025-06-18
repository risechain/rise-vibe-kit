'use client';

import { formatDistanceToNow } from 'date-fns';

export interface Message {
  user: string;
  userId: string;
  message: string;
  msgId: string;
  txHash: string;
  timestamp: Date;
}

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
  onGiveKarma?: (msgId: string) => void;
  onTakeKarma?: (msgId: string) => void;
}

export function MessageItem({ 
  message, 
  isOwnMessage, 
  onGiveKarma, 
  onTakeKarma 
}: MessageItemProps) {
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md ${
        isOwnMessage 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
      } rounded-lg px-4 py-2`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm">{message.userId}</span>
          <span className="text-xs opacity-75 ml-2">
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </span>
        </div>
        <p className="break-words">{message.message}</p>
        
        {/* Karma buttons - only for other users' messages */}
        {!isOwnMessage && onGiveKarma && onTakeKarma && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20">
            <button
              onClick={() => onGiveKarma(message.msgId)}
              className="text-xs hover:scale-110 transition-transform"
              title="Give karma"
            >
              👍
            </button>
            <button
              onClick={() => onTakeKarma(message.msgId)}
              className="text-xs hover:scale-110 transition-transform"
              title="Take karma"
            >
              👎
            </button>
            <a
              href={`https://explorer.testnet.riselabs.xyz/tx/${message.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:underline opacity-75"
            >
              tx
            </a>
          </div>
        )}
      </div>
    </div>
  );
}