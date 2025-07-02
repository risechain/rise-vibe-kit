'use client';

import { useState } from 'react';
import { contracts, getContract } from '@/contracts/contracts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEmbeddedWalletEnhanced } from '@/hooks/useEmbeddedWalletEnhanced';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from '@/lib/toast-manager';
import { createPublicClient, http, type PublicClient, type WalletClient } from 'viem';
import { riseTestnet } from '@/lib/wagmi-config';

type FunctionFragment = {
  name: string;
  type: 'function';
  inputs: Array<{ name: string; type: string }>;
  outputs?: Array<{ name: string; type: string }>;
  stateMutability: string;
};

type EventFragment = {
  name: string;
  type: 'event';
  inputs: Array<{ name: string; type: string; indexed?: boolean }>;
};

type ContractEvent = {
  args: Record<string, unknown>;
  blockNumber?: bigint;
  transactionHash?: string;
  logIndex?: number;
};

// Helper function to handle BigInt serialization
function serializeBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString() + 'n';
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value);
    }
    return serialized;
  }
  
  return obj;
}

export default function DebugPage() {
  const { address: embeddedAddress } = useEmbeddedWalletEnhanced();
  const { address: externalAddress } = useAccount();
  const activeAddress = externalAddress || embeddedAddress;

  const [selectedContract, setSelectedContract] = useState<keyof typeof contracts>(Object.keys(contracts)[0] as keyof typeof contracts);
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionInputs, setFunctionInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    type: 'read' | 'write' | 'error';
    value?: unknown;
    functionName?: string;
    txHash?: string;
    receipt?: {
      blockNumber: number;
      gasUsed: bigint;
    };
    error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Historical events state
  const [historicalEvents, setHistoricalEvents] = useState<ContractEvent[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [blockRange, setBlockRange] = useState<{
    blocksBack: number;
    batchSize: number;
  }>({
    blocksBack: 100,
    batchSize: 20
  });
  const [selectedEventForHistory, setSelectedEventForHistory] = useState<string>('');

  const contract = getContract(selectedContract as keyof typeof contracts);
  const functions = contract.abi.filter((item: { type: string }) => item.type === 'function') as FunctionFragment[];
  
  const readFunctions = functions.filter(f => 
    f.stateMutability === 'view' || f.stateMutability === 'pure'
  );
  
  const writeFunctions = functions.filter(f => 
    f.stateMutability !== 'view' && f.stateMutability !== 'pure'
  );

  const handleFunctionSelect = (functionName: string) => {
    setSelectedFunction(functionName);
    setFunctionInputs({});
    setResult(null);
  };

  const getPublicClient = (): PublicClient => {
    return createPublicClient({
      chain: riseTestnet,
      transport: http('https://testnet.riselabs.xyz'),
    });
  };

  const { data: walletClient } = useWalletClient();
  
  const getWalletClient = async (): Promise<WalletClient> => {
    if (!walletClient) {
      throw new Error('No wallet connected');
    }
    return walletClient;
  };

  const fetchHistoricalEvents = async () => {
    if (!selectedEventForHistory || !activeAddress) return;
    
    setIsLoadingHistory(true);
    setHistoricalEvents([]);
    
    try {
      const publicClient = getPublicClient();
      const currentBlock = await publicClient.getBlockNumber();
      
      // Calculate batches
      const totalBlocks = blockRange.blocksBack;
      const batchSize = blockRange.batchSize;
      const batches = Math.ceil(totalBlocks / batchSize);
      
      // Find the event ABI
      const eventAbi = contract.abi.find(
        (item) => item.type === 'event' && item.name === selectedEventForHistory
      ) as EventFragment | undefined;
      
      if (!eventAbi) throw new Error('Event ABI not found');
      
      const allEvents: ContractEvent[] = [];
      
      // Fetch events in batches
      for (let i = 0; i < batches; i++) {
        const fromBlock = currentBlock - BigInt(Math.min((i + 1) * batchSize, totalBlocks));
        const toBlock = currentBlock - BigInt(i * batchSize);
        
        console.log(`Fetching batch ${i + 1}/${batches}: blocks ${fromBlock} to ${toBlock}`);
        
        const events = await publicClient.getContractEvents({
          address: contract.address as `0x${string}`,
          abi: [eventAbi],
          eventName: selectedEventForHistory,
          fromBlock,
          toBlock,
        });
        
        // Transform viem events to our ContractEvent type
        const transformedEvents = events.map(event => ({
          args: event.args as Record<string, unknown>,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        }));
        
        allEvents.push(...transformedEvents);
        
        // Update UI with partial results
        setHistoricalEvents([...allEvents]);
        
        // Add small delay between batches to avoid rate limiting
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      toast.success(`Fetched ${allEvents.length} historical events`);
    } catch (error) {
      console.error('Error fetching historical events:', error);
      toast.error('Failed to fetch historical events');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const executeFunction = async () => {
    if (!selectedFunction || !activeAddress) return;

    setIsLoading(true);
    setResult(null);

    try {
      const selectedFn = functions.find(f => f.name === selectedFunction);
      if (!selectedFn) throw new Error('Function not found');

      const args = selectedFn.inputs.map(input => {
        const value = functionInputs[input.name];
        if (input.type === 'uint256' || input.type.startsWith('uint')) {
          return value;
        }
        if (input.type === 'bool') {
          return value === 'true';
        }
        return value;
      });

      if (selectedFn.stateMutability === 'view' || selectedFn.stateMutability === 'pure') {
        // Read function
        const publicClient = getPublicClient();
        const result = await publicClient.readContract({
          address: contract.address as `0x${string}`,
          abi: contract.abi,
          functionName: selectedFunction,
          args,
        });
        setResult({
          type: 'read',
          value: result,
          functionName: selectedFunction
        });
      } else {
        // Write function
        const publicClient = getPublicClient();
        const walletClient = await getWalletClient();
        
        // Simulate the transaction first
        const { request } = await publicClient.simulateContract({
          address: contract.address as `0x${string}`,
          abi: contract.abi,
          functionName: selectedFunction,
          args,
          account: walletClient.account!,
        });
        
        // Execute the transaction
        const hash = await walletClient.writeContract(request);
        toast.info(`Transaction sent: ${hash.slice(0, 10)}...`);
        
        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        setResult({
          type: 'write',
          txHash: hash,
          receipt: {
            ...receipt,
            blockNumber: Number(receipt.blockNumber),
            gasUsed: receipt.gasUsed
          },
          functionName: selectedFunction
        });
        
        toast.success('Transaction confirmed!');
      }
    } catch (error) {
      console.error('Function execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Function execution failed';
      toast.error(errorMessage);
      setResult({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
        {/* Developer Resources */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Developer Resources</h2>
          <p className="text-sm">
            Need some test ETH? Get some from the{' '}
            <a
              href="https://faucet.riselabs.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              RISE Faucet
            </a>
            .
          </p>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contract Info */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Contract Info</h2>
            <div className="space-y-4">
              {/* Contract Selector */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Select Contract</p>
                <select
                  value={selectedContract}
                  onChange={(e) => {
                    setSelectedContract(e.target.value as keyof typeof contracts);
                    setSelectedFunction('');
                    setFunctionInputs({});
                    setResult(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {Object.keys(contracts).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-mono">{selectedContract}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-mono text-xs break-all">{contract.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Block</p>
                <p className="font-mono">{contract.blockNumber}</p>
              </div>
              <div className="pt-2">
                <a
                  href={`https://explorer.testnet.riselabs.xyz/address/${contract.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View on Explorer →
                </a>
              </div>
            </div>
          </Card>

          {/* Function Selector */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Functions</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Read Functions</h3>
                <div className="space-y-1">
                  {readFunctions.map(fn => (
                    <button
                      key={fn.name}
                      onClick={() => handleFunctionSelect(fn.name)}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        selectedFunction === fn.name ? 'bg-blue-100 dark:bg-blue-900' : ''
                      }`}
                    >
                      {fn.name}()
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Write Functions</h3>
                <div className="space-y-1">
                  {writeFunctions.map(fn => (
                    <button
                      key={fn.name}
                      onClick={() => handleFunctionSelect(fn.name)}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        selectedFunction === fn.name ? 'bg-blue-100 dark:bg-blue-900' : ''
                      }`}
                    >
                      {fn.name}()
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Function Interface */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Execute Function</h2>
            
            {selectedFunction ? (
              <div className="space-y-4">
                <h3 className="font-medium">{selectedFunction}</h3>
                
                {functions.find(f => f.name === selectedFunction)?.inputs.map(input => (
                  <div key={input.name}>
                    <label className="block text-sm font-medium mb-1">
                      {input.name} ({input.type})
                    </label>
                    <Input
                      placeholder={`Enter ${input.type}`}
                      value={functionInputs[input.name] || ''}
                      onChange={(e) => setFunctionInputs({
                        ...functionInputs,
                        [input.name]: e.target.value
                      })}
                    />
                  </div>
                ))}
                
                <Button
                  onClick={executeFunction}
                  disabled={isLoading || !activeAddress}
                  className="w-full"
                >
                  {isLoading ? 'Executing...' : 'Execute'}
                </Button>

                {!activeAddress && (
                  <p className="text-sm text-red-600">Please connect a wallet first</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Select a function to execute</p>
            )}
          </Card>
        </div>

        {/* Result Display */}
        {result && (
          <Card className="mt-6 p-6">
            <h2 className="text-lg font-bold mb-4">Result</h2>
            
            {result.type === 'read' && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Function: {result.functionName}</p>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
                  {JSON.stringify(serializeBigInt(result.value), null, 2)}
                </pre>
              </div>
            )}
            
            {result.type === 'write' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Function: {result.functionName}</p>
                <div>
                  <p className="text-sm font-medium">Transaction Hash</p>
                  <a
                    href={`https://explorer.testnet.riselabs.xyz/tx/${result.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-blue-600 hover:underline"
                  >
                    {result.txHash}
                  </a>
                </div>
                <div>
                  <p className="text-sm font-medium">Block Number</p>
                  <p className="font-mono text-sm">{result.receipt?.blockNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Gas Used</p>
                  <p className="font-mono text-sm">{result.receipt?.gasUsed?.toString()}</p>
                </div>
              </div>
            )}
            
            {result.type === 'error' && (
              <div className="text-red-600">
                <p className="font-medium">Error</p>
                <p className="text-sm">{result.error}</p>
              </div>
            )}
          </Card>
        )}

        {/* Historical Events Lookup */}
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-bold mb-4">Historical Events</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Select Event
              </label>
              <select
                value={selectedEventForHistory}
                onChange={(e) => setSelectedEventForHistory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select an event</option>
                {contract.abi
                  .filter((item) => item.type === 'event' && item.name)
                  .map((event) => (
                    <option key={event.name} value={event.name}>
                      {event.name}
                    </option>
                  ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Blocks to Look Back
                </label>
                <Input
                  type="number"
                  value={blockRange.blocksBack}
                  onChange={(e) => setBlockRange({
                    ...blockRange,
                    blocksBack: parseInt(e.target.value) || 0
                  })}
                  min="1"
                  max="1000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Batch Size (max 20)
                </label>
                <Input
                  type="number"
                  value={blockRange.batchSize}
                  onChange={(e) => setBlockRange({
                    ...blockRange,
                    batchSize: Math.min(20, parseInt(e.target.value) || 20)
                  })}
                  min="1"
                  max="20"
                />
              </div>
            </div>
            
            <Button
              onClick={fetchHistoricalEvents}
              disabled={isLoadingHistory || !selectedEventForHistory}
              className="w-full"
            >
              {isLoadingHistory ? 'Loading Events...' : 'Fetch Historical Events'}
            </Button>
            
            {historicalEvents.length > 0 && (
              <div className="mt-4 max-h-96 overflow-y-auto">
                <h3 className="font-medium mb-2">Found {historicalEvents.length} events</h3>
                <div className="space-y-2">
                  {historicalEvents.map((event, index) => (
                    <div key={index} className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                      <div className="font-mono text-xs mb-1">
                        Block #{event.blockNumber?.toString()}
                      </div>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(serializeBigInt(event.args), null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
    </div>
  );
}