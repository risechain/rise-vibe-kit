'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatUnits } from 'viem';

export interface Order {
  price: bigint;
  size: bigint;
  total?: bigint;
  timestamp?: Date;
}

interface OrderBookProps {
  bids: Order[];
  asks: Order[];
  currentPrice?: bigint;
  decimals?: number;
  priceDecimals?: number;
  sizeDecimals?: number;
  maxRows?: number;
  showSpread?: boolean;
  showDepthBars?: boolean;
  className?: string;
}

export function OrderBook({
  bids,
  asks,
  currentPrice,
  decimals = 18,
  priceDecimals = 2,
  sizeDecimals = 4,
  maxRows = 10,
  showSpread = true,
  showDepthBars = true,
  className = '',
}: OrderBookProps) {
  // Calculate totals and max size for depth visualization
  const processedData = useMemo(() => {
    let bidTotal = BigInt(0);
    let askTotal = BigInt(0);
    
    const processedBids = bids.slice(0, maxRows).map(bid => {
      bidTotal += bid.size;
      return { ...bid, total: bidTotal };
    });
    
    const processedAsks = asks.slice(0, maxRows).map(ask => {
      askTotal += ask.size;
      return { ...ask, total: askTotal };
    });
    
    const maxBidSize = processedBids.reduce((max, bid) => 
      bid.size > max ? bid.size : max, BigInt(0)
    );
    
    const maxAskSize = processedAsks.reduce((max, ask) => 
      ask.size > max ? ask.size : max, BigInt(0)
    );
    
    const maxSize = maxBidSize > maxAskSize ? maxBidSize : maxAskSize;
    
    return {
      bids: processedBids,
      asks: processedAsks,
      maxSize,
      spread: asks.length > 0 && bids.length > 0 
        ? asks[0].price - bids[0].price 
        : BigInt(0),
    };
  }, [bids, asks, maxRows]);

  const formatPrice = (price: bigint) => {
    return parseFloat(formatUnits(price, decimals)).toFixed(priceDecimals);
  };

  const formatSize = (size: bigint) => {
    return parseFloat(formatUnits(size, decimals)).toFixed(sizeDecimals);
  };

  const getDepthPercentage = (size: bigint, maxSize: bigint) => {
    if (maxSize === BigInt(0)) return 0;
    return Number((size * BigInt(100)) / maxSize);
  };

  return (
    <Card className={cn('p-4', className)}>
      <h3 className="text-lg font-semibold mb-4">Order Book</h3>
      
      {/* Headers */}
      <div className="grid grid-cols-3 text-xs font-medium text-gray-500 mb-2">
        <div className="text-left">Price</div>
        <div className="text-right">Size</div>
        <div className="text-right">Total</div>
      </div>
      
      {/* Asks (Sells) */}
      <div className="space-y-1">
        {processedData.asks.length === 0 ? (
          <div className="text-center text-gray-400 py-2 text-sm">No asks</div>
        ) : (
          processedData.asks.reverse().map((ask, index) => (
            <div
              key={`ask-${index}`}
              className="relative grid grid-cols-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {showDepthBars && (
                <div
                  className="absolute inset-0 bg-red-100 dark:bg-red-900/20"
                  style={{
                    width: `${getDepthPercentage(ask.size, processedData.maxSize)}%`,
                  }}
                />
              )}
              <div className="relative z-10 text-red-500 font-medium">
                ${formatPrice(ask.price)}
              </div>
              <div className="relative z-10 text-right">
                {formatSize(ask.size)}
              </div>
              <div className="relative z-10 text-right text-gray-600 dark:text-gray-400">
                {formatSize(ask.total || ask.size)}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Spread */}
      {showSpread && processedData.spread > BigInt(0) && (
        <div className="my-3 py-2 border-y border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Spread</span>
            <span className="font-medium">
              ${formatPrice(processedData.spread)} (
              {asks.length > 0 && bids.length > 0
                ? ((Number(processedData.spread) / Number(bids[0].price)) * 100).toFixed(2)
                : '0.00'}
              %)
            </span>
          </div>
          {currentPrice && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-500">Last Price</span>
              <span className="font-bold text-lg">
                ${formatPrice(currentPrice)}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Bids (Buys) */}
      <div className="space-y-1">
        {processedData.bids.length === 0 ? (
          <div className="text-center text-gray-400 py-2 text-sm">No bids</div>
        ) : (
          processedData.bids.map((bid, index) => (
            <div
              key={`bid-${index}`}
              className="relative grid grid-cols-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {showDepthBars && (
                <div
                  className="absolute inset-0 bg-green-100 dark:bg-green-900/20"
                  style={{
                    width: `${getDepthPercentage(bid.size, processedData.maxSize)}%`,
                  }}
                />
              )}
              <div className="relative z-10 text-green-500 font-medium">
                ${formatPrice(bid.price)}
              </div>
              <div className="relative z-10 text-right">
                {formatSize(bid.size)}
              </div>
              <div className="relative z-10 text-right text-gray-600 dark:text-gray-400">
                {formatSize(bid.total || bid.size)}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Total Bids</p>
            <p className="font-medium text-green-500">
              {processedData.bids.length > 0
                ? formatSize(processedData.bids[processedData.bids.length - 1].total || BigInt(0))
                : '0'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Total Asks</p>
            <p className="font-medium text-red-500">
              {processedData.asks.length > 0
                ? formatSize(processedData.asks[processedData.asks.length - 1].total || BigInt(0))
                : '0'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}