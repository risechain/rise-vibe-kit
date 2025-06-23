import { useState, useCallback } from 'react';
import { type Hash } from 'viem';
import { usePublicClient } from 'wagmi';
import { toast } from 'react-toastify';

export type TransactionStatus = 
  | 'idle' 
  | 'pending' 
  | 'confirming' 
  | 'confirmed' 
  | 'failed'
  | 'reverted';

interface TransactionState {
  status: TransactionStatus;
  hash?: Hash;
  confirmations: number;
  error?: Error;
  receipt?: unknown;
}

/**
 * Hook to track transaction status
 * Provides real-time updates on transaction confirmation
 */
export function useTransactionStatus() {
  const publicClient = usePublicClient();
  const [transactions, setTransactions] = useState<Map<Hash, TransactionState>>(new Map());

  // Track a new transaction
  const trackTransaction = useCallback(async (hash: Hash, description?: string) => {
    console.log('🔍 Tracking transaction:', hash);
    
    // Set initial pending state
    setTransactions(prev => new Map(prev).set(hash, {
      status: 'pending',
      hash,
      confirmations: 0
    }));

    if (description) {
      toast.info(`Transaction submitted: ${description}`, {
        autoClose: 3000
      });
    }

    try {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 60_000
      });

      if (receipt.status === 'success') {
        setTransactions(prev => new Map(prev).set(hash, {
          status: 'confirmed',
          hash,
          confirmations: 1,
          receipt
        }));

        toast.success(`Transaction confirmed${description ? `: ${description}` : ''}`, {
          autoClose: 5000
        });
      } else {
        setTransactions(prev => new Map(prev).set(hash, {
          status: 'reverted',
          hash,
          confirmations: 0,
          receipt
        }));

        toast.error(`Transaction reverted${description ? `: ${description}` : ''}`, {
          autoClose: 7000
        });
      }
    } catch (error) {
      console.error('Transaction tracking error:', error);
      
      setTransactions(prev => new Map(prev).set(hash, {
        status: 'failed',
        hash,
        confirmations: 0,
        error: error as Error
      }));

      toast.error(`Transaction failed${description ? `: ${description}` : ''}`, {
        autoClose: 7000
      });
    }
  }, [publicClient]);

  // Get status of a specific transaction
  const getTransactionStatus = useCallback((hash: Hash): TransactionState | undefined => {
    return transactions.get(hash);
  }, [transactions]);

  // Clear a transaction from tracking
  const clearTransaction = useCallback((hash: Hash) => {
    setTransactions(prev => {
      const next = new Map(prev);
      next.delete(hash);
      return next;
    });
  }, []);

  // Clear all transactions
  const clearAllTransactions = useCallback(() => {
    setTransactions(new Map());
  }, []);

  // Get all transactions as array
  const getAllTransactions = useCallback((): TransactionState[] => {
    return Array.from(transactions.values());
  }, [transactions]);

  // Check if any transaction is pending
  const hasPendingTransactions = useCallback((): boolean => {
    return Array.from(transactions.values()).some(tx => tx.status === 'pending');
  }, [transactions]);

  return {
    trackTransaction,
    getTransactionStatus,
    clearTransaction,
    clearAllTransactions,
    getAllTransactions,
    hasPendingTransactions,
    transactions: getAllTransactions()
  };
}