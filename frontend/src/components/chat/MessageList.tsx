'use client';

import { useEffect, useRef } from 'react';
import { MessageItem, type Message } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  currentUserAddress: string;
  onGiveKarma: (msgId: string) => void;
  onTakeKarma: (msgId: string) => void;
}

export function MessageList({ 
  messages, 
  currentUserAddress,
  onGiveKarma,
  onTakeKarma
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No messages yet. Be the first to say hello! 👋
        </div>
      ) : (
        messages.map((msg, index) => (
          <MessageItem
            key={`${msg.msgId}-${index}`}
            message={msg}
            isOwnMessage={msg.user.toLowerCase() === currentUserAddress.toLowerCase()}
            onGiveKarma={onGiveKarma}
            onTakeKarma={onTakeKarma}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}