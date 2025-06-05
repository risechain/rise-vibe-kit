import { createConnector, type CreateConnectorFn } from 'wagmi';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, type WalletClient } from 'viem';
import { generatePrivateKey } from 'viem/accounts';

const STORAGE_KEY = 'rise-embedded-wallet';

export type EmbeddedWalletConnectorOptions = {
  name?: string;
  shimDisconnect?: boolean;
};

embeddedWalletConnector.type = 'embeddedWallet' as const;

export function embeddedWalletConnector(
  options: EmbeddedWalletConnectorOptions = {}
): CreateConnectorFn {
  return createConnector((config) => {
    const { name = 'Embedded Wallet', shimDisconnect = true } = options;

    let connected = false;
    let account: ReturnType<typeof privateKeyToAccount> | null = null;
    let walletClient: WalletClient | null = null;

    return {
      id: 'embedded-wallet',
      name,
      type: embeddedWalletConnector.type,
      
      async connect({ chainId }: { chainId?: number } = {}) {
        try {
          let privateKey = localStorage.getItem(STORAGE_KEY);
          
          // If no private key exists, generate one
          if (!privateKey) {
            privateKey = generatePrivateKey();
            localStorage.setItem(STORAGE_KEY, privateKey);
          }
          
          // Create account from private key
          account = privateKeyToAccount(privateKey as `0x${string}`);
          
          // Get chain
          const chain = config.chains.find(x => x.id === chainId) ?? config.chains[0];
          
          // Create wallet client with RISE RPC
          walletClient = createWalletClient({
            account,
            chain,
            transport: http('https://testnet.riselabs.xyz'),
          });
          
          connected = true;
          
          return {
            accounts: [account.address],
            chainId: chain.id,
          };
        } catch (error) {
          console.error('Failed to connect embedded wallet:', error);
          throw error;
        }
      },
      
      async disconnect() {
        connected = false;
        account = null;
        walletClient = null;
        
        if (!shimDisconnect) {
          localStorage.removeItem(STORAGE_KEY);
        }
      },
      
      async getAccounts() {
        if (!connected || !account) return [];
        return [account.address];
      },
      
      async getChainId() {
        const chain = config.chains[0];
        return chain.id;
      },
      
      async isAuthorized() {
        try {
          const privateKey = localStorage.getItem(STORAGE_KEY);
          if (!privateKey) return false;
          
          // Validate the private key
          privateKeyToAccount(privateKey as `0x${string}`);
          return true;
        } catch {
          return false;
        }
      },
      
      async switchChain({ chainId }: { chainId: number }) {
        const chain = config.chains.find(x => x.id === chainId);
        if (!chain) throw new Error('Chain not configured');
        
        if (walletClient && account) {
          walletClient = createWalletClient({
            account,
            chain,
            transport: http('https://testnet.riselabs.xyz'),
          });
        }
        
        config.emitter.emit('change', { chainId });
        return chain;
      },
      
      async getWalletClient({ chainId }: { chainId?: number } = {}) {
        if (!walletClient || !account) throw new Error('Wallet not connected');
        
        const chain = config.chains.find(x => x.id === chainId) ?? config.chains[0];
        
        return createWalletClient({
          account,
          chain,
          transport: http('https://testnet.riselabs.xyz'),
        });
      },
      
      async getProvider() {
        if (!walletClient) throw new Error('Wallet not connected');
        return walletClient.transport;
      },
      
      onAccountsChanged() {
        // Not needed for embedded wallet
        return () => {};
      },
      
      onChainChanged() {
        // Not needed for embedded wallet
        return () => {};
      },
      
      onDisconnect() {
        // Handle cleanup on disconnect
        connected = false;
        account = null;
        walletClient = null;
        return () => {};
      },
    };
  });
}

// Helper functions for managing the embedded wallet
export function clearEmbeddedWallet() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasEmbeddedWallet() {
  return !!localStorage.getItem(STORAGE_KEY);
}

export async function copyEmbeddedWalletKeyToClipboard(): Promise<boolean> {
  const privateKey = localStorage.getItem(STORAGE_KEY);
  if (!privateKey) return false;
  
  const { copyToClipboard } = await import('@/lib/utils');
  return await copyToClipboard(privateKey);
}

export function getEmbeddedWalletKey(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function importEmbeddedWalletKey(privateKey: string) {
  try {
    // Validate private key format
    if (!privateKey.startsWith('0x')) {
      privateKey = `0x${privateKey}`;
    }
    
    // Validate by trying to create account
    privateKeyToAccount(privateKey as `0x${string}`);
    
    // Save to storage
    localStorage.setItem(STORAGE_KEY, privateKey);
    return true;
  } catch (error) {
    console.error('Invalid private key:', error);
    return false;
  }
}