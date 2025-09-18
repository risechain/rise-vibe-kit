'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { usePortoWallet } from '@/hooks/usePortoWallet';

interface PortoContextType {
  address: string | null;
  balance: string;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<string | undefined>;
  disconnect: () => Promise<void>;
  sendTransaction: (params: {
    to: string;
    data?: string;
    value?: string;
    gasLimit?: string;
  }) => Promise<import('viem').TransactionReceipt>;
  signMessage: (message: string) => Promise<string>;
}

const PortoContext = createContext<PortoContextType | undefined>(undefined);

export function PortoProvider({ children }: { children: ReactNode }) {
  const portoWallet = usePortoWallet();

  return (
    <PortoContext.Provider value={portoWallet}>
      {children}
    </PortoContext.Provider>
  );
}

export function usePorto() {
  const context = useContext(PortoContext);
  if (context === undefined) {
    throw new Error('usePorto must be used within a PortoProvider');
  }
  return context;
}