'use client';

import { cn } from '@/lib/utils';

interface PnLDisplayProps {
  pnl: number;
  pnlPercentage?: number;
  showBoth?: boolean;
  showSign?: boolean;
  precision?: number;
  className?: string;
}

export function PnLDisplay({
  pnl,
  pnlPercentage,
  showBoth = false,
  showSign = true,
  precision = 2,
  className = ''
}: PnLDisplayProps) {
  const isProfit = pnl >= 0;
  const colorClass = isProfit ? 'text-green-500' : 'text-red-500';
  
  const formatValue = (value: number, isPercentage: boolean = false) => {
    const formatted = Math.abs(value).toFixed(precision);
    const sign = showSign && value !== 0 ? (isProfit ? '+' : '-') : '';
    const suffix = isPercentage ? '%' : '';
    
    return `${sign}${isPercentage ? '' : '$'}${formatted}${suffix}`;
  };

  if (showBoth && pnlPercentage !== undefined) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className={cn("font-medium", colorClass)}>
          {formatValue(pnl)}
        </span>
        <span className={cn("text-sm", colorClass)}>
          ({formatValue(pnlPercentage, true)})
        </span>
      </div>
    );
  }

  if (pnlPercentage !== undefined && !showBoth) {
    return (
      <span className={cn("font-medium", colorClass, className)}>
        {formatValue(pnlPercentage, true)}
      </span>
    );
  }

  return (
    <span className={cn("font-medium", colorClass, className)}>
      {formatValue(pnl)}
    </span>
  );
}