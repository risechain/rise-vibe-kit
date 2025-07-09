'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useChatAppContract } from '@/hooks/chat/useChatAppContract';
import { Card } from '@/components/ui/card';
import { toast } from '@/lib/toast-manager';
import { useAccount } from 'wagmi';

// Import modular components
import { RegistrationForm } from './chat/RegistrationForm';
import { ChatHeader } from './chat/ChatHeader';
import { MessageList } from './chat/MessageList';
import { MessageInput } from './chat/MessageInput';
import { KarmaFeed, type KarmaUpdate } from './chat/KarmaFeed';
import type { Message } from './chat/MessageItem';

interface ChatInterfaceProps {
  address: string;
}

export function ChatInterface({ address }: ChatInterfaceProps) {
  const [username, setUsername] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const hasJustRegisteredRef = useRef(false);
  
  // Removed transaction confirmation state - using toasts instead
  
  const { connector } = useAccount();
  
  // Get raw events from WebSocket provider
  const { contractEvents, isConnected } = useWebSocket();
  
  // Process messages from contract events
  const messages: Message[] = contractEvents
    .filter(event => event.decoded && event.eventName === 'MessageSent')
    .map(event => ({
      user: event.args?.user || '',
      userId: event.args?.userId || '',
      message: event.args?.message || '',
      msgId: event.args?.msgId?.toString() || '0',
      txHash: event.transactionHash || '',
      timestamp: event.timestamp || new Date()
    }));
    
  // Process user registrations (commented out as we handle registration state directly now)
  // const userRegistrations = contractEvents
  //   .filter(event => event.decoded && event.eventName === 'UserRegistered')
  //   .map(event => ({
  //     user: event.args?.user || '',
  //     userId: event.args?.userId || '',
  //     txHash: event.transactionHash || '',
  //     timestamp: event.timestamp || new Date()
  //   }));
    
  // Process karma updates  
  const karmaUpdates: KarmaUpdate[] = contractEvents
    .filter(event => event.decoded && event.eventName === 'KarmaChanged')
    .map(event => ({
      user: event.args?.user || '',
      userId: event.args?.userId || '',
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

  // Check if user is registered on initial load
  useEffect(() => {
    const checkUserRegistration = async () => {
      if (address && !hasJustRegisteredRef.current && !isRegistered) {
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
  }, [address, checkRegistration, getUserId, isRegistered]); // Added isRegistered dependency

  // Backup check for embedded wallet registration (only if not already registered)
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (address && !isRegistered && connector?.id === 'embedded-wallet' && !hasJustRegisteredRef.current) {
        console.log('🔄 Backup registration check for embedded wallet');
        try {
          const registered = await checkRegistration(address);
          console.log('📋 Backup check result:', registered);
          if (registered) {
            setIsRegistered(true);
            const userId = await getUserId(address);
            setUsername(userId);
          }
        } catch (error) {
          console.warn('Failed to check registration status:', error);
        }
      }
    };
    
    // Only run backup check if not registered and not just registered
    if (!isRegistered && !hasJustRegisteredRef.current) {
      const timeoutId = setTimeout(checkRegistrationStatus, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [address, connector?.id, checkRegistration, getUserId, isRegistered]); // Added isRegistered dependency

  const handleRegister = async (usernameInput: string) => {
    if (!usernameInput.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsRegistering(true);
    try {
      const result = await registerUser(usernameInput);
      setUsername(usernameInput); // Save the username in parent state
      console.log('📝 Registration result:', result);
      
      // For embedded wallet, immediately update state since transaction is confirmed
      if (result?.isSync) {
        console.log('✅ Sync transaction detected, updating state immediately');
        hasJustRegisteredRef.current = true;
        setIsRegistered(true);
        // Username is already set from the input, no need to change it
        toast.success('Registration successful!');
        
        // Reset the flag after a delay to allow future checks
        setTimeout(() => {
          hasJustRegisteredRef.current = false;
        }, 5000);
      } else {
        // For MetaMask, transaction is already confirmed when we reach here
        console.log('✅ Async transaction confirmed, updating state');
        hasJustRegisteredRef.current = true;
        setIsRegistered(true);
        toast.success('Registration successful!');
        
        // Reset the flag after a delay to allow future checks
        setTimeout(() => {
          hasJustRegisteredRef.current = false;
        }, 5000);
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
      // For embedded wallet, transaction is instantly confirmed
      const isEmbeddedWallet = connector?.id === 'embedded-wallet';
      
      if (isEmbeddedWallet) {
        // Show pending toast
        const toastId = toast.info('Sending message...', { autoClose: false });
        
        // Sync transaction - instant confirmation
        await sendContractMessage(message);
        const duration = Date.now() - startTime;
        
        // Update toast to success
        toast.update(toastId, {
          render: `Message sent! Confirmed in ${duration}ms`,
          type: 'success',
          autoClose: 5000
        });
      } else {
        // Regular transaction flow for MetaMask
        const toastId = toast.info('Confirm transaction in wallet...', { autoClose: false });
        
        await sendContractMessage(message);
        const duration = Date.now() - startTime;
        
        // Update toast to success
        toast.update(toastId, {
          render: `Message sent! Confirmed in ${duration}ms`,
          type: 'success',
          autoClose: 5000
        });
      }
    } catch (error) {
      console.error('Send message error:', error);
      
      // Handle user rejection
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

  // Registration UI
  console.log('🔍 ChatInterface render - isRegistered:', isRegistered, 'address:', address);
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
          isConnected={isConnected}
          messageCount={messages.length}
          username={username}
          address={address}
        />

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
    </div>
  );
}