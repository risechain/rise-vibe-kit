'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast-manager';
import { useAccount } from 'wagmi';

export interface TransactionButtonProps {
  onClick: () => Promise<unknown>;
  text: string;
  loadingText?: string;
  successText?: string;
  showDuration?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  className?: string;
}

export function TransactionButton({
  onClick,
  text,
  loadingText = 'Processing...',
  successText = 'Success!',
  showDuration = true,
  variant = 'default',
  size = 'default',
  disabled = false,
  className
}: TransactionButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [duration, setDuration] = useState<number | null>(null);
  const { connector } = useAccount();
  
  const handleClick = useCallback(async () => {
    if (state === 'loading' || disabled) return;
    
    setState('loading');
    const startTime = Date.now();
    const isEmbeddedWallet = connector?.id === 'embedded-wallet';
    
    let toastId: string | number | undefined;
    
    try {
      // Show appropriate loading message
      if (isEmbeddedWallet) {
        toastId = toast.info(loadingText, { autoClose: false });
      } else {
        toastId = toast.info('Confirm transaction in wallet...', { autoClose: false });
      }
      
      // Execute the transaction
      const result = await onClick();
      
      // Calculate duration
      const txDuration = Date.now() - startTime;
      setDuration(txDuration);
      
      // Update state and toast
      setState('success');
      const successMessage = showDuration 
        ? `${successText} Confirmed in ${txDuration}ms`
        : successText;
        
      if (toastId !== undefined) {
        toast.update(toastId, {
          render: successMessage,
          type: 'success',
          autoClose: 5000
        });
      } else {
        toast.success(successMessage);
      }
      
      // Reset state after a delay
      setTimeout(() => {
        setState('idle');
        setDuration(null);
      }, 3000);
      
      return result;
    } catch (error) {
      setState('error');
      
      // Handle user rejection
      const errorMessage = error instanceof Error ? error.message : '';
      const isRejection = (error as { code?: string }).code === 'ACTION_REJECTED' || 
                         errorMessage.includes('rejected');
      
      if (toastId !== undefined) {
        toast.update(toastId, {
          render: isRejection ? 'Transaction cancelled' : errorMessage || 'Transaction failed',
          type: 'error',
          autoClose: 5000
        });
      } else {
        toast.error(isRejection ? 'Transaction cancelled' : errorMessage || 'Transaction failed');
      }
      
      // Reset state after a delay
      setTimeout(() => {
        setState('idle');
      }, 3000);
      
      throw error;
    }
  }, [onClick, state, disabled, connector?.id, loadingText, successText, showDuration]);
  
  // Determine button text based on state
  const buttonText = state === 'loading' ? loadingText : 
                    state === 'success' ? (duration && showDuration ? `✓ ${duration}ms` : '✓ Success') :
                    state === 'error' ? 'Failed' : 
                    text;
  
  return (
    <Button
      onClick={handleClick}
      disabled={disabled || state === 'loading'}
      variant={state === 'success' ? 'default' : state === 'error' ? 'destructive' : variant}
      size={size}
      className={className}
    >
      {buttonText}
    </Button>
  );
}