'use client';

import { useState } from 'react';
import { WalletDashboard } from '@/components/wallet-playground/WalletDashboard';
import { TransferPanel } from '@/components/wallet-playground/TransferPanel';
import { SwapPanel } from '@/components/wallet-playground/SwapPanel';
import { SigningPanel } from '@/components/wallet-playground/SigningPanel';
import { SessionKeyPanel } from '@/components/wallet-playground/SessionKeyPanel';
import { RelayPanel } from '@/components/wallet-playground/RelayPanel';
import { EventLogger } from '@/components/wallet-playground/EventLogger';

type TabType = 'transfer' | 'swap' | 'sign' | 'keys' | 'relay' | 'events';

export default function WalletPlaygroundPage() {
  const [activeTab, setActiveTab] = useState<TabType>('transfer');

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'transfer', label: 'Transfer', icon: '💸' },
    { id: 'swap', label: 'Swap', icon: '🔄' },
    { id: 'sign', label: 'Sign', icon: '✍️' },
    { id: 'keys', label: 'Keys', icon: '🔑' },
    { id: 'relay', label: 'Relay', icon: '📡' },
    { id: 'events', label: 'Events', icon: '📊' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Wallet Playground
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test Porto wallet integration with DeFi interactions
        </p>
      </div>

      {/* Wallet Dashboard */}
      <div className="mb-8">
        <WalletDashboard />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        {activeTab === 'transfer' && <TransferPanel />}
        {activeTab === 'swap' && <SwapPanel />}
        {activeTab === 'sign' && <SigningPanel />}
        {activeTab === 'keys' && <SessionKeyPanel />}
        {activeTab === 'relay' && <RelayPanel />}
        {activeTab === 'events' && <EventLogger />}
      </div>
    </div>
  );
}