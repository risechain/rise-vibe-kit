'use client';

import { useState } from 'react';
import { usePorto } from '@/providers/PortoProvider';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast-manager';

type SignType = 'personal' | 'typed' | 'permit';

export function SigningPanel() {
  const { address, isConnected, signMessage } = usePorto();

  const [signType, setSignType] = useState<SignType>('personal');
  const [message, setMessage] = useState('Hello from Porto Wallet!');
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSign = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    setSignature(null);

    try {
      const sig = await signMessage(message);
      setSignature(sig);
      toast.success('Message signed successfully!');
    } catch (error: any) {
      console.error('Signing error:', error);
      toast.error(error.message || 'Failed to sign message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySignature = async () => {
    if (!signature) return;

    try {
      await navigator.clipboard.writeText(signature);
      toast.success('Signature copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy signature');
    }
  };

  const getExampleMessage = () => {
    switch (signType) {
      case 'personal':
        return 'Hello from Porto Wallet!';
      case 'typed':
        return JSON.stringify({
          domain: {
            name: 'Porto Test',
            version: '1',
            chainId: 11155931,
          },
          message: {
            contents: 'Sign this message to prove ownership',
            from: address || '0x...',
            timestamp: Date.now(),
          },
        }, null, 2);
      case 'permit':
        return JSON.stringify({
          owner: address || '0x...',
          spender: '0x...',
          value: '1000000',
          nonce: 0,
          deadline: Date.now() + 3600000,
        }, null, 2);
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        Sign Messages
      </h3>

      {/* Sign Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Signature Type
        </label>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setSignType('personal');
              setMessage(getExampleMessage());
            }}
            variant={signType === 'personal' ? 'default' : 'outline'}
            size="sm"
          >
            Personal Sign
          </Button>
          <Button
            onClick={() => {
              setSignType('typed');
              setMessage(getExampleMessage());
            }}
            variant={signType === 'typed' ? 'default' : 'outline'}
            size="sm"
          >
            EIP-712
          </Button>
          <Button
            onClick={() => {
              setSignType('permit');
              setMessage(getExampleMessage());
            }}
            variant={signType === 'permit' ? 'default' : 'outline'}
            size="sm"
          >
            Permit
          </Button>
        </div>
      </div>

      {/* Message Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Message to Sign
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows={signType === 'personal' ? 3 : 10}
        />
      </div>

      {/* Sign Button */}
      <Button
        onClick={handleSign}
        disabled={!isConnected || isLoading || !message}
        className="w-full"
      >
        {isLoading ? 'Signing...' : 'Sign Message'}
      </Button>

      {/* Signature Display */}
      {signature && (
        <div className="bg-green-100 dark:bg-green-900 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Signature
            </p>
            <Button
              onClick={handleCopySignature}
              variant="ghost"
              size="sm"
              className="text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800"
            >
              📋 Copy
            </Button>
          </div>
          <code className="block text-xs break-all text-gray-700 dark:text-gray-300">
            {signature}
          </code>
        </div>
      )}

      {/* Verification Section */}
      {signature && (
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Verify Signature
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Signer Address:</span>
              <code className="font-mono">{address}</code>
            </div>
            <div className="flex justify-between text-sm">
              <span>Message Hash:</span>
              <code className="font-mono">0x{Buffer.from(message).toString('hex').slice(0, 8)}...</code>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => toast.info('Verification will be implemented with ethers.js')}
            >
              Verify Signature
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}