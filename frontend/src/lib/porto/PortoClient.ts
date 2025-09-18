import { Porto, Storage } from "porto";
import { createPublicClient, http, type TransactionReceipt } from "viem";
import { riseTestnet } from "viem/chains";
import { RISE_RPC_URL } from "@/config/websocket";

export class PortoClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private porto: any; // Porto instance type
  private isInitialized = false;

  constructor() {
    // Create Porto instance with RISE testnet configuration
    // Import config inline to avoid circular dependency
    this.porto = Porto.create({
      chains: [riseTestnet],
      mode: null,
      storage: Storage.localStorage(),
    });
  }

  async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  async connect() {
    try {
      await this.initialize();

      // Request account connection with Porto
      const accounts = await this.porto.provider.request({
        method: 'eth_requestAccounts'
      });

      return accounts[0];
    } catch (error: unknown) {
      console.error('Porto connect error:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.porto.provider.request({
        method: 'wallet_disconnect'
      });
    } catch (error: unknown) {
      console.error('Porto disconnect error:', error);
    }
  }

  async getAccounts(): Promise<string[]> {
    try {
      const accounts = await this.porto.provider.request({
        method: 'eth_accounts'
      });
      return accounts as string[];
    } catch (error: unknown) {
      console.error('Porto getAccounts error:', error);
      return [];
    }
  }

  async sendTransaction(params: {
    to: string;
    data?: string;
    value?: string;
    gasLimit?: string;
  }): Promise<TransactionReceipt> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts.length) {
        throw new Error('No Porto account connected');
      }

      const txParams = {
        from: accounts[0],
        to: params.to as `0x${string}`,
        data: (params.data || '0x') as `0x${string}`,
        value: params.value ? `0x${BigInt(params.value).toString(16)}` as `0x${string}` : undefined,
        gas: params.gasLimit ? `0x${BigInt(params.gasLimit).toString(16)}` as `0x${string}` : undefined,
      };

      // Send transaction through Porto
      const hash = await this.porto.provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      // Get transaction receipt
      const publicClient = createPublicClient({
        chain: riseTestnet,
        transport: http(RISE_RPC_URL),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
      });

      // Convert to match expected format
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 1 : 0,
        from: receipt.from,
        to: receipt.to || null,
        contractAddress: receipt.contractAddress || null,
        logsBloom: receipt.logsBloom,
        logs: receipt.logs,
        blockHash: receipt.blockHash,
        transactionIndex: receipt.transactionIndex,
        cumulativeGasUsed: receipt.cumulativeGasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        type: receipt.type,
      } as unknown as TransactionReceipt;
    } catch (error: unknown) {
      console.error('Porto transaction error:', error);
      throw error;
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts.length) {
        throw new Error('No Porto account connected');
      }

      const signature = await this.porto.provider.request({
        method: 'personal_sign',
        params: [`0x${Buffer.from(message).toString('hex')}`, accounts[0]],
      });

      return signature as string;
    } catch (error: unknown) {
      console.error('Porto sign message error:', error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      const publicClient = createPublicClient({
        chain: riseTestnet,
        transport: http(RISE_RPC_URL),
      });

      const balance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });

      return balance.toString();
    } catch (error: unknown) {
      console.error('Porto get balance error:', error);
      return '0';
    }
  }

  getProvider() {
    return this.porto.provider;
  }
}