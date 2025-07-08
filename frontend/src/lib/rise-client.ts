import { createPublicClient, createWalletClient, http, webSocket, PublicClient, WalletClient, TransactionReceipt, defineChain } from 'viem';
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

  constructor(privateKey?: string) {
    this.publicClient = createPublicClient({
      chain: RISE_TESTNET,
      transport: http(RISE_TESTNET.rpcUrls.default.http[0]),
    });

    // Create shred client for sync transactions
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

  // For event subscriptions, use a separate client with WebSocket transport
  createEventClient() {
    return createPublicClient({
      chain: RISE_TESTNET,
      transport: webSocket(RISE_WEBSOCKET_URL),
    });
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