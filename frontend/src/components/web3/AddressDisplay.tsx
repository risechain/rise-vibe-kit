'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast-manager';

interface AddressDisplayProps {
  address: string;
  showFull?: boolean;
  className?: string;
}

export function AddressDisplay({ address, showFull = false, className = '' }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);
  const displayAddress = showFull ? address : `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy address');
    }
  };

  return (
    <span
      className={`font-mono text-sm cursor-pointer hover:opacity-75 transition-opacity ${className}`}
      onClick={handleCopy}
      title="Click to copy"
    >
      {displayAddress}
      {copied && ' ✅'}
    </span>
  );
}