'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { TradingView } from '@/components/dataviz/TradingView';
import { OrderForm } from '@/components/defi/OrderForm';
import { PositionCard } from '@/components/defi/PositionCard';
import { LiquidationAlert } from '@/components/defi/LiquidationAlert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePerpExchange } from '@/hooks/usePerpExchange';
// import { useEventCache } from '@/hooks/useEventCache';
import type { PriceData, Order } from '@/components/dataviz/TradingView';
import type { Position as PositionCardType } from '@/components/defi/PositionCard';

export default function PerpsPage() {
  const { address, isConnected } = useAccount();
  const [userPositions, setUserPositions] = useState<PositionCardType[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1H');
  
  const {
    currentPrice,
    isPriceStale,
    openLongPosition,
    openShortPosition,
    closePositionById,
    forcePriceUpdate,
    getPosition,
    getPositionHealth,
    isOpeningPosition,
    isUpdatingPrice,
  } = usePerpExchange();

  // Mock events for demo - in production, you would extend useEventCache to support PerpExchange
  const priceEvents: Array<{ timestamp: Date; args: { newPrice: string } }> = useMemo(() => {
    if (!currentPrice) return [];
    // Generate mock price history
    const now = new Date();
    const events = [];
    for (let i = 24; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const randomVariation = 0.95 + Math.random() * 0.1; // -5% to +5%
      events.push({
        timestamp,
        args: {
          newPrice: (Number(currentPrice) * randomVariation).toFixed(0)
        }
      });
    }
    return events;
  }, [currentPrice]);


  // Transform price events to chart data
  const priceData: PriceData[] = useMemo(() => {
    return priceEvents.map(event => ({
      timestamp: event.timestamp || new Date(),
      price: BigInt(event.args?.newPrice as string || '0'),
      volume: BigInt(0), // Volume not tracked in this example
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [priceEvents]);

  // Mock order book data (in real app, this would come from an indexer or contract)
  const mockOrderBook = useMemo(() => {
    if (!currentPrice) return { bids: [], asks: [] };
    
    const basePrice = Number(formatEther(currentPrice));
    const bids: Order[] = [];
    const asks: Order[] = [];
    
    // Generate mock bids
    for (let i = 1; i <= 10; i++) {
      bids.push({
        price: parseEther((basePrice - i * 0.5).toFixed(2)),
        size: parseEther((Math.random() * 10).toFixed(4)),
      });
    }
    
    // Generate mock asks
    for (let i = 1; i <= 10; i++) {
      asks.push({
        price: parseEther((basePrice + i * 0.5).toFixed(2)),
        size: parseEther((Math.random() * 10).toFixed(4)),
      });
    }
    
    return { bids, asks };
  }, [currentPrice]);

  // Load user positions
  useEffect(() => {
    const loadUserPositions = async () => {
      if (!address) return;
      
      const positionEvents: Array<{ args: { trader?: string; positionId?: string } }> = [];
      
      const userPositionEvents = positionEvents.filter(
        event => event.args?.trader?.toLowerCase() === address.toLowerCase()
      );
      
      const positions: PositionCardType[] = [];
      
      for (const event of userPositionEvents) {
        const positionId = event.args?.positionId as string;
        if (!positionId) continue;
        
        const position = await getPosition(Number(positionId));
        if (!position) continue;
        
        // const health = await getPositionHealth(Number(positionId));
        
        positions.push({
          id: positionId,
          asset: 'ETH-PERP',
          side: position.isLong ? 'long' : 'short',
          size: position.size,
          entryPrice: position.entryPrice,
          currentPrice: (currentPrice as bigint) || BigInt(0),
          leverage: Number(position.size / position.collateral),
          margin: position.collateral,
          liquidationPrice: BigInt(0), // Calculate based on position
          timestamp: new Date(Number(position.entryTimestamp) * 1000),
          isOpen: position.isOpen,
        });
      }
      
      setUserPositions(positions);
    };
    
    loadUserPositions();
  }, [address, getPosition, getPositionHealth, currentPrice]);

  // Handle order submission
  const handleOrderSubmit = async (order: { side: string; margin: bigint; leverage: number }) => {
    const { side, margin, leverage } = order;
    const marginEth = formatEther(margin);
    
    if (side === 'long') {
      openLongPosition(marginEth, leverage);
    } else {
      openShortPosition(marginEth, leverage);
    }
  };

  // Handle position close
  const handleClosePosition = async (positionId: string) => {
    closePositionById(Number(positionId));
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p>Please connect your wallet to access the perpetual exchange.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Perpetual Exchange</h1>
        <div className="flex items-center gap-4">
          <Badge variant="outline">Stork Oracle</Badge>
          {isPriceStale && (
            <Badge variant="destructive">Price Stale</Badge>
          )}
          <Button
            onClick={forcePriceUpdate}
            disabled={isUpdatingPrice}
            variant="outline"
            size="sm"
          >
            {isUpdatingPrice ? 'Updating...' : 'Force Price Update'}
          </Button>
        </div>
      </div>

      {/* Trading View */}
      <TradingView
        priceData={priceData}
        bids={mockOrderBook.bids}
        asks={mockOrderBook.asks}
        currentPrice={(currentPrice as bigint) || BigInt(0)}
        asset="ETH-PERP"
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={setSelectedTimeframe}
      />

      {/* Trading Interface */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Form */}
        <div>
          <OrderForm
            asset="ETH-PERP"
            currentPrice={(currentPrice as bigint) || BigInt(0)}
            onSubmit={handleOrderSubmit}
            disabled={isOpeningPosition}
          />
        </div>

        {/* Positions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Your Positions</h2>
          
          {/* Liquidation Alerts */}
          {userPositions.filter(p => p.isOpen).length > 0 && (
            <LiquidationAlert
              positions={userPositions.filter(p => p.isOpen)}
              currentPrices={{ 'ETH-PERP': (currentPrice as bigint) || BigInt(0) }}
              threshold={20}
            />
          )}
          
          {/* Position Cards */}
          {userPositions.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <p>No positions yet. Open your first position to start trading!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {userPositions.map((position) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  onClose={handleClosePosition}
                  showActions={position.isOpen}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20">
        <h3 className="text-lg font-semibold mb-2">How Stork Oracle Works in This Exchange</h3>
        <ul className="space-y-2 text-sm">
          <li>• Positions use real-time price feeds from Stork Oracle for accurate market prices</li>
          <li>• Anyone can submit signed price updates to the oracle to keep prices fresh</li>
          <li>• Prices are considered stale after 1 hour without updates</li>
          <li>• Positions are automatically liquidated when losses exceed 80% of collateral</li>
          <li>• The oracle ensures decentralized, tamper-resistant price data</li>
        </ul>
      </Card>
    </div>
  );
}