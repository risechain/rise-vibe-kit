'use client';

import { ChatInterface } from '@/components/ChatInterface';
import { WalletSelector } from '@/components/WalletSelector';
import { useAccount } from 'wagmi';

export default function Home() {
  const { address, isConnected } = useAccount();

  return (
    <div className="container mx-auto px-4 py-8">
        {isConnected && address ? (
          <ChatInterface address={address} />
        ) : (
          <div className="max-w-md mx-auto text-center">
            <div className="rise-card">
              <h2 className="text-2xl font-bold mb-4">
                Welcome to RISE Chat
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Connect your wallet to start chatting with ultra-fast transactions on RISE.
              </p>
              <WalletSelector />
            </div>
          </div>
        )}
    </div>
  );
}