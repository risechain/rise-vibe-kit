"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { P256, PublicKey } from 'ox';
import { Hooks } from 'rise-wallet/wagmi';
import { useConnection } from 'wagmi';
import { GLOBAL_PERMISSIONS } from '@/config/rise-wallet-permissions';

type PermissionsConfig = typeof GLOBAL_PERMISSIONS;

interface SessionKey {
  id: string;
  publicKey: string;
  type: string;
  expiry: number;
  hasPrivateKey: boolean;
}

export function useRiseWalletSessionKey(customPermissions?: PermissionsConfig) {
  const { address, isConnected, connector } = useConnection();
  const [keyPair, setKeyPair] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: permissions, isLoading: loading } = Hooks.usePermissions({
    address: address as `0x${string}` | undefined,
    connector,
  });
  const grantPermissions = Hooks.useGrantPermissions();
  const revokePermissions = Hooks.useRevokePermissions();

  // Get stored private key from localStorage
  const getStoredKey = useCallback((publicKey: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const keyData = localStorage.getItem(`rise.sessionKey.${publicKey}`);
      if (keyData) {
        const parsed = JSON.parse(keyData);
        if (parsed.publicKey && parsed.privateKey) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }, []);

  // Transform permissions into active session keys
  const activeSessionKeys = useMemo<SessionKey[]>(() => {
    if (!permissions) return [];

    const now = Math.floor(Date.now() / 1000);

    return permissions
      .filter((p: { key?: { publicKey?: string }; expiry?: number }) =>
        p.key?.publicKey && (p.expiry || 0) > now
      )
      .map((p: { id: string; key: { publicKey: string; type?: string }; expiry: number }) => ({
        id: p.id,
        publicKey: p.key.publicKey,
        type: p.key.type || 'p256',
        expiry: p.expiry,
        hasPrivateKey: !!getStoredKey(p.key.publicKey),
      }));
  }, [permissions, getStoredKey]);

  // Restore keyPair from localStorage when permissions load
  useEffect(() => {
    if (typeof window === 'undefined' || !isConnected) return;

    // Already have a valid keyPair
    if (keyPair && activeSessionKeys.some(k => k.publicKey === keyPair.publicKey)) {
      return;
    }

    // No active keys yet
    if (activeSessionKeys.length === 0 || loading) {
      return;
    }

    // Find first active key with stored private key
    const activeKey = activeSessionKeys.find(k => k.hasPrivateKey);
    if (activeKey) {
      const stored = getStoredKey(activeKey.publicKey);
      if (stored) {
        setKeyPair(stored);
      }
    }
  }, [activeSessionKeys, keyPair, loading, isConnected, getStoredKey]);

  const createSessionKey = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setIsCreating(true);
    try {
      // Generate P256 keypair
      const privateKey = P256.randomPrivateKey();
      const publicKey = PublicKey.toHex(P256.getPublicKey({ privateKey }), {
        includePrefix: false,
      });

      const newKeyPair = { privateKey, publicKey };
      setKeyPair(newKeyPair);

      // Store in localStorage
      localStorage.setItem(
        `rise.sessionKey.${publicKey}`,
        JSON.stringify(newKeyPair)
      );

      // Grant permissions
      const result = await grantPermissions.mutateAsync({
        key: { publicKey, type: 'p256' as const },
        expiry: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
        feeToken: {
          limit: '1',
          symbol: 'ETH',
        },
        permissions: customPermissions || GLOBAL_PERMISSIONS,
      } as Parameters<typeof grantPermissions.mutateAsync>[0]);

      return result;
    } catch (error) {
      console.error('Failed to create session key:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [isConnected, address, grantPermissions, customPermissions]);

  const revokeSessionKey = useCallback(
    async (keyId: string) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      const keyToRevoke = activeSessionKeys.find(k => k.id === keyId);
      if (!keyToRevoke) {
        throw new Error('Session key not found');
      }

      await revokePermissions.mutateAsync({ id: keyId as `0x${string}` });

      // Clear from state and localStorage
      if (keyPair?.publicKey === keyToRevoke.publicKey) {
        setKeyPair(null);
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem(`rise.sessionKey.${keyToRevoke.publicKey}`);
      }
    },
    [isConnected, address, activeSessionKeys, revokePermissions, keyPair]
  );

  const hasUsableSessionKey = useMemo(() => {
    if (!keyPair || loading) return false;
    const now = Math.floor(Date.now() / 1000);
    return activeSessionKeys.some(
      k => k.publicKey === keyPair.publicKey && k.hasPrivateKey && k.expiry > now
    );
  }, [keyPair, activeSessionKeys, loading]);

  return {
    keyPair,
    activeSessionKeys,
    hasUsableSessionKey,
    createSessionKey,
    revokeSessionKey,
    isCreating,
    loading,
  };
}
