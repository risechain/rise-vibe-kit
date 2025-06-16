'use client';

import { useState } from 'react';
import { copyToClipboard } from '@/lib/utils';
import { toast } from 'react-toastify';

interface AddressDisplayProps {
  address: string;
  showCopy?: boolean;
  truncate?: boolean;
  truncateLength?: number;
  className?: string;
  copyText?: string;
}

export function AddressDisplay({
  address,
  showCopy = true,
  truncate = true,
  truncateLength = 4,
  className = '',
  copyText = 'Address copied!'
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);
  
  const displayAddress = truncate 
    ? `${address.slice(0, truncateLength + 2)}...${address.slice(-truncateLength)}`
    : address;
  
  const handleCopy = async () => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      toast.success(copyText);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy address');
    }
  };
  
  return (
    <span 
      className={`font-mono text-sm ${showCopy ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={showCopy ? handleCopy : undefined}
      title={showCopy ? 'Click to copy' : address}
    >
      {displayAddress}
      {showCopy && copied && ' ✓'}
    </span>
  );
}