'use client';

import { useAccount, useChainId, useWalletClient } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

export function DebugInfo() {
  const { address, connector, chain } = useAccount();
  const chainId = useChainId();
  const { } = useWalletClient(); // Keep for potential future use
  const [networkInfo, setNetworkInfo] = useState<{
    metamaskChainId: number;
    metamaskChainIdHex: string;
    expectedChainId: number;
    expectedChainIdHex: string;
    isCorrectNetwork: boolean;
  } | null>(null);

  useEffect(() => {
    async function checkNetwork() {
      if (typeof window !== 'undefined' && (window as { ethereum?: unknown }).ethereum) {
        try {
          const chainIdHex = await (window as { ethereum: { request: (args: { method: string }) => Promise<string> } }).ethereum.request({ 
            method: 'eth_chainId' 
          });
          const chainIdDec = parseInt(chainIdHex, 16);
          
          setNetworkInfo({
            metamaskChainId: chainIdDec,
            metamaskChainIdHex: chainIdHex,
            expectedChainId: 11155931,
            expectedChainIdHex: '0xaa6c7b',
            isCorrectNetwork: chainIdDec === 11155931
          });
        } catch (error) {
          console.error('Failed to get network info:', error);
        }
      }
    }

    checkNetwork();
  }, [address]);

  return (
    <Card className="fixed bottom-20 right-4 w-96">
      <CardHeader>
        <CardTitle className="text-sm">Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>
          <strong>Wallet:</strong> {connector?.name || 'Not connected'}
        </div>
        <div>
          <strong>Address:</strong> {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
        </div>
        <div>
          <strong>Wagmi Chain:</strong> {chain?.name || 'Unknown'} (ID: {chain?.id || 'N/A'})
        </div>
        <div>
          <strong>Wagmi Chain ID:</strong> {chainId}
        </div>
        
        {networkInfo && (
          <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
            <div className="font-bold mb-1">MetaMask Network Info:</div>
            <div>Chain ID: {networkInfo.metamaskChainId} ({networkInfo.metamaskChainIdHex})</div>
            <div>Expected: {networkInfo.expectedChainId} ({networkInfo.expectedChainIdHex})</div>
            <div className="mt-2">
              <Badge variant={networkInfo.isCorrectNetwork ? 'default' : 'destructive'}>
                {networkInfo.isCorrectNetwork ? '✅ Correct Network' : '❌ Wrong Network'}
              </Badge>
            </div>
          </div>
        )}
        
        <div className="mt-2 text-xs text-gray-500">
          {networkInfo && !networkInfo.isCorrectNetwork && (
            <p>⚠️ MetaMask is on the wrong network. Transactions will prompt to switch.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}