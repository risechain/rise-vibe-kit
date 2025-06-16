'use client';

import { useAutoWallet } from '@/hooks/useAutoWallet';

export function AutoWalletProvider({ children }: { children: React.ReactNode }) {
  useAutoWallet();
  return <>{children}</>;
}