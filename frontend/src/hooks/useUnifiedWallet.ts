import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import { usePorto } from '@/providers/PortoProvider';
import { useEmbeddedWalletEnhanced } from './useEmbeddedWalletEnhanced';
import { RiseSyncClient } from '@/lib/rise-sync-client';

type WalletType = 'porto' | 'embedded' | 'external' | null;

export function useUnifiedWallet() {
  const { address: wagmiAddress, isConnected: wagmiConnected, connector } = useAccount();
  const {
    address: portoAddress,
    isConnected: portoConnected,
    sendTransaction: portoSendTransaction,
    signMessage: portoSignMessage,
    balance: portoBalance
  } = usePorto();
  const embeddedWallet = useEmbeddedWalletEnhanced();

  // Determine active wallet type
  const getWalletType = (): WalletType => {
    if (portoConnected && portoAddress) return 'porto';
    if (wagmiConnected && connector?.id === 'embedded-wallet') return 'embedded';
    if (wagmiConnected) return 'external';
    return null;
  };

  const walletType = getWalletType();
  const isConnected = portoConnected || wagmiConnected;
  const address = portoAddress || wagmiAddress || null;

  // Unified send transaction method
  const sendTransaction = useCallback(async (params: {
    to: string;
    data?: string;
    value?: string;
    gasLimit?: string;
  }) => {
    const wallet = getWalletType();

    switch (wallet) {
      case 'porto':
        // Use Porto wallet for transaction
        return await portoSendTransaction(params);

      case 'embedded':
        // Use RiseSyncClient for embedded wallet
        if (!embeddedWallet.account) {
          throw new Error('Embedded wallet not connected');
        }

        // Get private key from storage
        const privateKey = await embeddedWallet.exportPrivateKey();
        if (!privateKey) {
          throw new Error('No private key found for embedded wallet');
        }

        const syncClient = new RiseSyncClient(privateKey);
        try {
          const receipt = await syncClient.sendTransaction(params);
          return receipt;
        } finally {
          syncClient.cleanup();
        }

      case 'external':
        // Use wagmi for external wallets - this would need to be implemented
        // based on your existing external wallet flow
        throw new Error('External wallet transactions not yet implemented in unified hook');

      default:
        throw new Error('No wallet connected');
    }
  }, [walletType, portoSendTransaction, embeddedWallet]);

  // Unified sign message method
  const signMessage = useCallback(async (message: string) => {
    const wallet = getWalletType();

    switch (wallet) {
      case 'porto':
        return await portoSignMessage(message);

      case 'embedded':
      case 'external':
        // Would need to implement wagmi signing
        throw new Error('Message signing not yet implemented for this wallet type');

      default:
        throw new Error('No wallet connected');
    }
  }, [walletType, portoSignMessage]);

  // Get balance
  const getBalance = useCallback(async () => {
    const wallet = getWalletType();

    switch (wallet) {
      case 'porto':
        return portoBalance;

      case 'embedded':
        return embeddedWallet.balance;

      case 'external':
        // Would need to get from wagmi
        return '0';

      default:
        return '0';
    }
  }, [walletType, portoBalance, embeddedWallet.balance]);

  return {
    address,
    isConnected,
    walletType,
    sendTransaction,
    signMessage,
    getBalance,
    // Expose individual wallet hooks for specific needs
    porto: usePorto(),
    embedded: embeddedWallet,
  };
}