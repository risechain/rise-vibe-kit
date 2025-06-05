import { useState, useEffect, useCallback, useRef } from 'react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { type Account } from 'viem';
import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from 'viem';
import { NonceManager } from '@/lib/wallet/NonceManager';
import { RISE_RPC_URL, RISE_CHAIN_ID } from '@/config/websocket';
import { JsonRpcProvider, formatEther } from 'ethers';

const STORAGE_KEY = 'rise-embedded-wallet';

// Define RISE chain
const riseChain = {
  id: RISE_CHAIN_ID,
  name: 'RISE Testnet',
  network: 'rise-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [RISE_RPC_URL] },
    public: { http: [RISE_RPC_URL] },
  },
  testnet: true,
} as const;

export function useEmbeddedWalletEnhanced() {
  const [account, setAccount] = useState<Account | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<string>('0');
  const nonceManagerRef = useRef<NonceManager | null>(null);
  const publicClientRef = useRef<PublicClient | null>(null);
  const walletClientRef = useRef<WalletClient | null>(null);

  // Initialize clients
  useEffect(() => {
    publicClientRef.current = createPublicClient({
      chain: riseChain,
      transport: http(RISE_RPC_URL),
    });
  }, []);

  // Initialize wallet from storage
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    const savedPrivateKey = localStorage.getItem(STORAGE_KEY);
    
    if (savedPrivateKey) {
      try {
        const acc = privateKeyToAccount(savedPrivateKey as `0x${string}`);
        setAccount(acc);
        setIsConnected(true);
        
        // Create wallet client
        walletClientRef.current = createWalletClient({
          account: acc,
          chain: riseChain,
          transport: http(RISE_RPC_URL),
        });
        
        // Initialize nonce manager
        const provider = new JsonRpcProvider(RISE_RPC_URL);
        nonceManagerRef.current = new NonceManager(provider, acc.address);
        nonceManagerRef.current.initialize();
      } catch (error) {
        console.error('Invalid saved private key:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    
    setIsLoading(false);
  }, []);

  // Update balance
  useEffect(() => {
    if (account?.address && publicClientRef.current) {
      const updateBalance = async () => {
        try {
          const balance = await publicClientRef.current!.getBalance({
            address: account.address,
          });
          setBalance(formatEther(balance.toString()));
        } catch (error) {
          console.error('Failed to fetch balance:', error);
        }
      };

      updateBalance();
      const interval = setInterval(updateBalance, 10000); // Update every 10s

      return () => clearInterval(interval);
    }
  }, [account?.address]);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const privateKey = generatePrivateKey();
    const acc = privateKeyToAccount(privateKey);
    
    localStorage.setItem(STORAGE_KEY, privateKey);
    setAccount(acc);
    setIsConnected(true);
    
    // Create wallet client
    walletClientRef.current = createWalletClient({
      account: acc,
      chain: riseChain,
      transport: http(RISE_RPC_URL),
    });
    
    // Initialize nonce manager
    const provider = new JsonRpcProvider(RISE_RPC_URL);
    nonceManagerRef.current = new NonceManager(provider, acc.address);
    nonceManagerRef.current.initialize();
    
    return acc;
  }, []);

  const disconnect = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setAccount(null);
    setIsConnected(false);
    setBalance('0');
    nonceManagerRef.current?.reset();
    nonceManagerRef.current = null;
    walletClientRef.current = null;
  }, []);

  const exportPrivateKey = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const privateKey = localStorage.getItem(STORAGE_KEY);
    if (!privateKey) return null;
    
    // Create a secure way to export
    const blob = new Blob([privateKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rise-wallet-${account?.address?.slice(0, 6)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    return privateKey;
  }, [account?.address]);

  const importPrivateKey = useCallback((privateKey: string) => {
    if (typeof window === 'undefined') return null;
    
    try {
      // Validate private key format
      if (!privateKey.startsWith('0x')) {
        privateKey = `0x${privateKey}`;
      }
      
      const acc = privateKeyToAccount(privateKey as `0x${string}`);
      
      localStorage.setItem(STORAGE_KEY, privateKey);
      setAccount(acc);
      setIsConnected(true);
      
      // Create wallet client
      walletClientRef.current = createWalletClient({
        account: acc,
        chain: riseChain,
        transport: http(RISE_RPC_URL),
      });
      
      // Initialize nonce manager
      const provider = new JsonRpcProvider(RISE_RPC_URL);
      nonceManagerRef.current = new NonceManager(provider, acc.address);
      nonceManagerRef.current.initialize();
      
      return acc;
    } catch (error) {
      console.error('Invalid private key:', error);
      throw new Error('Invalid private key format');
    }
  }, []);

  // Get next nonce for transaction
  const getNextNonce = useCallback(async () => {
    if (!nonceManagerRef.current) {
      throw new Error('Nonce manager not initialized');
    }
    return await nonceManagerRef.current.getNonce();
  }, []);

  // Report transaction completion
  const reportTransactionComplete = useCallback(async (success: boolean) => {
    if (nonceManagerRef.current) {
      await nonceManagerRef.current.onTransactionComplete(success);
    }
  }, []);

  return {
    account,
    address: account?.address,
    balance,
    isConnected,
    isLoading,
    publicClient: publicClientRef.current,
    walletClient: walletClientRef.current,
    connect,
    disconnect,
    exportPrivateKey,
    importPrivateKey,
    getNextNonce,
    reportTransactionComplete,
  };
}