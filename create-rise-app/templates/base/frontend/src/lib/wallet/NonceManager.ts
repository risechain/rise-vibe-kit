import { type PublicClient } from 'viem';

export class NonceManager {
  private localNonce: number = 0;
  private fetchedNonce: number = 0;
  private pendingTransactions = 0;
  private publicClient: PublicClient;
  private address: `0x${string}`;
  private initialized = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastFetchTime = 0;
  private POLL_INTERVAL = 5000; // 5 seconds

  constructor(publicClient: PublicClient, address: `0x${string}`) {
    this.publicClient = publicClient;
    this.address = address;
  }

  async initialize() {
    // Fetch initial nonce
    const nonce = await this.publicClient.getTransactionCount({
      address: this.address,
      blockTag: 'pending'
    });
    this.fetchedNonce = nonce;
    this.localNonce = nonce;
    this.lastFetchTime = Date.now();
    this.initialized = true;
    console.log(`🔢 Nonce manager initialized for ${this.address}: ${nonce}`);
    
    // Start background polling
    this.startPolling();
  }

  private startPolling() {
    if (this.pollingInterval) return;
    
    this.pollingInterval = setInterval(async () => {
      try {
        const networkNonce = await this.publicClient.getTransactionCount({
          address: this.address,
          blockTag: 'pending'
        });
        this.fetchedNonce = networkNonce;
        this.lastFetchTime = Date.now();
        
        // Only update local nonce if it's behind the network
        if (this.localNonce < networkNonce) {
          this.localNonce = networkNonce;
          console.log(`🔄 Background nonce sync: ${networkNonce}`);
        }
      } catch (error) {
        console.warn('Background nonce fetch failed:', error);
      }
    }, this.POLL_INTERVAL);
  }

  async getNonce(): Promise<number> {
    // Initialize on first use
    if (!this.initialized) {
      await this.initialize();
    }

    // Use the maximum of local and fetched nonce
    const currentNonce = Math.max(this.localNonce, this.fetchedNonce);
    
    // Increment local nonce for next transaction
    this.localNonce = currentNonce + 1;
    this.pendingTransactions++;

    console.log(`📤 Using nonce ${currentNonce} (local: ${this.localNonce}, fetched: ${this.fetchedNonce}, pending: ${this.pendingTransactions})`);
    
    return currentNonce;
  }

  // Call this when a transaction is confirmed or fails
  async onTransactionComplete(success: boolean) {
    this.pendingTransactions = Math.max(0, this.pendingTransactions - 1);
    
    if (!success) {
      // On failure, fetch fresh nonce in background
      console.log('❌ Transaction failed, background nonce resync...');
      // Don't await - let it happen in background
      this.publicClient.getTransactionCount({
        address: this.address,
        blockTag: 'pending'
      }).then(nonce => {
        this.fetchedNonce = nonce;
        if (this.localNonce < nonce) {
          this.localNonce = nonce;
        }
      }).catch(console.warn);
    } else {
      console.log(`✅ Transaction complete (pending: ${this.pendingTransactions})`);
    }
  }

  reset() {
    this.localNonce = 0;
    this.fetchedNonce = 0;
    this.pendingTransactions = 0;
    this.initialized = false;
    this.stopPolling();
    console.log('🔄 Nonce manager reset');
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}