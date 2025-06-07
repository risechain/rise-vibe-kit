'use client';

import { Card } from '@/components/ui/card';

export interface KarmaUpdate {
  user: string;
  userId: string;
  karma: string;
  txHash: string;
  timestamp: Date;
}

interface KarmaFeedProps {
  karmaUpdates: KarmaUpdate[];
  maxItems?: number;
}

export function KarmaFeed({ karmaUpdates, maxItems = 5 }: KarmaFeedProps) {
  if (karmaUpdates.length === 0) return null;

  const recentUpdates = karmaUpdates.slice(-maxItems).reverse();

  return (
    <Card className="mt-4 p-4">
      <h3 className="font-semibold mb-2">Recent Karma Updates</h3>
      <div className="space-y-1 text-sm">
        {recentUpdates.map((update, index) => (
          <div key={index} className="text-gray-600 dark:text-gray-400">
            {update.userId} now has {update.karma} karma
          </div>
        ))}
      </div>
    </Card>
  );
}