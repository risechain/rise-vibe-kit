'use client';

import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PriceDisplayProps {
  price?: bigint;
  decimals?: number;
  symbol?: string;
  showSymbol?: boolean;
  showChange?: boolean;
  previousPrice?: bigint;
  refreshInterval?: number;
  onPriceUpdate?: (price: bigint) => void;
  className?: string;
  precision?: number;
}

export function PriceDisplay({
  price,
  decimals = 18,
  symbol = 'USD',
  showSymbol = true,
  showChange = false,
  previousPrice,
  refreshInterval,
  onPriceUpdate,
  className = '',
  precision = 2
}: PriceDisplayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');

  // Calculate price change
  useEffect(() => {
    if (price && previousPrice && showChange) {
      const currentPrice = parseFloat(formatUnits(price, decimals));
      const prevPrice = parseFloat(formatUnits(previousPrice, decimals));
      
      if (prevPrice > 0) {
        const change = ((currentPrice - prevPrice) / prevPrice) * 100;
        setPriceChange(change);
        setPriceDirection(change > 0 ? 'up' : change < 0 ? 'down' : 'neutral');
      }
    }
  }, [price, previousPrice, decimals, showChange]);

  // Simulate refresh effect
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 300);
        
        if (onPriceUpdate && price) {
          onPriceUpdate(price);
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, onPriceUpdate, price]);

  if (isLoading) {
    return <Skeleton className={cn("h-6 w-24", className)} />;
  }

  if (!price) {
    return <span className={cn("text-gray-500", className)}>--</span>;
  }

  const formattedPrice = parseFloat(formatUnits(price, decimals)).toFixed(precision);
  
  const changeColor = priceDirection === 'up' 
    ? 'text-green-500' 
    : priceDirection === 'down' 
    ? 'text-red-500' 
    : 'text-gray-500';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-mono font-medium">
        {showSymbol && symbol === 'USD' && '$'}
        {formattedPrice}
        {showSymbol && symbol !== 'USD' && ` ${symbol}`}
      </span>
      
      {showChange && priceChange !== 0 && (
        <span className={cn("text-sm font-medium", changeColor)}>
          {priceDirection === 'up' ? '↑' : '↓'}
          {Math.abs(priceChange).toFixed(2)}%
        </span>
      )}
    </div>
  );
}