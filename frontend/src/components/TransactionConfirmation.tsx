'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

interface TransactionConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'pending' | 'confirming' | 'confirmed' | 'error';
  message?: string;
  txHash?: string;
  error?: string;
  duration?: number;
}

export function TransactionConfirmation({
  isOpen,
  onClose,
  status,
  message = 'Transaction',
  txHash,
  error,
  duration
}: TransactionConfirmationProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (status === 'confirmed') {
      // Auto-close after 2 seconds for confirmed transactions
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  const getStatusContent = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Loader2 className="w-12 h-12 animate-spin text-blue-500" />,
          title: 'Waiting for Signature',
          description: 'Please confirm the transaction in your wallet'
        };
      case 'confirming':
        return {
          icon: <Loader2 className="w-12 h-12 animate-spin text-yellow-500" />,
          title: 'Transaction Submitted',
          description: 'Waiting for confirmation on the blockchain'
        };
      case 'confirmed':
        return {
          icon: <CheckCircle className="w-12 h-12 text-green-500" />,
          title: 'Transaction Confirmed!',
          description: `Your ${message.toLowerCase()} has been confirmed`
        };
      case 'error':
        return {
          icon: <XCircle className="w-12 h-12 text-red-500" />,
          title: 'Transaction Failed',
          description: error || 'Something went wrong'
        };
    }
  };

  const { icon, title, description } = getStatusContent();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && status === 'error' && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex flex-col items-center text-center space-y-4">
          {icon}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {description}
          </p>
          
          {duration && status === 'confirmed' && (
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              Confirmed in {duration}ms
            </p>
          )}
          
          {txHash && (status === 'confirming' || status === 'confirmed') && (
            <div className="w-full">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showDetails ? 'Hide' : 'Show'} Transaction Details
              </button>
              
              {showDetails && (
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs break-all">
                  <p className="text-gray-700 dark:text-gray-300">
                    Transaction Hash: {txHash}
                  </p>
                  <a
                    href={`https://explorer.testnet.riselabs.xyz/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-block mt-1"
                  >
                    View on Explorer →
                  </a>
                </div>
              )}
            </div>
          )}
          
          {status === 'error' && (
            <Button
              onClick={onClose}
              variant="outline"
              className="mt-4"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}