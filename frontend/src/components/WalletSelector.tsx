'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from 'wagmi';
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
import { toast } from '@/lib/toast-manager';
import { 
  copyEmbeddedWalletKeyToClipboard,
  getEmbeddedWalletKey,
  importEmbeddedWalletKey,
  clearEmbeddedWallet 
} from '@/lib/wagmi-embedded-connector';
import { resetWallet } from '@/hooks/useAutoWallet';
import { useEnsureNetwork } from '@/hooks/useEnsureNetwork';
import { RISE_CHAIN_ID } from '@/config/chain';
import { appConfig } from '@/config/app';

export function WalletSelector() {
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showEmbeddedOptions, setShowEmbeddedOptions] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [isKeyRevealed, setIsKeyRevealed] = useState(false);
  
  // Wagmi hooks
  const { address, isConnected, connector } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { addRiseNetwork } = useEnsureNetwork();
  
  // Get balance for connected wallet
  const { data: balance } = useBalance({
    address: address,
  });
  
  // Determine wallet type
  const isEmbeddedWallet = connector?.id === 'embedded-wallet';
  const walletType = isEmbeddedWallet ? 'embedded' : connector?.name || 'external';
  const isWrongNetwork = chainId !== RISE_CHAIN_ID && !isEmbeddedWallet;

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setShowWalletOptions(false);
      setIsKeyRevealed(false);
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

  const handleCopyPrivateKey = async () => {
    if (isEmbeddedWallet) {
      const success = await copyEmbeddedWalletKeyToClipboard();
      
      if (success) {
        toast.success('Private key copied to clipboard');
      } else {
        toast.error('Failed to copy private key');
      }
    }
  };

  const handleRevealPrivateKey = () => {
    setIsKeyRevealed(!isKeyRevealed);
  };

  const handleClearAndDisconnect = () => {
    if (isEmbeddedWallet) {
      clearEmbeddedWallet();
    }
    disconnect();
    setShowWalletOptions(false);
  };

  if (isConnected && address) {
    // Show network switch button if on wrong network
    if (isWrongNetwork) {
      return (
        <Button 
          onClick={addRiseNetwork} 
          variant="destructive"
          size="sm"
        >
          Switch to RISE Network
        </Button>
      );
    }

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
        
        <Dialog open={showWalletOptions} onOpenChange={(open) => {
          setShowWalletOptions(open);
          if (!open) setIsKeyRevealed(false);
        }}>
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
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCopyPrivateKey}
                      variant="outline"
                      className="flex-1"
                    >
                      Copy Private Key
                    </Button>
                    <Button
                      onClick={handleRevealPrivateKey}
                      variant="outline"
                      className="flex-1"
                    >
                      {isKeyRevealed ? 'Hide' : 'Reveal'} Key
                    </Button>
                  </div>
                  
                  {isKeyRevealed && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                        ⚠️ Keep this private key secure
                      </p>
                      <code className="block break-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 p-2 rounded border">
                        {getEmbeddedWalletKey() || 'No key found'}
                      </code>
                    </div>
                  )}
                </div>
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
            {appConfig.wallet.embeddedOnly 
              ? 'Connect with RISE embedded wallet'
              : 'Choose how you want to connect to RISE'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* External Wallets - only show if not embeddedOnly */}
          {!appConfig.wallet.embeddedOnly && (
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
          )}

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