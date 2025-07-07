import { createPublicClient, createWalletClient, http, PublicClient, WalletClient, TransactionReceipt } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { defineChain } from 'viem';

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

export class RiseClient {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private wsClient?: WebSocket;
  private subscriptions: Map<string, (data: unknown) => void> = new Map();
  private pendingRequests: Map<number, (response: unknown) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private activeSubscriptionParams: Map<string, { type: string; filter: unknown }> = new Map();

  constructor(privateKey?: string) {
    this.publicClient = createPublicClient({
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

  // Subscribe to events via WebSocket
  async subscribe(options: {
    type: 'logs';
    filter: {
      address?: `0x${string}` | `0x${string}`[];
      topics?: string[];
    };
    onData: (log: unknown) => void;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
        this.connectWebSocket()
          .then(() => this.sendSubscription(options, resolve))
          .catch(reject);
      } else {
        this.sendSubscription(options, resolve);
      }
    });
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wsClient = new WebSocket(RISE_WEBSOCKET_URL);
        
        this.wsClient.onopen = () => {
          console.log('WebSocket connected to RISE');
          this.reconnectAttempts = 0;
          this.resubscribeAll();
          resolve();
        };

        this.wsClient.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.wsClient.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        this.wsClient.onclose = () => {
          console.log('WebSocket disconnected from RISE');
          this.handleDisconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log(`Reconnecting in ${delay}ms...`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connectWebSocket().catch(console.error);
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private resubscribeAll() {
    // Resubscribe to all active subscriptions
    for (const [subscriptionId, params] of this.activeSubscriptionParams) {
      const handler = this.subscriptions.get(subscriptionId);
      if (handler && params) {
        this.sendSubscription({ type: params.type, filter: params.filter, onData: handler }, (newId) => {
          if (newId !== subscriptionId) {
            // Update subscription ID if it changed
            this.subscriptions.delete(subscriptionId);
            this.subscriptions.set(newId, handler);
            this.activeSubscriptionParams.delete(subscriptionId);
            this.activeSubscriptionParams.set(newId, params);
          }
        });
      }
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      
      // Handle responses to requests (subscriptions, etc.)
      if (message.id && this.pendingRequests.has(message.id)) {
        const handler = this.pendingRequests.get(message.id);
        this.pendingRequests.delete(message.id);
        if (handler) {
          handler(message);
        }
        return;
      }
      
      // Handle subscription data
      if (message.method === 'rise_subscription' && message.params) {
        const subscriptionId = message.params.subscription;
        const handler = this.subscriptions.get(subscriptionId);
        if (handler) {
          handler(message.params.result);
        }
      }
    } catch (error) {
      console.error('Failed to handle WebSocket message:', error);
    }
  }

  private sendSubscription(options: {
    type: string;
    filter: unknown;
    onData: (data: unknown) => void;
  }, resolve: (id: string) => void) {
    const id = Math.floor(Math.random() * 1000000);
    
    // Store the pending request handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.pendingRequests.set(id, (message: any) => {
      if (message.result) {
        const subscriptionId = message.result;
        this.subscriptions.set(subscriptionId, options.onData);
        this.activeSubscriptionParams.set(subscriptionId, {
          type: options.type,
          filter: options.filter
        });
        resolve(subscriptionId);
      } else if (message.error) {
        console.error('Subscription error:', message.error);
      }
    });

    this.wsClient!.send(JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'eth_subscribe',
      params: [options.type, options.filter]
    }));
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
      return;
    }

    this.subscriptions.delete(subscriptionId);
    this.activeSubscriptionParams.delete(subscriptionId);
    
    const id = Math.floor(Math.random() * 1000000);
    this.wsClient.send(JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'eth_unsubscribe',
      params: [subscriptionId]
    }));
  }

  disconnect() {
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = undefined;
    }
    this.subscriptions.clear();
  }

  getPublicClient() {
    return this.publicClient;
  }

  getWalletClient() {
    return this.walletClient;
  }
}