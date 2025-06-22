'use client';

import { WalletSelector } from '@/components/WalletSelector';
import { useAccount } from 'wagmi';
import Link from 'next/link';

export default function Home() {
  const { address, isConnected } = useAccount();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
            Welcome to RISE
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Build blazing-fast dApps with sub-second transactions
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="rise-card">
            <h3 className="text-lg font-semibold mb-2">⚡ Ultra-Fast</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Sub-second transaction finality with synchronous execution
            </p>
          </div>
          
          <div className="rise-card">
            <h3 className="text-lg font-semibold mb-2">🔄 Real-Time Events</h3>
            <p className="text-gray-600 dark:text-gray-400">
              WebSocket subscriptions for instant blockchain updates
            </p>
          </div>
          
          <div className="rise-card">
            <h3 className="text-lg font-semibold mb-2">🔐 Embedded Wallets</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Seamless UX with browser-based wallet support
            </p>
          </div>
        </div>

        {/* Connect Wallet Section */}
        <div className="rise-card text-center">
          <h2 className="text-2xl font-bold mb-4">
            {isConnected ? 'Connected!' : 'Get Started'}
          </h2>
          
          {isConnected ? (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your wallet is connected. Start building!
              </p>
              <div className="flex gap-4 justify-center">
                <Link 
                  href="/debug" 
                  className="rise-button"
                >
                  Debug Tools
                </Link>
                <Link 
                  href="/events" 
                  className="rise-button"
                >
                  Event Viewer
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Connect your wallet to interact with RISE blockchain
              </p>
              <WalletSelector />
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-12 text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">Learn more about building on RISE:</p>
          <div className="flex gap-4 justify-center">
            <a 
              href="https://docs.rise.chain" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition-colors"
            >
              Documentation
            </a>
            <a 
              href="https://github.com/risechain" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition-colors"
            >
              GitHub
            </a>
            <a 
              href="https://discord.gg/rise" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition-colors"
            >
              Discord
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}