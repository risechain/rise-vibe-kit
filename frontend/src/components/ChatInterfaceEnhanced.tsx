'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatAppContract } from '@/hooks/useChatAppContract';
import { useEventCache } from '@/hooks/useEventCache';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast-manager';
import { useAccount } from 'wagmi';

// Import modular components
import { RegistrationForm } from './chat/RegistrationForm';
import { ChatHeader } from './chat/ChatHeader';
import { MessageList } from './chat/MessageList';
import { MessageInput } from './chat/MessageInput';
import { KarmaFeed, type KarmaUpdate } from './chat/KarmaFeed';
import type { Message } from './chat/MessageItem';

interface ChatInterfaceEnhancedProps {
  address: string;
}

export function ChatInterfaceEnhanced({ address }: ChatInterfaceEnhancedProps) {
  const [username, setUsername] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // Removed unused showLoadMore state
  const hasJustRegisteredRef = useRef(false);
  
  const { connector } = useAccount();
  
  // Use event cache for messages
  const {
    events: messageEvents,
    isLoading: isLoadingMessages,
    fetchMore: fetchMoreMessages,
    hasMore: hasMoreMessages,
    cacheStats
  } = useEventCache('ChatApp', 'MessageSent', {
    autoFetch: true,
    blockRange: 500,
    cacheOptions: {
      storage: 'indexeddb',
      ttl: 10 * 60 * 1000, // 10 minutes
      maxSize: 1000
    },
    onNewEvent: (event) => {
      console.log('New message received:', event);
      toast.info('New message received!', { autoClose: 2000 });
    }
  });
  
  // Use event cache for user registrations
  const {
    events: registrationEvents
  } = useEventCache('ChatApp', 'UserRegistered', {
    autoFetch: true,
    cacheOptions: {
      storage: 'indexeddb'
    }
  });
  
  // Use event cache for karma updates
  const {
    events: karmaEvents
  } = useEventCache('ChatApp', 'KarmaChanged', {
    autoFetch: true,
    cacheOptions: {
      storage: 'memory', // Karma updates don't need persistence
      ttl: 5 * 60 * 1000 // 5 minutes
    }
  });
  
  // Process messages from cached events
  const messages: Message[] = messageEvents.map(event => ({
    user: event.args?.user as string || '',
    userId: event.args?.userId as string || '',
    message: event.args?.message as string || '',
    msgId: event.args?.msgId?.toString() || '0',
    txHash: event.transactionHash || '',
    timestamp: event.timestamp || new Date()
  }));
  
  // Process karma updates
  const karmaUpdates: KarmaUpdate[] = karmaEvents.map(event => ({
    user: event.args?.user as string || '',
    userId: event.args?.userId as string || '',
    karma: event.args?.karma?.toString() || '0',
    txHash: event.transactionHash || '',
    timestamp: event.timestamp || new Date()
  }));
  
  const { 
    checkRegistration, 
    registerUser, 
    sendMessage: sendContractMessage,
    giveKarma,
    takeKarma,
    getUserId
  } = useChatAppContract();

  // Check if user is registered
  useEffect(() => {
    const checkUserRegistration = async () => {
      if (address && !hasJustRegisteredRef.current) {
        console.log('🔍 Checking registration for address:', address);
        const registered = await checkRegistration(address);
        console.log('📋 Registration check result:', registered);
        setIsRegistered(registered);
        
        if (registered) {
          const userId = await getUserId(address);
          setUsername(userId);
        }
      }
    };
    
    checkUserRegistration();
  }, [address, checkRegistration, getUserId, registrationEvents]);

  const handleRegister = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsRegistering(true);
    try {
      const result = await registerUser(username);
      console.log('📝 Registration result:', result);
      
      if (result?.isSync) {
        console.log('✅ Sync transaction detected, updating state immediately');
        hasJustRegisteredRef.current = true;
        setIsRegistered(true);
        toast.success('Registration successful!');
        
        setTimeout(() => {
          hasJustRegisteredRef.current = false;
        }, 5000);
      } else {
        toast.success('Registration successful!');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      toast.error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);
    const startTime = Date.now();
    
    try {
      const isEmbeddedWallet = connector?.id === 'embedded-wallet';
      
      if (isEmbeddedWallet) {
        const toastId = toast.info('Sending message...', { autoClose: false });
        await sendContractMessage(message);
        const duration = Date.now() - startTime;
        
        toast.update(toastId, {
          render: `Message sent! Confirmed in ${duration}ms`,
          type: 'success',
          autoClose: 5000
        });
      } else {
        const toastId = toast.info('Confirm transaction in wallet...', { autoClose: false });
        await sendContractMessage(message);
        const duration = Date.now() - startTime;
        
        toast.update(toastId, {
          render: `Message sent! Confirmed in ${duration}ms`,
          type: 'success',
          autoClose: 5000
        });
      }
    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      if ((error as { code?: string }).code === 'ACTION_REJECTED' || errorMessage.includes('rejected')) {
        toast.error('Transaction cancelled');
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to send message');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleGiveKarma = async (msgId: string) => {
    try {
      await giveKarma(msgId);
      toast.success('Karma given! 👍');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update karma';
      toast.error(errorMessage);
    }
  };

  const handleTakeKarma = async (msgId: string) => {
    try {
      await takeKarma(msgId);
      toast.info('Karma removed 👎');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update karma';
      toast.error(errorMessage);
    }
  };

  const handleLoadMore = async () => {
    await fetchMoreMessages();
  };

  // Registration UI
  if (!isRegistered) {
    return (
      <RegistrationForm 
        onRegister={handleRegister}
        isLoading={isRegistering}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="h-[600px] flex flex-col">
        <ChatHeader
          isConnected={true}
          messageCount={messages.length}
          username={username}
          address={address}
        />

        {/* Load More Button */}
        {hasMoreMessages && (
          <div className="px-4 py-2 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={isLoadingMessages}
              className="w-full"
            >
              {isLoadingMessages ? 'Loading...' : 'Load More Messages'}
            </Button>
          </div>
        )}

        <MessageList
          messages={messages}
          currentUserAddress={address}
          onGiveKarma={handleGiveKarma}
          onTakeKarma={handleTakeKarma}
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isSending}
        />
      </Card>

      <KarmaFeed karmaUpdates={karmaUpdates} />
      
      {/* Cache Statistics (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-4 p-4 text-xs text-gray-500">
          <h4 className="font-semibold mb-2">Cache Stats</h4>
          <p>Storage: {cacheStats.storage}</p>
          <p>Cached Keys: {cacheStats.size}</p>
          <p>Keys: {cacheStats.keys.join(', ')}</p>
        </Card>
      )}
    </div>
  );
}