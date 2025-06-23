'use client';

import { useEffect } from 'react';
import { Check, ExternalLink, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { shortAddress } from '@/lib/web3-utils';

interface SuccessNotificationProps {
  title?: string;
  message?: string;
  transactionHash?: string;
  contractAddress?: string;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
  className?: string;
}

export function SuccessNotification({
  title = 'Success!',
  message = 'Transaction completed successfully',
  transactionHash,
  contractAddress,
  onClose,
  autoClose = true,
  autoCloseDelay = 10000,
  className = ''
}: SuccessNotificationProps) {
  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  const explorerUrl = 'https://explorer.testnet.riselabs.xyz';

  return (
    <Card className={`p-4 border-green-500/20 bg-green-500/5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-1 bg-green-500/10 rounded-full">
          <Check className="h-5 w-5 text-green-500" />
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{title}</h4>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">{message}</p>
          
          <div className="flex flex-wrap gap-2 pt-2">
            {transactionHash && (
              <a
                href={`${explorerUrl}/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Tx: {shortAddress(transactionHash)}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            
            {contractAddress && (
              <a
                href={`${explorerUrl}/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Contract: {shortAddress(contractAddress)}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Minimal success toast for react-toastify
export function SuccessToast({
  message,
  transactionHash
}: {
  message: string;
  transactionHash?: string;
}) {
  const explorerUrl = 'https://explorer.testnet.riselabs.xyz';
  
  return (
    <div className="flex items-start gap-2">
      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        {transactionHash && (
          <a
            href={`${explorerUrl}/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            View transaction
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}