"use client";

import { useState } from 'react';
import { WagmiProvider, useConnection, useConnect, useDisconnect, useReadContract, useConnectors } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config as riseWalletConfig } from '@/config/rise-wallet-config';
import { useRiseWalletTransaction } from '@/hooks/useRiseWalletTransaction';
import { useRiseWalletSessionKey } from '@/hooks/useRiseWalletSessionKey';
import { encodeFunctionData, parseEther, formatEther } from 'viem';

const queryClient = new QueryClient();

// MockUSD token address from wallet-demo
const MOCK_USD_ADDRESS = '0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50' as `0x${string}`;

// Simple ERC20 ABI for transfer and balanceOf
const ERC20_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

function TestContent() {
  const { address, isConnected } = useConnection();
  const { mutate:connect } = useConnect();
  const connectors = useConnectors()
  const { disconnect } = useDisconnect();
  const { execute, isLoading: isTxLoading } = useRiseWalletTransaction();

  const {
    keyPair,
    hasUsableSessionKey,
    createSessionKey,
    revokeSessionKey,
    isCreating,
    activeSessionKeys,
  } = useRiseWalletSessionKey(); // Now uses global permissions

  const [useSessionKey, setUseSessionKey] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<{ success: boolean; error?: { message: string } | null; data: unknown } | null>(null);

  // Read MockUSD balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: MOCK_USD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const handleTransfer = async () => {
    if (!recipient || !amount) {
      alert('Please enter recipient and amount');
      return;
    }
    console.log("handle transfer called")
    if (isTxLoading) {
      console.log('⚠️ Transaction already in progress');
      return;
    }

    try {
      setResult(null);
      const parsedAmount = parseEther(amount);

      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, parsedAmount],
      });

      const calls = [{
        to: MOCK_USD_ADDRESS,
        data,
      }];

      console.log('📤 Sending calls:', calls);
      console.log('🔑 Session key being used:', useSessionKey && hasUsableSessionKey);

      const tx = await execute({
        calls,
        sessionKey: useSessionKey && hasUsableSessionKey && keyPair ? keyPair : undefined,
      });

      if (tx) {
        setResult(tx);
      }
      console.log('✅ Transfer complete:', tx);

      // Refetch balance after transfer
      setTimeout(() => refetchBalance(), 1000);
    } catch (error) {
      console.error('❌ Transfer error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (!message.includes('User rejected')) {
        alert(message);
      }
    }
  };

  const handleCreateSessionKey = async () => {
    try {
      await createSessionKey();
      alert('Session key created! You can now toggle it on.');
    } catch (error) {
      console.error('❌ Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(message);
    }
  };

  const handleRevokeSessionKey = async (keyId: string) => {
    try {
      await revokeSessionKey(keyId);
      alert('Session key revoked!');
    } catch (error) {
      console.error('❌ Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(message);
    }
  };

  const debugPermissions = async () => {
    try {
      const conn = connectors[0];
      if (!conn) {
        console.error('No connector found');
        return;
      }

      // Get provider
      const provider = (await conn.getProvider()) as {
        request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
      };

      // Get permissions
      const permissions = await provider.request({
        method: 'wallet_getPermissions',
        params: [{ address }],
      });

      console.log('🔍 Wallet Permissions:', JSON.stringify(permissions, null, 2));
    } catch (error) {
      console.error('❌ Error getting permissions:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
            RISE Wallet Test Page
          </h1>

          {/* Wallet Connection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              1. Connect Wallet
            </h2>
            {!isConnected ? (
              <div className="space-y-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => connect({ connector })}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
                  >
                    Connect {connector.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  MockUSD Balance: {balance ? formatEther(balance as bigint) : '0'} MockUSD
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => disconnect()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                  >
                    Disconnect
                  </button>
                  <button
                    onClick={debugPermissions}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    Debug Permissions
                  </button>
                </div>
              </div>
            )}
          </div>

          {isConnected && (
            <>
              {/* Session Key Management */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                  3. Session Key Management
                </h2>
                <div className="space-y-4">
                  {!hasUsableSessionKey ? (
                    <button
                      onClick={handleCreateSessionKey}
                      disabled={isCreating}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:bg-gray-400"
                    >
                      {isCreating ? 'Creating...' : 'Create Session Key'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ✓ Session key active
                      </p>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={useSessionKey}
                          onChange={(e) => setUseSessionKey(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          Use session key for transactions
                        </span>
                      </label>
                    </div>
                  )}

                  {activeSessionKeys.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Active keys: {activeSessionKeys.length}
                      </p>
                      {activeSessionKeys.map((key: { id: string; publicKey: string; hasPrivateKey?: boolean }) => (
                        <div key={key.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded mb-2">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {key.publicKey.slice(0, 10)}...{key.publicKey.slice(-8)}
                            {key.hasPrivateKey && ' (Local)'}
                          </span>
                          <button
                            onClick={() => handleRevokeSessionKey(key.id)}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Transfer MockUSD */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                  2 & 4. Transfer MockUSD Tokens
                  {useSessionKey && hasUsableSessionKey && (
                    <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                      (Using Session Key ⚡)
                    </span>
                  )}
                  {!useSessionKey && (
                    <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                      (Using Passkey 🔐)
                    </span>
                  )}
                </h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Amount (MockUSD)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.1"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={handleTransfer}
                        disabled={isTxLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-400"
                      >
                        {isTxLoading ? 'Sending...' : 'Transfer'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Result Display */}
              {result && (
                <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                  <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">
                    Transaction Result:
                  </h3>
                  <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-200">
            Test Flow:
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
            <li>Connect wallet with Passkey/WebAuthn</li>
            <li>Send transfer via Passkey (enter recipient + amount)</li>
            <li>Create session key (will prompt for Passkey to authorize)</li>
            <li>Toggle Use session key ON</li>
            <li>Send transfer via session key (no Passkey prompt!)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function TestPage() {
  return (
    <WagmiProvider config={riseWalletConfig}>
      <QueryClientProvider client={queryClient}>
        <TestContent />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
