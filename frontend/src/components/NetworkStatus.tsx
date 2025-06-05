'use client';

import { useAccount } from 'wagmi';
import { RISE_RPC_URL, RISE_WS_URL, RISE_CHAIN_ID } from '@/config/websocket';
import { Badge } from '@/components/ui/badge';

export function NetworkStatus() {
  const { chain } = useAccount();

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg text-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">Chain:</span>
          <Badge variant={chain?.id === RISE_CHAIN_ID ? 'default' : 'destructive'}>
            {chain?.name || 'Not connected'} ({chain?.id || 'N/A'})
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">RPC:</span>
          <code className="text-xs">{RISE_RPC_URL}</code>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">WS:</span>
          <code className="text-xs">{RISE_WS_URL}</code>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Expected Chain ID:</span>
          <code className="text-xs">{RISE_CHAIN_ID}</code>
        </div>
      </div>
    </div>
  );
}