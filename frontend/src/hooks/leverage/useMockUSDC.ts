import { useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { toast } from '@/lib/toast-manager';
import { contracts } from '@/contracts/contracts';

export function useMockUSDC() {
  const { address } = useAccount();

  // Read balance
  const { data: balance = 0n, refetch: refetchBalance } = useReadContract({
    address: contracts.USDC.address,
    abi: contracts.USDC.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  });

  // Request tokens from faucet
  const requestTokens = useCallback(() => {
    if (!address) {
      toast.error('Please connect your wallet to continue');
      return;
    }

    // Open RISE faucet in new tab
    window.open('https://faucet.risechain.com/', '_blank');
    toast.info('Opening RISE faucet in a new tab...');
  }, [address]);

  return {
    balance,
    requestTokens,
    isLoading: false,
    refetchBalance,
  };
}