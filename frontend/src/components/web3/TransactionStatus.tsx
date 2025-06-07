'use client';

import { useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface TransactionStatusProps {
  hash?: `0x${string}`;
  onSuccess?: (receipt: unknown) => void;
  onError?: (error: Error) => void;
  showExplorer?: boolean;
  className?: string;
}

export function TransactionStatus({
  hash,
  onSuccess,
  onError,
  showExplorer = true,
  className = ''
}: TransactionStatusProps) {
  const { 
    data: receipt, 
    isLoading, 
    isSuccess,
    isError,
    error 
  } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess && receipt && onSuccess) {
      onSuccess(receipt);
    }
  }, [isSuccess, receipt, onSuccess]);

  useEffect(() => {
    if (isError && error && onError) {
      onError(error as Error);
    }
  }, [isError, error, onError]);

  if (!hash) return null;

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="h-5 w-5 rounded-full animate-pulse" />
        <span className="text-sm">Confirming...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <Badge variant="destructive" className={className}>
        Transaction Failed
      </Badge>
    );
  }

  if (isSuccess) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="default">
          Confirmed
        </Badge>
        {showExplorer && (
          <a
            href={`https://explorer.testnet.riselabs.xyz/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            View
          </a>
        )}
      </div>
    );
  }

  return null;
}