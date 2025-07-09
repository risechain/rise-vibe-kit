'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PriceChart, type PriceData } from './PriceChart';
import { OrderBook, type Order } from './OrderBook';
export type { PriceData } from './PriceChart';
export type { Order } from './OrderBook';
import { PriceDisplay } from '@/components/leverage/defi/PriceDisplay';
import { formatUnits } from 'viem';

export interface TradingViewProps {
  priceData: PriceData[];
  bids: Order[];
  asks: Order[];
  currentPrice: bigint;
  decimals?: number;
  asset: string;
  volume24h?: bigint;
  high24h?: bigint;
  low24h?: bigint;
  onTimeframeChange?: (timeframe: string) => void;
  selectedTimeframe?: string;
  className?: string;
}

export function TradingView({
  priceData,
  bids,
  asks,
  currentPrice,
  decimals = 18,
  asset,
  volume24h,
  high24h,
  low24h,
  onTimeframeChange,
  selectedTimeframe = '1H',
  className = '',
}: TradingViewProps) {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [showOrderBook, setShowOrderBook] = useState(true);

  const timeframes = ['5M', '15M', '1H', '4H', '1D', '1W'];

  // Calculate 24h change
  const change24h = priceData.length >= 2 
    ? ((Number(currentPrice) - Number(priceData[0].price)) / Number(priceData[0].price)) * 100
    : 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with stats */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">{asset}</h2>
            <div className="flex items-center gap-4 mt-2">
              <PriceDisplay
                price={currentPrice}
                decimals={decimals}
                previousPrice={priceData.length > 0 ? priceData[0].price : undefined}
                showChange={true}
                precision={2}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">24h Volume</p>
              <p className="font-medium">
                ${volume24h ? parseFloat(formatUnits(volume24h, decimals)).toFixed(2) : '--'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">24h High</p>
              <p className="font-medium">
                ${high24h ? parseFloat(formatUnits(high24h, decimals)).toFixed(2) : '--'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">24h Low</p>
              <p className="font-medium">
                ${low24h ? parseFloat(formatUnits(low24h, decimals)).toFixed(2) : '--'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">24h Change</p>
              <p className={cn(
                'font-medium',
                change24h >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Chart controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            {timeframes.map((tf) => (
              <Button
                key={tf}
                variant={selectedTimeframe === tf ? 'default' : 'outline'}
                size="sm"
                onClick={() => onTimeframeChange?.(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
            >
              Area
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              Line
            </Button>
            <Button
              variant={showOrderBook ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOrderBook(!showOrderBook)}
            >
              Order Book
            </Button>
          </div>
        </div>
      </Card>

      {/* Main content */}
      <div className={cn(
        'grid gap-4',
        showOrderBook ? 'lg:grid-cols-3' : 'grid-cols-1'
      )}>
        {/* Price chart */}
        <div className={showOrderBook ? 'lg:col-span-2' : ''}>
          <PriceChart
            data={priceData}
            decimals={decimals}
            height={500}
            chartType={chartType}
            showVolume={true}
            currentPrice={currentPrice}
            referenceLines={[
              ...(high24h ? [{
                value: high24h,
                label: '24h High',
                color: '#10b981'
              }] : []),
              ...(low24h ? [{
                value: low24h,
                label: '24h Low',
                color: '#ef4444'
              }] : []),
            ]}
          />
        </div>

        {/* Order book */}
        {showOrderBook && (
          <div>
            <OrderBook
              bids={bids}
              asks={asks}
              currentPrice={currentPrice}
              decimals={decimals}
              maxRows={15}
              showDepthBars={true}
            />
          </div>
        )}
      </div>

      {/* Additional indicators (placeholder for future) */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">RSI (14)</p>
            <p className="font-medium">--</p>
          </div>
          <div>
            <p className="text-gray-500">MACD</p>
            <p className="font-medium">--</p>
          </div>
          <div>
            <p className="text-gray-500">MA (20)</p>
            <p className="font-medium">--</p>
          </div>
          <div>
            <p className="text-gray-500">Volume MA</p>
            <p className="font-medium">--</p>
          </div>
        </div>
      </Card>
    </div>
  );
}