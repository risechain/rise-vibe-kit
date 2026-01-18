'use client';

import { useConnection, useConnect, useDisconnect, useConnectors } from 'wagmi';
import { Button } from '@/components/ui/button';

export function WalletSelector() {
  const { address, isConnected } = useConnection();
  const {mutate:connect } = useConnect();
  const connectors= useConnectors()
  const { mutate:disconnect } = useDisconnect();

  if (!isConnected) {
    // Only show one button for Rise Wallet (the first/only connector)
    const riseWalletConnector = connectors[0];

    return (
      <Button
        onClick={() => connect({ connector: riseWalletConnector })}
        variant="outline"
        size="sm"
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </span>
      <Button onClick={() => disconnect()} variant="outline" size="sm">
        Disconnect
      </Button>
    </div>
  );
}
