'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'react-toastify';
import { 
  exportEmbeddedWalletKey, 
  importEmbeddedWalletKey,
  clearEmbeddedWallet 
} from '@/lib/wagmi-embedded-connector';
import { resetWallet } from '@/hooks/useAutoWallet';

export function WalletSelector() {
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showEmbeddedOptions, setShowEmbeddedOptions] = useState(false);
  const [importKey, setImportKey] = useState('');
  
  // Wagmi hooks
  const { address, isConnected, connector } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Get balance for connected wallet
  const { data: balance } = useBalance({
    address: address,
  });
  
  // Determine wallet type
  const isEmbeddedWallet = connector?.id === 'embedded-wallet';
  const walletType = isEmbeddedWallet ? 'embedded' : connector?.name || 'external';

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setShowWalletOptions(false);
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const handleConnectEmbedded = () => {
    const embeddedConnector = connectors.find(c => c.id === 'embedded-wallet');
    if (embeddedConnector) {
      connect({ connector: embeddedConnector });
      setShowWalletOptions(false);
      setShowEmbeddedOptions(false);
      toast.success('Embedded wallet created!');
    }
  };

  const handleImportKey = () => {
    if (!importKey.trim()) {
      toast.error('Please enter a private key');
      return;
    }
    
    try {
      // Import the key
      const success = importEmbeddedWalletKey(importKey);
      if (!success) {
        toast.error('Invalid private key');
        return;
      }
      
      // Connect with the embedded wallet connector
      const embeddedConnector = connectors.find(c => c.id === 'embedded-wallet');
      if (embeddedConnector) {
        connect({ connector: embeddedConnector });
        setImportKey('');
        setShowWalletOptions(false);
        setShowEmbeddedOptions(false);
        toast.success('Wallet imported successfully!');
      }
    } catch {
      toast.error('Invalid private key');
    }
  };

  const handleExportKey = () => {
    if (isEmbeddedWallet) {
      exportEmbeddedWalletKey();
      toast.info('Private key exported to file');
    }
  };

  const handleClearAndDisconnect = () => {
    if (isEmbeddedWallet) {
      clearEmbeddedWallet();
    }
    disconnect();
    setShowWalletOptions(false);
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
          {balance && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
            </p>
          )}
        </div>
        
        <Dialog open={showWalletOptions} onOpenChange={setShowWalletOptions}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {isEmbeddedWallet ? '🔐' : '🦊'} Wallet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Wallet Options</DialogTitle>
              <DialogDescription>
                Connected with {walletType} wallet
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Address</p>
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{address}</p>
                {balance && (
                  <>
                    <p className="text-sm font-medium mt-3 mb-1 text-gray-700 dark:text-gray-300">Balance</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{balance.formatted} {balance.symbol}</p>
                  </>
                )}
              </div>
              
              {isEmbeddedWallet && (
                <Button 
                  onClick={handleExportKey}
                  variant="outline"
                  className="w-full"
                >
                  Export Private Key
                </Button>
              )}
              
              <Button 
                onClick={handleDisconnect}
                variant="outline"
                className="w-full"
              >
                Disconnect
              </Button>
              
              {isEmbeddedWallet && (
                <>
                  <Button 
                    onClick={() => {
                      resetWallet();
                      handleDisconnect();
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Generate New Wallet
                  </Button>
                  
                  <Button 
                    onClick={handleClearAndDisconnect}
                    variant="destructive"
                    className="w-full"
                  >
                    Clear Wallet & Disconnect
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Dialog open={showWalletOptions} onOpenChange={setShowWalletOptions}>
      <DialogTrigger asChild>
        <Button>Connect Wallet</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Choose how you want to connect to RISE
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* External Wallets */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              External Wallets
            </p>
            {connectors
              .filter(connector => connector.id !== 'embedded-wallet')
              .map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => {
                    connect({ connector });
                    setShowWalletOptions(false);
                  }}
                  className="w-full p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{connector.name}</span>
                    {connector.ready ? (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        Ready
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
          </div>

          {/* Embedded Wallet */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Embedded Wallet
            </p>
            <button
              onClick={() => setShowEmbeddedOptions(!showEmbeddedOptions)}
              className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Browser Wallet</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Create or import a wallet in your browser
                  </p>
                </div>
                <span className="text-2xl">🔐</span>
              </div>
            </button>
            
            {showEmbeddedOptions && (
              <div className="space-y-2 pl-4">
                <Button
                  onClick={handleConnectEmbedded}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Connect Embedded Wallet
                </Button>
                
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Enter private key to import"
                    value={importKey}
                    onChange={(e) => setImportKey(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleImportKey()}
                  />
                  <Button
                    onClick={handleImportKey}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={!importKey.trim()}
                  >
                    Import Wallet
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}