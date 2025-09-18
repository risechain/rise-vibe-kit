'use client';

import { useState } from 'react';
import { usePorto } from '@/providers/PortoProvider';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast-manager';

type DialogMode = 'iframe' | 'popup' | 'inline';

export function WalletDashboard() {
  const {
    address,
    balance,
    isConnected,
    isLoading,
    connect,
    disconnect
  } = usePorto();

  const [dialogMode, setDialogMode] = useState<DialogMode>('iframe');
  const [isCopied, setIsCopied] = useState(false);

  // Copy address to clipboard
  const copyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Failed to copy address');
    }
  };

  // Handle mode change
  const handleModeChange = (mode: DialogMode) => {
    setDialogMode(mode);
    // In a real implementation, you'd reconfigure Porto here
    toast.info(`Switched to ${mode} mode`);
  };

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Porto Wallet</h2>

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-80">Mode:</span>
          <select
            value={dialogMode}
            onChange={(e) => handleModeChange(e.target.value as DialogMode)}
            className="bg-white/20 backdrop-blur border border-white/30 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            disabled={isConnected}
          >
            <option value="iframe" className="text-gray-900">iFrame</option>
            <option value="popup" className="text-gray-900">Popup</option>
            <option value="inline" className="text-gray-900">Inline</option>
          </select>
        </div>
      </div>

      {isConnected && address ? (
        <div className="space-y-4">
          {/* Address Section */}
          <div>
            <p className="text-sm opacity-80 mb-1">Address</p>
            <div className="flex items-center gap-2">
              <code className="bg-white/20 backdrop-blur px-3 py-2 rounded font-mono text-sm flex-1">
                {formatAddress(address)}
              </code>
              <Button
                onClick={copyAddress}
                variant="ghost"
                size="sm"
                className="hover:bg-white/20"
              >
                {isCopied ? '✅' : '📋'}
              </Button>
            </div>
          </div>

          {/* Balance Section */}
          <div>
            <p className="text-sm opacity-80 mb-1">Balance</p>
            <div className="bg-white/20 backdrop-blur px-3 py-2 rounded">
              <span className="text-xl font-bold">
                {parseFloat(balance).toFixed(4)} ETH
              </span>
            </div>
          </div>

          {/* Network Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-80 mb-1">Network</p>
              <div className="bg-white/20 backdrop-blur px-3 py-2 rounded text-sm">
                RISE Testnet
              </div>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">Chain ID</p>
              <div className="bg-white/20 backdrop-blur px-3 py-2 rounded text-sm">
                11155931
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={disconnect}
              variant="outline"
              className="flex-1 bg-white/10 hover:bg-white/20 border-white/30"
            >
              Disconnect
            </Button>
            <Button
              onClick={() => window.open(`https://explorer.testnet.riselabs.xyz/address/${address}`, '_blank')}
              variant="outline"
              className="flex-1 bg-white/10 hover:bg-white/20 border-white/30"
            >
              View Explorer
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="mb-4 opacity-80">
            Connect your Porto wallet to get started
          </p>
          <Button
            onClick={connect}
            disabled={isLoading}
            className="bg-white text-purple-600 hover:bg-white/90"
          >
            {isLoading ? 'Connecting...' : 'Connect Porto Wallet'}
          </Button>
        </div>
      )}

      {/* Status Indicators */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/20">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
          <span className="text-xs opacity-80">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs opacity-80">
            WebSocket Active
          </span>
        </div>
      </div>
    </div>
  );
}