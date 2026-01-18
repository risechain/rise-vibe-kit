"use client";

import { useState, useCallback } from 'react';
import { Hex, P256, Signature } from 'ox';
import { type Address, type Hex as HexAddress } from 'viem';
import { useConnection, useChainId, useSendCalls } from 'wagmi';

export type TransactionCall = {
  to: HexAddress;
  data?: HexAddress;
  value?: HexAddress;
};

export type TransactionProps = {
  calls: TransactionCall[];
  sessionKey?: {
    publicKey: string;
    privateKey: string;
  };
};

type TransactionResult = {
  success: boolean;
  error: { message: string } | null;
  data: {
    callId: string;
    transactionHash?: string;
    receipts?: unknown[];
    usedSessionKey: boolean;
  } | null;
};

export function useRiseWalletTransaction() {
  const [isLoading, setIsLoading] = useState(false);
  const [executingTxId, setExecutingTxId] = useState<string | null>(null);
  const chainId = useChainId();
  const { connector, address } = useConnection();
  const { mutateAsync } = useSendCalls();

  const executeWithPasskey = useCallback(async (calls: TransactionCall[]): Promise<TransactionResult> => {
    if (!connector) throw new Error('No connector available');

    const provider = (await connector.getProvider()) as {
      request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
    };

    try {
      console.log('[executeWithPasskey] Starting transaction...');
      const result = await mutateAsync({
        calls,
        version: '1',
      } as Parameters<typeof mutateAsync>[0]);

      const callId = result.id;
      console.log('[executeWithPasskey] Got call ID:', callId);
      if (!callId) {
        throw new Error('No call ID returned');
      }

      console.log('[executeWithPasskey] Checking status...');
      const status = await provider.request({
        method: 'wallet_getCallsStatus',
        params: [callId as Address],
      }) as { status: number; receipts?: { transactionHash?: string }[] };
      console.log('[executeWithPasskey] Status received:', status);

      return {
        success: status.status === 200,
        error: status.status !== 200 ? { message: `Transaction failed with status ${status.status}` } : null,
        data: {
          callId,
          transactionHash: status.receipts?.[0]?.transactionHash,
          receipts: status.receipts,
          usedSessionKey: false,
        },
      };
    } catch (error) {
      console.error('Passkey transaction error:', error);
      return {
        success: false,
        error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
        data: null,
      };
    }
  }, [connector, mutateAsync]);

  const executeWithSessionKey = useCallback(async (
    calls: TransactionCall[],
    sessionKey: { publicKey: string; privateKey: string }
  ): Promise<TransactionResult> => {
    if (!connector) throw new Error('No connector available');
    if (!address) throw new Error('No address available');

    const provider = (await connector.getProvider()) as {
      request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
    };

    try {
      // Prepare calls
      const { digest, capabilities, ...request } = await provider.request({
        method: 'wallet_prepareCalls',
        params: [{
          calls,
          chainId: Hex.fromNumber(chainId),
          from: address,
          atomicRequired: true,
          key: {
            publicKey: sessionKey.publicKey,
            type: 'p256',
          },
        }],
      }) as { digest: `0x${string}`; capabilities?: unknown; [key: string]: unknown };

      // Sign with P256 key
      const signature = Signature.toHex(
        P256.sign({
          payload: digest,
          privateKey: sessionKey.privateKey as Address,
        })
      );

      // Send prepared calls
      const result = await provider.request({
        method: 'wallet_sendPreparedCalls',
        params: [{
          ...request,
          ...(capabilities ? { capabilities } : {}),
          signature,
        }],
      }) as { id: string } | { id: string }[];

      const callId = Array.isArray(result) ? result[0]?.id : result.id;
      if (!callId) {
        throw new Error('No call ID returned');
      }

      // Get transaction status
      const status = await provider.request({
        method: 'wallet_getCallsStatus',
        params: [callId as Address],
      }) as { status: number; receipts?: { transactionHash?: string }[] };

      return {
        success: status.status === 200,
        error: status.status !== 200 ? { message: `Transaction failed with status ${status.status}` } : null,
        data: {
          callId,
          transactionHash: status.receipts?.[0]?.transactionHash,
          receipts: status.receipts,
          usedSessionKey: true,
        },
      };
    } catch (error) {
      console.error('Session key transaction error:', error);
      return {
        success: false,
        error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
        data: null,
      };
    }
  }, [connector, address, chainId]);

  const execute = useCallback(async (props: TransactionProps) => {
    // Prevent duplicate calls
    const txId = JSON.stringify(props.calls, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );

    if (isLoading || executingTxId === txId) {
      console.log('Transaction already in progress, skipping...');
      return;
    }

    setIsLoading(true);
    setExecutingTxId(txId);

    try {
      if (props.sessionKey) {
        return await executeWithSessionKey(props.calls, props.sessionKey);
      } else {
        return await executeWithPasskey(props.calls);
      }
    } finally {
      setIsLoading(false);
      setExecutingTxId(null);
    }
  }, [executeWithPasskey, executeWithSessionKey, isLoading, executingTxId]);

  return {
    execute,
    isLoading,
  };
}
