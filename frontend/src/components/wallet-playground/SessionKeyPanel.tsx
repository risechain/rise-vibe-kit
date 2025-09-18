'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast-manager';

export function SessionKeyPanel() {
  const [keyPair, setKeyPair] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [permissions, setPermissions] = useState({
    contracts: [] as string[],
    spendLimit: '100',
    expiryHours: '24',
  });

  const generateKeyPair = () => {
    // Mock key generation - in production use P256
    const mockKeyPair = {
      publicKey: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      privateKey: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    };
    setKeyPair(mockKeyPair);
    toast.success('P256 keypair generated');
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        Session Key Management
      </h3>

      {/* Generate Key Pair */}
      <div>
        <Button onClick={generateKeyPair} className="w-full">
          Generate P256 Key Pair
        </Button>
      </div>

      {keyPair && (
        <>
          {/* Key Display */}
          <div className="space-y-3">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Public Key</p>
              <code className="text-xs break-all">{keyPair.publicKey}</code>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Private Key (Keep Secret!)</p>
              <code className="text-xs break-all">{keyPair.privateKey}</code>
            </div>
          </div>

          {/* Permission Settings */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium">Grant Permissions</h4>

            <div>
              <label className="block text-sm font-medium mb-2">Contract Addresses</label>
              <Input
                placeholder="0x... (comma separated)"
                onChange={(e) => setPermissions({
                  ...permissions,
                  contracts: e.target.value.split(',').map(s => s.trim()),
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Spend Limit (ETH)</label>
              <Input
                type="number"
                value={permissions.spendLimit}
                onChange={(e) => setPermissions({
                  ...permissions,
                  spendLimit: e.target.value,
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Expiry (hours)</label>
              <Input
                type="number"
                value={permissions.expiryHours}
                onChange={(e) => setPermissions({
                  ...permissions,
                  expiryHours: e.target.value,
                })}
              />
            </div>

            <Button
              onClick={() => toast.info('Permission granting will be implemented with Porto SDK')}
              className="w-full"
            >
              Grant Permissions to Key
            </Button>
          </div>
        </>
      )}
    </div>
  );
}