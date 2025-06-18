'use client';

import { useState } from 'react';
import { parseUnits } from 'viem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LeverageSlider } from './LeverageSlider';
import { TransactionButton } from '@/components/web3/TransactionButton';
import { cn } from '@/lib/utils';

interface OrderFormProps {
  asset: string;
  currentPrice: bigint;
  decimals?: number;
  balance?: bigint;
  onSubmit: (order: OrderData) => Promise<unknown>;
  disabled?: boolean;
  className?: string;
}

export interface OrderData {
  side: 'long' | 'short';
  size: bigint;
  leverage: number;
  margin: bigint;
}

export function OrderForm({
  asset,
  currentPrice,
  decimals = 18,
  balance,
  onSubmit,
  disabled = false,
  className = ''
}: OrderFormProps) {
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [marginAmount, setMarginAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Calculate position details
  const margin = marginAmount ? parseUnits(marginAmount, decimals) : BigInt(0);
  const size = margin * BigInt(leverage);
  const liquidationPrice = calculateLiquidationPrice(
    currentPrice,
    leverage,
    side
  );
  
  // Validation
  const hasInsufficientBalance = balance && margin > balance;
  const isValidOrder = margin > 0 && !hasInsufficientBalance;
  
  const handleSubmit = async () => {
    if (!isValidOrder) return;
    
    setIsSubmitting(true);
    try {
      const orderData: OrderData = {
        side,
        size,
        leverage,
        margin
      };
      
      await onSubmit(orderData);
      
      // Reset form on success
      setMarginAmount('');
      setLeverage(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn("p-6 space-y-4", className)}>
      <h3 className="text-lg font-semibold">Place Order - {asset}</h3>
      
      {/* Side Selection */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={side === 'long' ? 'default' : 'outline'}
          onClick={() => setSide('long')}
          disabled={disabled}
          className={side === 'long' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          Long
        </Button>
        <Button
          variant={side === 'short' ? 'default' : 'outline'}
          onClick={() => setSide('short')}
          disabled={disabled}
          className={side === 'short' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          Short
        </Button>
      </div>
      
      {/* Margin Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Margin Amount (USD)</label>
        <Input
          type="number"
          placeholder="0.00"
          value={marginAmount}
          onChange={(e) => setMarginAmount(e.target.value)}
          disabled={disabled}
          className={hasInsufficientBalance ? 'border-red-500' : ''}
        />
        {balance && (
          <p className="text-xs text-gray-500">
            Available: ${parseFloat(formatUnits(balance, decimals)).toFixed(2)}
          </p>
        )}
        {hasInsufficientBalance && (
          <p className="text-xs text-red-500">Insufficient balance</p>
        )}
      </div>
      
      {/* Leverage Slider */}
      <LeverageSlider
        value={leverage}
        onChange={setLeverage}
        disabled={disabled}
      />
      
      {/* Order Summary */}
      {margin > 0 && (
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Position Size</span>
            <span className="font-medium">
              ${parseFloat(formatUnits(size, decimals)).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Entry Price</span>
            <span className="font-medium">
              ${parseFloat(formatUnits(currentPrice, decimals)).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Liquidation Price</span>
            <span className="font-medium text-orange-500">
              ${parseFloat(formatUnits(liquidationPrice, decimals)).toFixed(2)}
            </span>
          </div>
        </div>
      )}
      
      {/* Submit Button */}
      <TransactionButton
        onClick={handleSubmit}
        text={`Open ${side.toUpperCase()} Position`}
        loadingText="Opening position..."
        successText="Position opened!"
        disabled={disabled || !isValidOrder || isSubmitting}
        variant={side === 'long' ? 'default' : 'destructive'}
        className="w-full"
      />
    </Card>
  );
}

// Helper function to calculate liquidation price
function calculateLiquidationPrice(
  entryPrice: bigint,
  leverage: number,
  side: 'long' | 'short'
): bigint {
  const maintenanceMargin = 0.5; // 0.5% maintenance margin
  const liquidationThreshold = (100 - maintenanceMargin) / leverage;
  
  if (side === 'long') {
    return entryPrice * BigInt(Math.floor((100 - liquidationThreshold) * 100)) / BigInt(10000);
  } else {
    return entryPrice * BigInt(Math.floor((100 + liquidationThreshold) * 100)) / BigInt(10000);
  }
}

// Import formatUnits for the component
import { formatUnits } from 'viem';