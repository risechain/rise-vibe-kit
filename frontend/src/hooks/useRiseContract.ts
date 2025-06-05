import { useState, useCallback } from 'react';
import { JsonRpcProvider, BrowserProvider, Contract, Interface } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { CHATAPP_ADDRESS, CHATAPP_ABI } from '@/contracts/contracts';
import { RISE_RPC_URL } from '@/config/websocket';
import { useEnsureNetwork } from './useEnsureNetwork';
import { RiseSyncClient } from '@/lib/rise-sync-client';

// Cache sync client instances per wallet
const syncClientCache = new Map<string, RiseSyncClient>();

export function useRiseContract() {
  const [isLoading, setIsLoading] = useState(false);
  const { connector } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { ensureCorrectNetwork } = useEnsureNetwork();

  const getProvider = useCallback(() => {
    console.log('🔧 Creating provider with RPC URL:', RISE_RPC_URL);
    return new JsonRpcProvider(RISE_RPC_URL);
  }, []);

  const getSigner = useCallback(async () => {
    if (!walletClient) throw new Error('No wallet connected');
    
    // Ensure we're on the correct network first
    await ensureCorrectNetwork();
    
    // Check if it's an embedded wallet by checking the connector ID
    const isEmbeddedWallet = connector?.id === 'embedded-wallet';
    
    if (isEmbeddedWallet) {
      // For embedded wallet, use ethers Wallet directly with RISE RPC
      const { Wallet } = await import('ethers');
      const privateKey = localStorage.getItem('rise-embedded-wallet');
      if (!privateKey) throw new Error('Embedded wallet private key not found');
      const provider = getProvider();
      return new Wallet(privateKey, provider);
    } else {
      // For external wallets, use the injected provider
      if (typeof window !== 'undefined' && (window as { ethereum?: unknown }).ethereum) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const web3Provider = new BrowserProvider((window as { ethereum: unknown }).ethereum as any);
        return web3Provider.getSigner();
      }
    }
    
    throw new Error('No wallet provider found');
  }, [walletClient, connector, getProvider, ensureCorrectNetwork]);

  const getContract = useCallback(async () => {
    const signer = await getSigner();
    return new Contract(CHATAPP_ADDRESS, CHATAPP_ABI, signer);
  }, [getSigner]);

  const getReadOnlyContract = useCallback(() => {
    const provider = getProvider();
    return new Contract(CHATAPP_ADDRESS, CHATAPP_ABI, provider);
  }, [getProvider]);

  // Read functions
  const checkRegistration = useCallback(async (address: string) => {
    const contract = getReadOnlyContract();
    return await contract.isUserRegistered(address);
  }, [getReadOnlyContract]);

  const getUserId = useCallback(async (address: string) => {
    const contract = getReadOnlyContract();
    return await contract.userId(address);
  }, [getReadOnlyContract]);

  const getKarma = useCallback(async (address: string) => {
    const contract = getReadOnlyContract();
    const karma = await contract.karma(address);
    return karma.toString();
  }, [getReadOnlyContract]);

  // Write functions
  const registerUser = useCallback(async (userId: string) => {
    setIsLoading(true);
    
    try {
      console.log('🔧 Starting registration for user:', userId);
      
      // Check if using embedded wallet for sync transactions
      const isEmbeddedWallet = connector?.id === 'embedded-wallet';
      
      if (isEmbeddedWallet) {
        console.log('🚀 Using sync transaction for embedded wallet');
        const privateKey = localStorage.getItem('rise-embedded-wallet');
        if (!privateKey) throw new Error('Embedded wallet private key not found');
        
        // Use cached sync client or create new one
        let syncClient = syncClientCache.get(privateKey);
        if (!syncClient) {
          syncClient = new RiseSyncClient(privateKey);
          syncClientCache.set(privateKey, syncClient);
        }
        
        const iface = new Interface(CHATAPP_ABI);
        const data = iface.encodeFunctionData('registerUser', [userId]);
        
        const result = await syncClient.sendTransaction({
          to: CHATAPP_ADDRESS,
          data,
        });
        
        console.log('✅ Registration confirmed instantly with sync tx');
        return result;
      } else {
        // Use regular transaction flow for external wallets
        const contract = await getContract();
        console.log('🔧 Contract obtained, sending transaction...');
        
        const tx = await contract.registerUser(userId);
        console.log('✅ Registration tx sent:', tx.hash);
        
        const receipt = await tx.wait();
        console.log('✅ Registration confirmed:', receipt);
        
        return receipt;
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          code: (error as { code?: string }).code,
          data: (error as { data?: unknown }).data,
          transaction: (error as { transaction?: unknown }).transaction
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getContract, connector]);

  const sendMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    
    try {
      const isEmbeddedWallet = connector?.id === 'embedded-wallet';
      
      if (isEmbeddedWallet) {
        console.log('🚀 Using sync transaction for message');
        const privateKey = localStorage.getItem('rise-embedded-wallet');
        if (!privateKey) throw new Error('Embedded wallet private key not found');
        
        // Use cached sync client or create new one
        let syncClient = syncClientCache.get(privateKey);
        if (!syncClient) {
          syncClient = new RiseSyncClient(privateKey);
          syncClientCache.set(privateKey, syncClient);
        }
        
        const iface = new Interface(CHATAPP_ABI);
        const data = iface.encodeFunctionData('sendMessage', [message]);
        
        const result = await syncClient.sendTransaction({
          to: CHATAPP_ADDRESS,
          data,
        });
        
        console.log('✅ Message sent instantly with sync tx');
        return result;
      } else {
        const contract = await getContract();
        const tx = await contract.sendMessage(message);
        
        console.log('Message tx:', tx.hash);
        const receipt = await tx.wait();
        console.log('Message confirmed:', receipt);
        
        return receipt;
      }
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getContract, connector]);

  const giveKarma = useCallback(async (msgId: string) => {
    setIsLoading(true);
    
    try {
      const contract = await getContract();
      const tx = await contract.giveKarma(msgId);
      
      console.log('Give karma tx:', tx.hash);
      const receipt = await tx.wait();
      console.log('Give karma confirmed:', receipt);
      
      return receipt;
    } catch (error) {
      console.error('Give karma error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  const takeKarma = useCallback(async (msgId: string) => {
    setIsLoading(true);
    
    try {
      const contract = await getContract();
      const tx = await contract.takeKarma(msgId);
      
      console.log('Take karma tx:', tx.hash);
      const receipt = await tx.wait();
      console.log('Take karma confirmed:', receipt);
      
      return receipt;
    } catch (error) {
      console.error('Take karma error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  return {
    isLoading,
    checkRegistration,
    getUserId,
    getKarma,
    registerUser,
    sendMessage,
    giveKarma,
    takeKarma,
  };
}