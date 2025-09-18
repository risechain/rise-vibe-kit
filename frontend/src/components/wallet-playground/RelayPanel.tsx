'use client';

import { useState } from 'react';
import { usePorto } from '@/providers/PortoProvider';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast-manager';

export function RelayPanel() {
  const { address, isConnected } = usePorto();
  const [relayData, setRelayData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAccountStatus = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      // Mock relay data - in production use RelayClient
      const mockData = {
        address,
        nonce: 5,
        balance: '0.1',
        permissions: [
          { id: '0x1', contract: '0xTokenAddress', limit: '100 ETH' },
          { id: '0x2', contract: '0xRouterAddress', limit: '50 ETH' },
        ],
        admins: [address],
        transactions: [
          { hash: '0xabc...', status: 'success', timestamp: Date.now() - 3600000 },
          { hash: '0xdef...', status: 'pending', timestamp: Date.now() - 1800000 },
        ],
      };

      setRelayData(mockData);
      toast.success('Account data fetched');
    } catch (error: any) {
      toast.error('Failed to fetch relay data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        Relay Interactions
      </h3>

      <Button
        onClick={fetchAccountStatus}
        disabled={!isConnected || isLoading}
        className="w-full"
      >
        {isLoading ? 'Fetching...' : 'Fetch Account Status'}
      </Button>

      {relayData && (
        <div className="space-y-4">
          {/* Account Info */}
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium mb-3">Account Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Address:</span>
                <code className="font-mono">{relayData.address.slice(0, 10)}...</code>
              </div>
              <div className="flex justify-between">
                <span>Nonce:</span>
                <span>{relayData.nonce}</span>
              </div>
              <div className="flex justify-between">
                <span>Balance:</span>
                <span>{relayData.balance} ETH</span>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-4">
            <h4 className="font-medium mb-3">Active Permissions</h4>
            <div className="space-y-2">
              {relayData.permissions.map((perm: any, idx: number) => (
                <div key={idx} className="text-sm border-b pb-2 last:border-0">
                  <div className="flex justify-between">
                    <span>Contract:</span>
                    <code className="font-mono text-xs">{perm.contract.slice(0, 10)}...</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Limit:</span>
                    <span>{perm.limit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-green-100 dark:bg-green-900 rounded-lg p-4">
            <h4 className="font-medium mb-3">Recent Transactions</h4>
            <div className="space-y-2">
              {relayData.transactions.map((tx: any, idx: number) => (
                <div key={idx} className="text-sm flex justify-between">
                  <code className="font-mono">{tx.hash}</code>
                  <span className={tx.status === 'success' ? 'text-green-600' : 'text-yellow-600'}>
                    {tx.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}