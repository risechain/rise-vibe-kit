'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoUrl?: string;
  price?: bigint;
  balance?: bigint;
}

interface TokenSelectorProps {
  tokens: Token[];
  selectedToken?: Token;
  onSelect: (token: Token) => void;
  showBalance?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TokenSelector({
  tokens,
  selectedToken,
  onSelect,
  showBalance = true,
  placeholder = "Select token",
  disabled = false,
  className = ''
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredTokens = tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (token: Token) => {
    onSelect(token);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          {selectedToken ? (
            <div className="flex items-center gap-2">
              {selectedToken.logoUrl && (
                <img 
                  src={selectedToken.logoUrl} 
                  alt={selectedToken.symbol}
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span className="font-medium">{selectedToken.symbol}</span>
              <span className="text-sm text-gray-500">{selectedToken.name}</span>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <svg
            className="w-4 h-4 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Token</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {filteredTokens.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No tokens found</p>
            ) : (
              filteredTokens.map(token => (
                <TokenItem
                  key={token.address}
                  token={token}
                  isSelected={selectedToken?.address === token.address}
                  showBalance={showBalance}
                  onClick={() => handleSelect(token)}
                />
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TokenItemProps {
  token: Token;
  isSelected: boolean;
  showBalance: boolean;
  onClick: () => void;
}

function TokenItem({ token, isSelected, showBalance, onClick }: TokenItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
        isSelected && "bg-blue-50 dark:bg-blue-900/20 border border-blue-500"
      )}
    >
      <div className="flex items-center gap-3">
        {token.logoUrl && (
          <img 
            src={token.logoUrl} 
            alt={token.symbol}
            className="w-8 h-8 rounded-full"
          />
        )}
        <div className="text-left">
          <p className="font-medium">{token.symbol}</p>
          <p className="text-sm text-gray-500">{token.name}</p>
        </div>
      </div>
      
      {showBalance && token.balance !== undefined && (
        <div className="text-right">
          <p className="text-sm font-medium">
            {formatBalance(token.balance, token.decimals)}
          </p>
          {token.price && (
            <p className="text-xs text-gray-500">
              ${formatPrice(token.price)}
            </p>
          )}
        </div>
      )}
    </button>
  );
}

// Helper functions
function formatBalance(balance: bigint, decimals: number): string {
  const value = Number(balance) / Math.pow(10, decimals);
  if (value > 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (value > 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toFixed(4);
}

function formatPrice(price: bigint, decimals: number = 18): string {
  const value = Number(price) / Math.pow(10, decimals);
  return value.toFixed(2);
}