'use client';

import { useState } from 'react';
import { usePorto } from '@/providers/PortoProvider';
import { parseEther, formatEther, isAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast-manager';

interface Token {
  symbol: string;
  address: string;
  decimals: number;
  balance?: string;
}

// Mock tokens - these will be replaced with actual deployed addresses
const TOKENS: Token[] = [
  { symbol: 'ETH', address: '0x0', decimals: 18 },
  { symbol: 'USDC', address: '0x1', decimals: 6 },
  { symbol: 'DAI', address: '0x2', decimals: 18 },
  { symbol: 'PEPE', address: '0x3', decimals: 18 },
];

export function TransferPanel() {
  const { address, isConnected, sendTransaction } = usePorto();

  const [selectedToken, setSelectedToken] = useState<Token>(TOKENS[0]);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleTransfer = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!isAddress(recipient)) {
      toast.error('Invalid recipient address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Invalid amount');
      return;
    }

    setIsLoading(true);
    setTxHash(null);

    try {
      if (selectedToken.symbol === 'ETH') {
        // Native ETH transfer
        const receipt = await sendTransaction({
          to: recipient,
          value: parseEther(amount).toString(),
          gasLimit: '21000',
        });

        setTxHash(receipt.transactionHash);
        toast.success('Transfer successful!');
      } else {
        // ERC20 transfer
        // Encode transfer function
        const transferData = `0xa9059cbb${
          recipient.slice(2).padStart(64, '0')
        }${
          BigInt(parseFloat(amount) * 10 ** selectedToken.decimals)
            .toString(16)
            .padStart(64, '0')
        }`;

        const receipt = await sendTransaction({
          to: selectedToken.address,
          data: transferData,
          gasLimit: '100000',
        });

        setTxHash(receipt.transactionHash);
        toast.success('Token transfer successful!');
      }

      // Reset form
      setAmount('');
      setRecipient('');
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Transfer failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxAmount = () => {
    // In production, fetch actual balance for each token
    if (selectedToken.symbol === 'ETH') {
      // Leave some for gas
      setAmount('0.1');
    } else {
      setAmount('100');
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        Transfer Tokens
      </h3>

      {/* Token Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Token
        </label>
        <select
          value={selectedToken.symbol}
          onChange={(e) => {
            const token = TOKENS.find(t => t.symbol === e.target.value);
            if (token) setSelectedToken(token);
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {TOKENS.map((token) => (
            <option key={token.symbol} value={token.symbol}>
              {token.symbol}
            </option>
          ))}
        </select>
      </div>

      {/* Recipient Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recipient Address
        </label>
        <Input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="w-full"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Amount
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="0.000001"
            min="0"
            className="flex-1"
          />
          <Button
            onClick={handleMaxAmount}
            variant="outline"
            size="sm"
          >
            Max
          </Button>
        </div>
      </div>

      {/* Transfer Summary */}
      {recipient && amount && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Transfer Summary
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Token:</span>
              <span className="font-mono">{selectedToken.symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>To:</span>
              <span className="font-mono">
                {recipient.slice(0, 6)}...{recipient.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Amount:</span>
              <span className="font-mono">
                {amount} {selectedToken.symbol}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Button */}
      <Button
        onClick={handleTransfer}
        disabled={!isConnected || isLoading || !recipient || !amount}
        className="w-full"
      >
        {isLoading ? 'Transferring...' : 'Transfer'}
      </Button>

      {/* Transaction Hash */}
      {txHash && (
        <div className="bg-green-100 dark:bg-green-900 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-200 mb-2">
            Transaction Successful!
          </p>
          <a
            href={`https://explorer.testnet.riselabs.xyz/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
          >
            View on Explorer: {txHash}
          </a>
        </div>
      )}
    </div>
  );
}