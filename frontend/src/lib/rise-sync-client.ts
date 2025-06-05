import { SyncTransactionProvider } from 'rise-shred-client';
import { Wallet, formatUnits, parseUnits } from 'ethers';
import { RISE_RPC_URL } from '@/config/websocket';
import { NonceManager } from './wallet/NonceManager';

export class RiseSyncClient {
  private provider: SyncTransactionProvider;
  private wallet: Wallet;
  private nonceManager: NonceManager;
  private initialized = false;

  constructor(privateKey: string) {
    // Use the SyncTransactionProvider from rise-shred-client
    this.provider = new SyncTransactionProvider(RISE_RPC_URL);
    this.wallet = new Wallet(privateKey, this.provider);
    this.nonceManager = new NonceManager(this.provider, this.wallet.address);
    
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
      console.log('🚀 Sending sync transaction with RISE Sync Provider');
      
      // Get nonce from the nonce manager
      const nonce = await this.nonceManager.getNonce();
      
      // Prepare transaction with proper nonce
      const transaction = {
        to: tx.to,
        data: tx.data || '0x',
        value: tx.value || '0x0',
        gasLimit: tx.gasLimit || 200000,
        gasPrice: parseUnits('.001', 'gwei'),
        chainId: 11155931, // RISE testnet
        nonce: nonce,
      };

      // Sign the transaction
      const signedTx = await this.wallet.signTransaction(transaction);
      
      // Send using sync method for instant confirmation
      const receipt = await this.provider.sendRawTransactionSync(signedTx);
      
      console.log('✅ Transaction confirmed instantly:', receipt);
      
      // Mark transaction as complete
      await this.nonceManager.onTransactionComplete(true);
      
      return receipt;
    } catch (error) {
      console.error('❌ Sync transaction error:', error);
      
      // Mark transaction as failed
      await this.nonceManager.onTransactionComplete(false);
      
      throw error;
    }
  }

  async getBalance() {
    const balance = await this.provider.getBalance(this.wallet.address);
    return formatUnits(balance, 18);
  }

  getAddress() {
    return this.wallet.address;
  }

  cleanup() {
    this.nonceManager.stopPolling();
  }
}