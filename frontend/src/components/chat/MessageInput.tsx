'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
}

export function MessageInput({ onSendMessage, isLoading = false }: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    
    await onSendMessage(message);
    setMessage(''); // Clear on successful send
  };

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex gap-2">
        <Input
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
          disabled={isLoading}
          className="flex-1"
        />
        <Button 
          onClick={handleSend} 
          disabled={isLoading || !message.trim()}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}