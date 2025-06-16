import { createPublicSyncClient } from 'shreds/viem';
import { createWalletClient, http, formatEther, parseGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { riseTestnet } from 'viem/chains';
import { RISE_RPC_URL } from '@/config/websocket';
import { NonceManager } from './wallet/NonceManager';
import { JsonRpcProvider } from 'ethers';

export class RiseSyncClient {
  private syncClient: any;
  private walletClient: any;
  private account: any;
  private nonceManager: NonceManager;
  private initialized = false;
  private provider: JsonRpcProvider;

  constructor(privateKey: string) {
    // Create account from private key
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Create sync client for sending transactions
    this.syncClient = createPublicSyncClient({
      chain: riseTestnet,
      transport: http(RISE_RPC_URL),
    });
    
    // Create wallet client for signing transactions
    this.walletClient = createWalletClient({
      account: this.account,
      chain: riseTestnet,
      transport: http(RISE_RPC_URL),
    });
    
    // Create ethers provider for nonce manager compatibility
    this.provider = new JsonRpcProvider(RISE_RPC_URL);
    this.nonceManager = new NonceManager(this.provider, this.account.address);
    
    // Initialize nonce manager in background
    this.initialize();
  }

  private async initialize() {
    if (!this.initialized) {
      await this.nonceManager.initialize();
      this.initialized = true;
    }
  }

  async sendTransaction(tx: {
    to: string;
    data?: string;
    value?: string;
    gasLimit?: string;
  }) {
    try {
      console.log('🚀 Sending sync transaction with Shreds sync client');
      
      // Get nonce from the nonce manager
      const nonce = await this.nonceManager.getNonce();
      
      // Prepare the transaction request
      const request = await this.walletClient.prepareTransactionRequest({
        account: this.account,
        to: tx.to as `0x${string}`,
        data: (tx.data || '0x') as `0x${string}`,
        value: tx.value ? BigInt(tx.value) : 0n,
        gas: tx.gasLimit ? BigInt(tx.gasLimit) : 200000n,
        gasPrice: parseGwei('0.001'),
        nonce: nonce,
      });

      // Sign the transaction
      const serializedTransaction = await this.walletClient.signTransaction(request);
      
      // Send using sync method for instant confirmation
      const receipt = await this.syncClient.sendRawTransactionSync({
        serializedTransaction,
      });
      
      console.log('✅ Transaction confirmed instantly:', receipt);
      
      // Mark transaction as complete
      await this.nonceManager.onTransactionComplete(true);
      
      // Convert receipt to match expected format
      return {
        ...receipt,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 1 : 0,
      };
    } catch (error) {
      console.error('❌ Sync transaction error:', error);
      
      // Mark transaction as failed
      await this.nonceManager.onTransactionComplete(false);
      
      throw error;
    }
  }

  async getBalance() {
    const balance = await this.syncClient.getBalance({
      address: this.account.address,
    });
    return formatEther(balance);
  }

  getAddress() {
    return this.account.address;
  }

  cleanup() {
    this.nonceManager.stopPolling();
  }
}