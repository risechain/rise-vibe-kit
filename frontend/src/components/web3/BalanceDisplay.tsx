'use client';

import { formatUnits } from 'viem';
import { useBalance } from 'wagmi';
import { Skeleton } from '@/components/ui/skeleton';

interface BalanceDisplayProps {
  address?: `0x${string}`;
  decimals?: number;
  symbol?: string;
  showSymbol?: boolean;
  precision?: number;
  className?: string;
}

export function BalanceDisplay({
  address,
  decimals = 18,
  symbol = 'ETH',
  showSymbol = true,
  precision = 4,
  className = ''
}: BalanceDisplayProps) {
  const { data: balance, isLoading, isError } = useBalance({
    address,
  });

  if (!address) return null;

  if (isLoading) {
    return <Skeleton className={`h-4 w-20 ${className}`} />;
  }

  if (isError) {
    return <span className={`text-red-500 ${className}`}>Error</span>;
  }

  const formattedBalance = balance 
    ? parseFloat(formatUnits(balance.value, decimals)).toFixed(precision)
    : '0.0000';

  return (
    <span className={`font-mono ${className}`}>
      {formattedBalance}
      {showSymbol && ` ${symbol}`}
    </span>
  );
}