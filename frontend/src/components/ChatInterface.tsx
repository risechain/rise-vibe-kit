'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useRiseContract } from '@/hooks/useRiseContract';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { TransactionConfirmation } from '@/components/TransactionConfirmation';
import { useAccount } from 'wagmi';

interface ChatInterfaceProps {
  address: string;
}

export function ChatInterface({ address }: ChatInterfaceProps) {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Transaction confirmation state
  const [txConfirmation, setTxConfirmation] = useState<{
    isOpen: boolean;
    status: 'pending' | 'confirming' | 'confirmed' | 'error';
    message: string;
    txHash?: string;
    error?: string;
    startTime?: number;
    duration?: number;
  }>({
    isOpen: false,
    status: 'pending',
    message: ''
  });
  
  const { connector } = useAccount();
  
  // Get raw events from WebSocket provider
  const { contractEvents, isConnected } = useWebSocket();
  
  // Process messages from contract events
  const messages = contractEvents
    .filter(event => event.decoded && event.eventName === 'MessageSent')
    .map(event => ({
      user: event.args?.user || '',
      userId: event.args?.userId || '',
      message: event.args?.message || '',
      msgId: event.args?.msgId?.toString() || '0',
      txHash: event.transactionHash || '',
      timestamp: event.timestamp || new Date()
    }));
    
  // Process user registrations
  const userRegistrations = contractEvents
    .filter(event => event.decoded && event.eventName === 'UserRegistered')
    .map(event => ({
      user: event.args?.user || '',
      userId: event.args?.userId || '',
      txHash: event.transactionHash || '',
      timestamp: event.timestamp || new Date()
    }));
    
  // Process karma updates  
  const karmaUpdates = contractEvents
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
  } = useRiseContract();

  // Check if user is registered
  useEffect(() => {
    const checkUserRegistration = async () => {
      if (address) {
        const registered = await checkRegistration(address);
        setIsRegistered(registered);
        
        if (registered) {
          const userId = await getUserId(address);
          setUsername(userId);
        }
      }
    };
    
    checkUserRegistration();
  }, [address, checkRegistration, getUserId, userRegistrations]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleRegister = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsRegistering(true);
    try {
      await registerUser(username);
      setIsRegistered(true);
      toast.success('Registration successful!');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);
    const startTime = Date.now();
    
    // Open confirmation dialog
    setTxConfirmation({
      isOpen: true,
      status: 'pending',
      message: 'message',
      txHash: undefined,
      error: undefined,
      startTime: startTime
    });
    
    try {
      // For embedded wallet, transaction is instantly confirmed
      const isEmbeddedWallet = connector?.id === 'embedded-wallet';
      
      if (isEmbeddedWallet) {
        // Sync transaction - instant confirmation
        const result = await sendContractMessage(message);
        const duration = Date.now() - startTime;
        
        setTxConfirmation({
          isOpen: true,
          status: 'confirmed',
          message: 'message',
          txHash: result.hash || result.transactionHash || result.txHash,
          error: undefined,
          duration: duration
        });
        
        setMessage('');
      } else {
        // Regular transaction flow for MetaMask
        setTxConfirmation({
          isOpen: true,
          status: 'confirming',
          message: 'message',
          txHash: undefined,
          error: undefined,
          startTime: startTime
        });
        
        const receipt = await sendContractMessage(message);
        const duration = Date.now() - startTime;
        
        setTxConfirmation({
          isOpen: true,
          status: 'confirmed',
          message: 'message',
          txHash: receipt.hash || receipt.transactionHash || receipt.txHash,
          error: undefined,
          duration: duration
        });
        
        setMessage('');
      }
    } catch (error: any) {
      console.error('Send message error:', error);
      
      // Handle user rejection
      if (error.code === 'ACTION_REJECTED' || error.message?.includes('rejected')) {
        setTxConfirmation({
          isOpen: false,
          status: 'error',
          message: 'message',
          error: 'Transaction cancelled'
        });
        toast.error('Transaction cancelled');
      } else {
        setTxConfirmation({
          isOpen: true,
          status: 'error',
          message: 'message',
          error: error.message || 'Failed to send message'
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKarma = async (msgId: string, isPositive: boolean) => {
    try {
      if (isPositive) {
        await giveKarma(msgId);
        toast.success('Karma given! 👍');
      } else {
        await takeKarma(msgId);
        toast.info('Karma removed 👎');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update karma');
    }
  };

  // Registration UI
  if (!isRegistered) {
    return (
      <Card className="max-w-md mx-auto p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Choose Your Username</h2>
        <div className="space-y-4">
          <Input
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
            disabled={isRegistering}
          />
          <Button 
            onClick={handleRegister} 
            disabled={isRegistering || !username.trim()}
            className="w-full"
          >
            {isRegistering ? 'Registering...' : 'Register'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chat Room</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'} • {messages.length} messages
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{address.slice(0, 6)}...{address.slice(-4)}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No messages yet. Be the first to say hello! 👋
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={`${msg.msgId}-${index}`}
                className={`flex ${msg.user.toLowerCase() === address.toLowerCase() ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md ${
                  msg.user.toLowerCase() === address.toLowerCase() 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                } rounded-lg px-4 py-2`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{msg.userId}</span>
                    <span className="text-xs opacity-75 ml-2">
                      {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="break-words">{msg.message}</p>
                  
                  {/* Karma buttons - only for other users' messages */}
                  {msg.user.toLowerCase() !== address.toLowerCase() && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20">
                      <button
                        onClick={() => handleKarma(msg.msgId, true)}
                        className="text-xs hover:scale-110 transition-transform"
                        title="Give karma"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleKarma(msg.msgId, false)}
                        className="text-xs hover:scale-110 transition-transform"
                        title="Take karma"
                      >
                        👎
                      </button>
                      <a
                        href={`https://explorer.testnet.riselabs.xyz/tx/${msg.txHash}`}
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
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
              disabled={isSending}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={isSending || !message.trim()}
            >
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Karma Updates Feed */}
      {karmaUpdates.length > 0 && (
        <Card className="mt-4 p-4">
          <h3 className="font-semibold mb-2">Recent Karma Updates</h3>
          <div className="space-y-1 text-sm">
            {karmaUpdates.slice(-5).reverse().map((update, index) => (
              <div key={index} className="text-gray-600 dark:text-gray-400">
                {update.userId} now has {update.karma} karma
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Transaction Confirmation Dialog */}
      <TransactionConfirmation
        isOpen={txConfirmation.isOpen}
        onClose={() => setTxConfirmation(prev => ({ ...prev, isOpen: false }))}
        status={txConfirmation.status}
        message={txConfirmation.message}
        txHash={txConfirmation.txHash}
        error={txConfirmation.error}
        duration={txConfirmation.duration}
      />
    </div>
  );
}