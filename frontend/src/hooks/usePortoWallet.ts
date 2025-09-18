import { useState, useEffect, useCallback, useRef } from 'react';
import { formatEther } from 'viem';
import { PortoClient } from '@/lib/porto/PortoClient';

export function usePortoWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const portoClientRef = useRef<PortoClient | null>(null);

  const updateBalance = useCallback(async (accountAddress: string) => {
    if (!portoClientRef.current) return;

    try {
      const balanceWei = await portoClientRef.current.getBalance(accountAddress);
      setBalance(formatEther(BigInt(balanceWei)));
    } catch (error) {
      console.error('Failed to fetch Porto balance:', error);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    if (!portoClientRef.current) return;

    try {
      const accounts = await portoClientRef.current.getAccounts();
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        updateBalance(accounts[0]);
      }
    } catch (error) {
      console.error('Failed to check Porto connection:', error);
    }
  }, [updateBalance]);

  // Initialize Porto client
  useEffect(() => {
    if (!portoClientRef.current) {
      portoClientRef.current = new PortoClient();
    }

    // Check for existing connection
    checkConnection();
  }, [checkConnection]);

  // Update balance periodically when connected
  useEffect(() => {
    if (address && isConnected) {
      updateBalance(address);
      const interval = setInterval(() => updateBalance(address), 10000);
      return () => clearInterval(interval);
    }
  }, [address, isConnected, updateBalance]);

  const connect = useCallback(async () => {
    if (!portoClientRef.current) {
      portoClientRef.current = new PortoClient();
    }

    setIsLoading(true);
    try {
      const account = await portoClientRef.current.connect();
      setAddress(account);
      setIsConnected(true);
      updateBalance(account);
      return account;
    } catch (error) {
      console.error('Failed to connect Porto wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateBalance]);

  const disconnect = useCallback(async () => {
    if (!portoClientRef.current) return;

    try {
      await portoClientRef.current.disconnect();
      setAddress(null);
      setIsConnected(false);
      setBalance('0');
    } catch (error) {
      console.error('Failed to disconnect Porto wallet:', error);
    }
  }, []);

  const sendTransaction = useCallback(async (params: {
    to: string;
    data?: string;
    value?: string;
    gasLimit?: string;
  }) => {
    if (!portoClientRef.current) {
      throw new Error('Porto client not initialized');
    }

    if (!isConnected) {
      throw new Error('Porto wallet not connected');
    }

    return await portoClientRef.current.sendTransaction(params);
  }, [isConnected]);

  const signMessage = useCallback(async (message: string) => {
    if (!portoClientRef.current) {
      throw new Error('Porto client not initialized');
    }

    if (!isConnected) {
      throw new Error('Porto wallet not connected');
    }

    return await portoClientRef.current.signMessage(message);
  }, [isConnected]);

  return {
    address,
    balance,
    isConnected,
    isLoading,
    connect,
    disconnect,
    sendTransaction,
    signMessage,
    portoClient: portoClientRef.current,
  };
}