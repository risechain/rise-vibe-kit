import { createPublicShredClient } from 'shreds/viem';
import { createWalletClient, createPublicClient, http, formatEther, parseGwei, type WalletClient, type Account, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { riseTestnet } from 'viem/chains';
import { RISE_RPC_URL } from '@/config/websocket';
import { NonceManager } from './wallet/NonceManager';

type SyncClient = ReturnType<typeof createPublicShredClient>;

export class RiseSyncClient {
  private syncClient: SyncClient;
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  private account: Account;
  private nonceManager: NonceManager;
  private initialized = false;

  constructor(privateKey: string) {
    // Create account from private key
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Create sync client for sending transactions
    this.syncClient = createPublicShredClient({
      chain: riseTestnet,
      transport: http(RISE_RPC_URL),
    });
    
    // Create wallet client for signing transactions
    this.walletClient = createWalletClient({
      account: this.account,
      chain: riseTestnet,
      transport: http(RISE_RPC_URL),
    });
    
    // Create public client for reading blockchain data
    this.publicClient = createPublicClient({
      chain: riseTestnet,
      transport: http(RISE_RPC_URL),
    });
    
    this.nonceManager = new NonceManager(this.publicClient, this.account.address);
    
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
      console.log(' Sending sync transaction with Shreds sync client', {
        to: tx.to,
        data: tx.data?.slice(0, 10) + '...',
        value: tx.value,
        gasLimit: tx.gasLimit
      });
      
      // Get nonce from the nonce manager
      const nonce = await this.nonceManager.getNonce();
      console.log('📝 Using nonce:', nonce);
      
      // Build transaction parameters
      const defaultGas = 300000n;
      
      const baseParams = {
        account: this.account,
        chain: riseTestnet,
        to: tx.to as `0x${string}`,
        data: (tx.data || '0x') as `0x${string}`,
        gas: tx.gasLimit ? BigInt(tx.gasLimit) : defaultGas,
        gasPrice: parseGwei('0.001'),
        nonce: nonce,
      };

      // Prepare the transaction request with or without value
      const request = tx.value && BigInt(tx.value) > 0n
        ? await this.walletClient.prepareTransactionRequest({
            ...baseParams,
            value: BigInt(tx.value),
          })
        : await this.walletClient.prepareTransactionRequest(baseParams);
      
      // Sign the transaction
      const serializedTransaction = await this.walletClient.signTransaction(request);
      
      // Send using sync method for instant confirmation
      const receipt = await this.syncClient.sendRawTransactionSync({
        serializedTransaction
      });
      
      console.log('✅ Transaction confirmed :', receipt);
      
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
      
      // Enhanced error handling with user-friendly messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle specific error cases
      if (errorMessage.includes('insufficient funds')) {
        const balance = await this.publicClient.getBalance({ address: this.account.address });
        throw new Error(
          `Insufficient funds. Current balance: ${formatEther(balance)} ETH. ` +
          `Please add funds to ${this.account.address}`
        );
      }
      
      if (errorMessage.includes('nonce too low')) {
        const currentNonce = await this.publicClient.getTransactionCount({ 
          address: this.account.address 
        });
        throw new Error(
          `Transaction nonce conflict. Expected nonce: ${currentNonce}. ` +
          `Please refresh the page and try again.`
        );
      }
      
      if (errorMessage.includes('gas required exceeds')) {
        throw new Error(
          'Transaction would fail. The contract execution requires more gas than provided. ' +
          'This usually means the transaction would revert.'
        );
      }
      
      if (errorMessage.includes('User denied') || errorMessage.includes('rejected')) {
        throw new Error('Transaction was cancelled by the user.');
      }
      
      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        throw new Error(
          'Transaction timed out. The network may be congested. Please try again.'
        );
      }
      
      // Log detailed error for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      // Re-throw with more context
      throw new Error(`Transaction failed: ${errorMessage}`);
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