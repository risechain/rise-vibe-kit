import { createPublicSyncClient, shredsWebSocket } from 'shreds/viem';
import { createWalletClient, http, formatEther, parseGwei, type WalletClient, type Account } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { riseTestnet } from 'viem/chains';
import { RISE_RPC_URL, RISE_WS_URL } from '@/config/websocket';
import { NonceManager } from './wallet/NonceManager';
import { JsonRpcProvider } from 'ethers';

type SyncClient = ReturnType<typeof createPublicSyncClient>;

export class RiseSyncClient {
  private syncClient: SyncClient;
  private walletClient: WalletClient;
  private account: Account;
  private nonceManager: NonceManager;
  private initialized = false;
  private provider: JsonRpcProvider;

  constructor(privateKey: string) {
    // Create account from private key
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Create sync client for sending transactions
    this.syncClient = createPublicSyncClient({
      chain: riseTestnet,
      transport: shredsWebSocket(RISE_WS_URL),
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
      console.log('🚀 Sending sync transaction with Shreds sync client', {
        to: tx.to,
        data: tx.data?.slice(0, 10) + '...',
        value: tx.value,
        gasLimit: tx.gasLimit
      });
      
      // Get nonce from the nonce manager
      const nonce = await this.nonceManager.getNonce();
      console.log('📝 Using nonce:', nonce);
      
      // Build transaction parameters
      // Check if this is a token deployment (launchToken function)
      const isTokenDeployment = tx.data && tx.data.includes('0x5fc6762c'); // launchToken function selector
      const defaultGas = isTokenDeployment ? 5000000n : 300000n;
      
      const baseParams = {
        account: this.account,
        chain: riseTestnet,
        to: tx.to as `0x${string}`,
        data: (tx.data || '0x') as `0x${string}`,
        gas: tx.gasLimit ? BigInt(tx.gasLimit) : defaultGas,
        gasPrice: parseGwei('0.001'),
        nonce: nonce,
      };
      
      if (isTokenDeployment) {
        console.log('Token deployment detected, using higher gas limit:', defaultGas.toString());
      }

      // Prepare the transaction request with or without value
      const request = tx.value && BigInt(tx.value) > 0n
        ? await this.walletClient.prepareTransactionRequest({
            ...baseParams,
            value: BigInt(tx.value),
          })
        : await this.walletClient.prepareTransactionRequest(baseParams);
      
      if (tx.value && BigInt(tx.value) > 0n) {
        console.log('💰 Transaction includes value:', tx.value);
      }

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
      
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        // Log any additional properties on the error object
        const errorObj = error as unknown as Record<string, unknown>;
        const additionalProps = Object.keys(errorObj).filter(
          key => !['message', 'stack', 'name'].includes(key)
        );
        if (additionalProps.length > 0) {
          console.error('Additional error properties:', 
            Object.fromEntries(additionalProps.map(key => [key, errorObj[key]]))
          );
        }
      }
      
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