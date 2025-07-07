'use client';

import { useChainId, useChains } from 'wagmi';
import { Badge } from '@/components/ui/badge';

interface NetworkBadgeProps {
  className?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function NetworkBadge({ 
  className = '', 
  variant = 'default' 
}: NetworkBadgeProps) {
  const chainId = useChainId();
  const chains = useChains();
  
  const currentChain = chains.find(chain => chain.id === chainId);
  
  if (!currentChain) {
    return (
      <Badge variant="destructive" className={className}>
        Unknown Network
      </Badge>
    );
  }
  
  const isTestnet = currentChain.testnet ?? false;
  
  return (
    <Badge 
      variant={isTestnet ? 'secondary' : variant} 
      className={className}
    >
      {currentChain.name}
    </Badge>
  );
}