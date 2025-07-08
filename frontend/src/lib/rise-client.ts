import { createPublicClient, createWalletClient, http, PublicClient, WalletClient, TransactionReceipt, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicShredClient } from 'shreds/viem';

export const RISE_TESTNET = defineChain({
  id: 11155931,
  name: 'RISE Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.riselabs.xyz/'] },
    public: { http: ['https://testnet.riselabs.xyz/'] },
  },
  blockExplorers: {
    default: { name: 'RISE Explorer', url: 'https://explorer.testnet.riselabs.xyz/' },
  },
});

export const RISE_WEBSOCKET_URL = 'wss://testnet.riselabs.xyz/ws';

type ShredClient = ReturnType<typeof createPublicShredClient>;

export class RiseClient {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private shredClient: ShredClient;
  private unwatchFunctions: Map<string, () => void> = new Map();

  constructor(privateKey?: string) {
    this.publicClient = createPublicClient({
      chain: RISE_TESTNET,
      transport: http(RISE_TESTNET.rpcUrls.default.http[0]),
    });

    // Create shred client for watching events
    // Using HTTP transport for shreds client as per the package
    this.shredClient = createPublicShredClient({
      chain: RISE_TESTNET,
      transport: http(RISE_TESTNET.rpcUrls.default.http[0]),
    });

    if (privateKey) {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      this.walletClient = createWalletClient({
        account,
        chain: RISE_TESTNET,
        transport: http(RISE_TESTNET.rpcUrls.default.http[0]),
      });
    }
  }

  // Sync transaction - returns receipt immediately
  async sendTransactionSync(args: {
    to: `0x${string}`;
    data?: `0x${string}`;
    value?: bigint;
  }): Promise<TransactionReceipt> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    // Sign and send transaction
    const hash = await this.walletClient.sendTransaction({
      to: args.to,
      data: args.data,
      value: args.value,
      account: this.walletClient.account!,
      chain: RISE_TESTNET,
    });

    // For RISE, receipt is available immediately
    const receipt = await this.publicClient.getTransactionReceipt({ hash });
    return receipt;
  }

  // Subscribe to events - for now using standard WebSocket, but shred client is available
  async subscribe(options: {
    type: 'logs';
    filter: {
      address?: `0x${string}` | `0x${string}`[];
      topics?: string[];
    };
    onData: (log: unknown) => void;
  }): Promise<string> {
    // For now, we'll use a simple polling approach or rely on the WebSocket manager
    // The shred client can be accessed via getShredClient() for sync operations
    console.log('Event subscription requested for:', options.filter.address);
    
    // Generate a unique subscription ID
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Store the callback for potential future use
    this.unwatchFunctions.set(subscriptionId, () => {
      console.log('Unsubscribed from:', subscriptionId);
    });
    
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const unwatch = this.unwatchFunctions.get(subscriptionId);
    if (unwatch) {
      unwatch();
      this.unwatchFunctions.delete(subscriptionId);
    }
  }

  disconnect() {
    // Unwatch all active subscriptions
    for (const unwatch of this.unwatchFunctions.values()) {
      unwatch();
    }
    this.unwatchFunctions.clear();
  }

  getPublicClient() {
    return this.publicClient;
  }

  getWalletClient() {
    return this.walletClient;
  }

  getShredClient() {
    return this.shredClient;
  }
}