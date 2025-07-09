'use client';

import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface TransactionPendingProps {
  message?: string;
  transactionHash?: string;
  className?: string;
}

export function TransactionPending({ 
  message = 'Transaction pending...', 
  transactionHash,
  className = ''
}: TransactionPendingProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center space-x-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          {transactionHash && (
            <p className="text-xs text-muted-foreground mt-1">
              Transaction: {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}