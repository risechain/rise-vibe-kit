'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from './PriceDisplay';
import { PnLDisplay } from './PnLDisplay';
import { formatUnits } from 'viem';
import { cn } from '@/lib/utils';

export interface Position {
  id: string;
  asset: string;
  side: 'long' | 'short';
  size: bigint;
  entryPrice: bigint;
  currentPrice: bigint;
  leverage: number;
  margin: bigint;
  liquidationPrice: bigint;
  timestamp: Date;
  isOpen: boolean;
}

interface PositionCardProps {
  position: Position;
  onClose?: (positionId: string) => void;
  showActions?: boolean;
  decimals?: number;
  className?: string;
}

export function PositionCard({
  position,
  onClose,
  showActions = true,
  decimals = 18,
  className = ''
}: PositionCardProps) {
  const {
    id,
    asset,
    side,
    size,
    entryPrice,
    currentPrice,
    leverage,
    margin,
    liquidationPrice,
    isOpen
  } = position;

  // Calculate PnL
  const sizeValue = parseFloat(formatUnits(size, decimals));
  const entryPriceValue = parseFloat(formatUnits(entryPrice, decimals));
  const currentPriceValue = parseFloat(formatUnits(currentPrice, decimals));
  
  const pnl = side === 'long' 
    ? (currentPriceValue - entryPriceValue) * sizeValue
    : (entryPriceValue - currentPriceValue) * sizeValue;
    
  const pnlPercentage = (pnl / parseFloat(formatUnits(margin, decimals))) * 100;
  
  // Calculate distance to liquidation
  const liquidationPriceValue = parseFloat(formatUnits(liquidationPrice, decimals));
  const distanceToLiquidation = side === 'long'
    ? ((currentPriceValue - liquidationPriceValue) / currentPriceValue) * 100
    : ((liquidationPriceValue - currentPriceValue) / currentPriceValue) * 100;

  const isNearLiquidation = distanceToLiquidation < 10;

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{asset}</h3>
            <Badge 
              variant={side === 'long' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {side.toUpperCase()} {leverage}x
            </Badge>
            {!isOpen && (
              <Badge variant="secondary" className="text-xs">
                Closed
              </Badge>
            )}
          </div>
          
          {showActions && isOpen && onClose && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onClose(id)}
            >
              Close
            </Button>
          )}
        </div>

        {/* Position Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Size</p>
            <p className="font-medium">{sizeValue.toFixed(4)} {asset}</p>
          </div>
          
          <div>
            <p className="text-gray-500 dark:text-gray-400">Margin</p>
            <p className="font-medium">
              <PriceDisplay 
                price={margin} 
                decimals={decimals} 
                precision={2}
              />
            </p>
          </div>
          
          <div>
            <p className="text-gray-500 dark:text-gray-400">Entry Price</p>
            <p className="font-medium">
              <PriceDisplay 
                price={entryPrice} 
                decimals={decimals} 
                precision={2}
              />
            </p>
          </div>
          
          <div>
            <p className="text-gray-500 dark:text-gray-400">Current Price</p>
            <p className="font-medium">
              <PriceDisplay 
                price={currentPrice} 
                decimals={decimals} 
                precision={2}
                previousPrice={entryPrice}
                showChange={true}
              />
            </p>
          </div>
        </div>

        {/* PnL Display */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">PnL</span>
            <PnLDisplay
              pnl={pnl}
              pnlPercentage={pnlPercentage}
              showBoth={true}
            />
          </div>
        </div>

        {/* Liquidation Warning */}
        {isOpen && isNearLiquidation && (
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-md">
            <p className="text-xs text-red-600 dark:text-red-400">
              ⚠️ Near liquidation! Price: ${liquidationPriceValue.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}