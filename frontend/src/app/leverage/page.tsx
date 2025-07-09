'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits, parseUnits, parseAbi } from 'viem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLeverageTrading } from '@/hooks/leverage/useLeverageTrading';
import { useMockUSDC } from '@/hooks/leverage/useMockUSDC';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { PriceChart } from '@/components/leverage/dataviz/PriceChart';
import { LeverageSlider } from '@/components/leverage/defi/LeverageSlider';
import { BalancePercentageSlider } from '@/components/leverage/defi/BalancePercentageSlider';
import type { PriceData } from '@/components/leverage/dataviz/PriceChart';
import { TokenBTC as Bitcoin } from '@web3icons/react';
import { contracts } from '@/contracts/contracts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { getFeedIdFromHash } from '@/lib/feedIdMapping';
import { createContractHookPayable } from '@/hooks/useContractFactory';
import { toast } from '@/lib/toast-manager';

interface TradeEvent {
  id: string;
  type: 'PositionOpened' | 'PositionClosed' | 'PositionLiquidated';
  data: {
    positionId?: bigint;
    amount?: bigint;
    leverage?: bigint;
    isLong?: boolean;
    trader?: string;
    feedId?: string;
    price?: bigint;
    pnl?: bigint;
    reason?: string;
  };
  timestamp: Date;
}

// Create USDC contract hook
const useUSDCContract = createContractHookPayable('USDC');

export default function LeverageTradingPage() {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const { openPosition, closePosition, userPositions, isLoading } = useLeverageTrading();
  const { balance, requestTokens } = useMockUSDC();
  const { contractEvents, subscribeToContract } = useWebSocket();
  const usdcContract = useUSDCContract();
  
  // Form state
  const [amount, setAmount] = useState('0');
  const [balancePercentage, setBalancePercentage] = useState(10); // Default 10% of balance
  const [leverage, setLeverage] = useState(5); // Display value (e.g., 5 for 5x)
  const [asset, setAsset] = useState<'BTC'>('BTC');
  const [closingPositions, setClosingPositions] = useState<Set<string>>(new Set());
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isApproving, setIsApproving] = useState(false);
  
  // Get max leverage for selected asset
  const maxLeverageForAsset = 100; // BTC max leverage
  
  // Oracle price state
  const [btcOraclePrice, setBtcOraclePrice] = useState<bigint | null>(null);
  const [ethOraclePrice, setEthOraclePrice] = useState<bigint | null>(null);
  const [btcPriceData, setBtcPriceData] = useState<PriceData[]>([]);
  
  // Check allowance
  useEffect(() => {
    const checkAllowance = async () => {
      if (!address || !publicClient) return;
      
      try {
        const currentAllowance = await publicClient.readContract({
          address: contracts.USDC.address,
          abi: parseAbi(['function allowance(address owner, address spender) view returns (uint256)']),
          functionName: 'allowance',
          args: [address, contracts.LeverageTrading.address]
        }) as bigint;
        
        setAllowance(currentAllowance);
        console.log('Current USDC allowance:', formatUnits(currentAllowance, 6));
      } catch (error) {
        console.error('Error checking allowance:', error);
      }
    };
    
    checkAllowance();
    // Check every 5 seconds
    const interval = setInterval(checkAllowance, 5000);
    
    return () => clearInterval(interval);
  }, [address, publicClient]);
  
  // Trade events state
  const [tradeEvents, setTradeEvents] = useState<TradeEvent[]>([]);
  
  const handleClosePosition = async (positionId: bigint) => {
    setClosingPositions(prev => new Set([...prev, positionId.toString()]));
    try {
      await closePosition(positionId);
    } finally {
      setClosingPositions(prev => {
        const newSet = new Set(prev);
        newSet.delete(positionId.toString());
        return newSet;
      });
    }
  };
  
  // Calculate P&L for a position
  const calculatePnL = (position: { entryPrice: bigint; leverage: bigint; amount: bigint; isLong: boolean }, currentPrice: number | undefined) => {
    if (!currentPrice) return null;
    
    const entryPrice = Number(formatUnits(position.entryPrice, 18));
    const leverageDisplay = Number(position.leverage) / 10000; // Convert from contract format
    const amount = Number(formatUnits(position.amount, 6));
    const positionSize = amount * leverageDisplay;
    const priceDiff = currentPrice - entryPrice;
    // const priceChangePercent = (priceDiff / entryPrice) * 100;
    const pnl = position.isLong 
      ? (priceDiff / entryPrice) * positionSize
      : -(priceDiff / entryPrice) * positionSize;
    
    // P&L percentage is based on the initial collateral (amount), not position size
    const pnlPercent = (pnl / amount) * 100;
    
    return { pnl, pnlPercent };
  };
  
  // Process contract events from WebSocket provider (same as events page)
  useEffect(() => {
    // Filter for LeverageTradingV3 events
    const leverageEvents = contractEvents.filter(
      event => event.address?.toLowerCase() === contracts.LeverageTrading.address.toLowerCase()
    );
    
    leverageEvents.forEach(event => {
      if (!event.eventName || !event.args) return;
      
      // Create unique event ID
      const eventId = `${event.eventName}-${event.transactionHash}-${event.logIndex}`;
      
      if (event.eventName === 'PositionOpened' && event.args) {
        setTradeEvents(prev => {
          // Check if already exists
          if (prev.some(e => e.id === eventId)) return prev;
          
          const newEvent = {
            id: eventId,
            type: 'PositionOpened' as const,
            data: {
              positionId: event.args!.positionId as bigint,
              trader: event.args!.trader as string,
              amount: event.args!.amount as bigint,
              entryPrice: event.args!.entryPrice as bigint,
              leverage: event.args!.leverage as bigint,
              isLong: event.args!.isLong as boolean,
              feedId: event.args!.feedId as string
            },
            timestamp: event.timestamp || new Date()
          };
          return [newEvent, ...prev].slice(0, 50);
        });
      } else if (event.eventName === 'PositionClosed' && event.args) {
        setTradeEvents(prev => {
          // Check if already exists
          if (prev.some(e => e.id === eventId)) return prev;
          
          const newEvent = {
            id: eventId,
            type: 'PositionClosed' as const,
            data: {
              positionId: event.args!.positionId as bigint,
              trader: event.args!.trader as string,
              pnl: event.args!.pnl as bigint,
              exitPrice: event.args!.exitPrice as bigint
            },
            timestamp: event.timestamp || new Date()
          };
          return [newEvent, ...prev].slice(0, 50);
        });
      } else if (event.eventName === 'PositionLiquidated' && event.args) {
        setTradeEvents(prev => {
          // Check if already exists
          if (prev.some(e => e.id === eventId)) return prev;
          
          const newEvent = {
            id: eventId,
            type: 'PositionLiquidated' as const,
            data: {
              positionId: event.args!.positionId as bigint,
              trader: event.args!.trader as string,
              exitPrice: event.args!.exitPrice as bigint
            },
            timestamp: event.timestamp || new Date()
          };
          return [newEvent, ...prev].slice(0, 50);
        });
      }
    });
  }, [contractEvents]);
  
  // Subscribe to contracts
  useEffect(() => {
    subscribeToContract(contracts.PriceOracle.address);
    subscribeToContract(contracts.LeverageTrading.address);
  }, [subscribeToContract]);
  
  // Process contract events
  useEffect(() => {
    // Oracle events
    const oracleEvents = contractEvents.filter(
      event => event.address?.toLowerCase() === contracts.PriceOracle.address.toLowerCase()
    );

    // Process PriceUpdated events
    const priceUpdatedEvents = oracleEvents.filter(event => event.eventName === 'PriceUpdated');
    
    priceUpdatedEvents.forEach(event => {
      if (event.args && 'price' in event.args) {
        const price = event.args!.price as bigint;
        const timestamp = Date.now();
        
        // For indexed string parameters, we need to check the topics
        // The feedId is the second topic (first is event signature)
        if (event.topics && event.topics.length > 1) {
          const feedIdHash = event.topics[1];
          const feedId = getFeedIdFromHash(feedIdHash);
          
          if (feedId === 'BTCUSD') {
            setBtcOraclePrice(price);
            setBtcPriceData(prev => [...prev, { price, timestamp: new Date(timestamp) }].slice(-50));
          } else if (feedId === 'ETHUSD') {
            setEthOraclePrice(price);
          }
        }
      }
    });
  }, [contractEvents]);
  
  const currentOraclePrice = btcOraclePrice;
  const currentOraclePriceNumber = currentOraclePrice 
    ? Number(formatUnits(currentOraclePrice, 18))
    : undefined;
    
  // Calculate amount based on balance percentage
  useEffect(() => {
    if (balance && typeof balance === 'bigint' && balance > 0n) {
      const balanceNumber = Number(formatUnits(balance, 6));
      const calculatedAmount = (balanceNumber * balancePercentage / 100).toFixed(2);
      setAmount(calculatedAmount);
    }
  }, [balance, balancePercentage]);
    
  // Check if we need approval for current amount
  const amountBigInt = amount ? parseUnits(amount, 6) : 0n;
  const needsApproval = allowance < amountBigInt;
  
  const handleApprove = async () => {
    if (!address) return;
    
    setIsApproving(true);
    try {
      // Approve max uint256 for convenience
      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      
      console.log('Approving USDC spend for LeverageTrading contract...');
      const result = await usdcContract.write('approve', [contracts.LeverageTrading.address, maxApproval]);
      
      console.log('Approval result:', result);
      toast.success('USDC approved for trading!');
      
      // Check allowance immediately after approval
      if (publicClient) {
        const newAllowance = await publicClient.readContract({
          address: contracts.USDC.address,
          abi: parseAbi(['function allowance(address owner, address spender) view returns (uint256)']),
          functionName: 'allowance',
          args: [address, contracts.LeverageTrading.address]
        }) as bigint;
        
        setAllowance(newAllowance);
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve USDC');
    } finally {
      setIsApproving(false);
    }
  };
  
  const handleOpenPosition = async (isLong: boolean) => {
    try {
      await openPosition(amount, leverage, isLong, asset);
      // Position will be added via event listener
    } catch (error) {
      console.error('Error opening position:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>
          <p className="text-gray-500">Please connect your wallet to access leverage trading</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shreds go brrrr.......</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart with asset selector */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Select value={asset} onValueChange={(v) => setAsset(v as 'BTC')}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC">
                      <div className="flex items-center gap-2">
                        <Bitcoin size={16} />
                        <span>BTC/USD</span>
                      </div>
                    </SelectItem>
                    {/* Add more assets here as needed:
                    <SelectItem value="ETH">
                      <div className="flex items-center gap-2">
                        <Ethereum size={16} />
                        <span>ETH/USD</span>
                      </div>
                    </SelectItem>
                    */}
                  </SelectContent>
                </Select>
                <div className="text-2xl font-bold">
                  {currentOraclePriceNumber ? `$${currentOraclePriceNumber.toFixed(2)}` : 'Loading...'}
                </div>
                {currentOraclePrice && (
                  <Badge variant="outline" className="text-xs">Live</Badge>
                )}
              </div>
            </div>
            
            {btcPriceData.length > 0 ? (
              <PriceChart
                data={btcPriceData}
                decimals={18}
                height={400}
                chartType="line"
                showGrid={true}
                currentPrice={btcOraclePrice || undefined}
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-gray-500">
                Waiting for BTC price data...
              </div>
            )}
          </Card>
        </div>
        
        {/* Right Column - Trading Panel */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Trade {asset}/USD</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Trade Amount</Label>
                  <span className="text-lg font-semibold">
                    {amount} USDC
                    <span className="text-sm text-gray-500 ml-2">({balancePercentage}%)</span>
                  </span>
                </div>
                <BalancePercentageSlider
                  value={balancePercentage}
                  onChange={setBalancePercentage}
                  marks={[10, 25, 50, 75, 100]}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-500">
                    Balance: {balance && typeof balance === 'bigint' ? Number(formatUnits(balance, 6)).toFixed(2) : '0'} USDC
                  </p>
                  {(!balance || balance === 0n) && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => requestTokens()}
                      className="p-0 h-auto"
                    >
                      Get test USDC
                    </Button>
                  )}
                </div>
                
                {/* Manual input option */}
                <div className="mt-3">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      // Update percentage based on manual input
                      if (balance && typeof balance === 'bigint' && balance > 0n && e.target.value) {
                        const balanceNumber = Number(formatUnits(balance, 6));
                        const inputAmount = Number(e.target.value);
                        const newPercentage = Math.min(100, Math.round((inputAmount / balanceNumber) * 100));
                        setBalancePercentage(newPercentage);
                      }
                    }}
                    placeholder="Enter amount manually"
                    min="0"
                    step="0.01"
                    className="text-sm"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Leverage</Label>
                  <span className="text-lg font-semibold">{leverage}x</span>
                </div>
                <LeverageSlider
                  value={leverage}
                  onChange={setLeverage}
                  max={maxLeverageForAsset}
                  marks={[1, 5, 10, 25, 50, 100]}
                />
              </div>
              
              {/* Show approval button if needed */}
              {needsApproval && amountBigInt > 0n && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                    USDC approval required for trading
                  </p>
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {isApproving ? 'Approving...' : 'Approve USDC'}
                  </Button>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 mt-6">
                <Button
                  onClick={() => handleOpenPosition(false)}
                  disabled={isLoading || !amount || Number(amount) <= 0}
                  variant="destructive"
                  size="lg"
                  className="w-full"
                >
                  Short
                </Button>
                <Button
                  onClick={() => handleOpenPosition(true)}
                  disabled={isLoading || !amount || Number(amount) <= 0}
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Long
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Bottom Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Panel 1 - User Positions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Your Positions</h3>
          <ScrollArea className="h-[300px]">
            {userPositions && userPositions.length > 0 ? (
              <div className="space-y-3">
                {userPositions.map((position) => {
                  // Get the correct price based on position's feedId
                  const positionPrice = position.feedId === 'BTCUSD' 
                    ? (btcOraclePrice ? Number(formatUnits(btcOraclePrice, 18)) : undefined)
                    : (ethOraclePrice ? Number(formatUnits(ethOraclePrice, 18)) : undefined);
                  const pnlData = calculatePnL(position, positionPrice);
                  const leverageDisplay = Number(position.leverage) / 10000;
                  
                  return (
                    <Card key={position.id.toString()} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={position.isLong ? 'default' : 'destructive'}>
                              {position.isLong ? 'LONG' : 'SHORT'}
                            </Badge>
                            <span className="font-medium">{position.feedId.replace('USD', '/USD')}</span>
                            <span className="text-sm text-gray-500">{leverageDisplay}x</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Size: ${Number(formatUnits(position.amount, 6)).toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Entry: ${Number(formatUnits(position.entryPrice, 18)).toFixed(2)}
                          </div>
                          {pnlData && (
                            <div className={`text-sm font-medium ${pnlData.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              P&L: ${pnlData.pnl.toFixed(2)} ({pnlData.pnlPercent.toFixed(2)}%)
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleClosePosition(position.id)}
                          disabled={closingPositions.has(position.id.toString())}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No open positions
              </div>
            )}
          </ScrollArea>
        </Card>
        
        {/* Panel 2 - Live Trade Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Live Trade Activity</h3>
            {tradeEvents.length > 0 && (
              <Badge variant="outline" className="text-xs">Live</Badge>
            )}
          </div>
          <ScrollArea className="h-[300px]">
            {tradeEvents.length > 0 ? (
              <div className="space-y-2">
                {tradeEvents.map((event) => (
                  <div key={event.id} className="text-sm border-b pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            event.type === 'PositionOpened' ? 'border-blue-500 text-blue-500' :
                            event.type === 'PositionClosed' ? 'border-gray-500 text-gray-500' :
                            'border-red-500 text-red-500'
                          }`}
                        >
                          {event.type === 'PositionOpened' ? 'OPENED' :
                           event.type === 'PositionClosed' ? 'CLOSED' : 'LIQUIDATED'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {event.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {event.type === 'PositionOpened' && (
                        <>
                          {event.data.trader?.slice(0, 6)}...{event.data.trader?.slice(-4)} | 
                          {event.data.isLong ? 'Long' : 'Short'} {event.data.feedId} | 
                          Size: ${Number(formatUnits(event.data.amount || 0n, 6)).toFixed(2)} | 
                          Leverage: {Number(event.data.leverage || 0n) / 10000}x
                        </>
                      )}
                      {event.type === 'PositionClosed' && (
                        <>
                          {event.data.trader?.slice(0, 6)}...{event.data.trader?.slice(-4)} | 
                          Position #{event.data.positionId?.toString()} | 
                          P&L: ${Number(formatUnits(event.data.pnl || 0n, 6)).toFixed(2)}
                        </>
                      )}
                      {event.type === 'PositionLiquidated' && (
                        <>
                          Position #{event.data.positionId?.toString()} liquidated
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No trades yet
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}