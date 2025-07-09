'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

// Skeleton loader for card content
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </Card>
  );
}

// Skeleton loader for list items
export function ListSkeleton({ 
  items = 3,
  className = '' 
}: { 
  items?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton loader for transaction history
export function TransactionSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

// Skeleton loader for contract data
export function ContractDataSkeleton({ className = '' }: { className?: string }) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div>
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// Generic loading spinner
export function LoadingSpinner({ 
  size = 'default',
  className = '' 
}: { 
  size?: 'small' | 'default' | 'large';
  className?: string;
}) {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${sizeClasses[size]}`} />
    </div>
  );
}

// Page loading state
export function PageLoading({ 
  message = 'Loading...',
  className = '' 
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <div className={`min-h-[400px] flex flex-col items-center justify-center space-y-4 ${className}`}>
      <LoadingSpinner size="large" />
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}

// Inline loading state for buttons or small areas
export function InlineLoading({ 
  text = 'Loading',
  className = '' 
}: { 
  text?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LoadingSpinner size="small" />
      <span className="text-sm">{text}</span>
    </span>
  );
}