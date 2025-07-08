import { EventEmitter } from 'events';
import { decodeEventLog, keccak256, toHex, type Abi } from 'viem';
import { RISE_WS_URL } from '@/config/websocket';
import { contracts } from '@/contracts/contracts';

export interface Subscription {
  id: string;
  requestId: number;
  type: 'logs';
  params: unknown[];
  callback: (data: unknown) => void;
}

export interface LogEvent {
  address: string;
  topics: string[];
  data: string;
  transactionHash: string;
  blockNumber: string | null;
  blockHash: string | null;
}

export interface ShredEvent {
  block_number: number;
  block_timestamp: number;
  shred_idx: number;
  starting_log_index: number;
  transactions: Array<{
    transaction: {
      type: string;
      chainId: string;
      nonce: string;
      gas: string;
      to: string;
      value: string;
      input: string;
      hash: string;
      [key: string]: unknown;
    };
    receipt: {
      Eip1559?: {
        status: string;
        cumulativeGasUsed: string;
        logs: LogEvent[];
      }
    };
  }>;
  state_changes: Record<string, unknown>;
}

export class RiseWebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Subscription>();
  private pendingSubscriptions = new Map<number, Subscription>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private messageQueue: unknown[] = [];
  private currentId = 1;
  private contractAbis: Map<string, Abi> = new Map();

  constructor(private url: string = RISE_WS_URL) {
    super();
    console.log('🔧 RiseWebSocketManager initializing with URL:', url);
    
    // Initialize ABIs for all contracts
    Object.entries(contracts).forEach(([name, contract]) => {
      console.log(`Initializing ABI for ${name} at ${contract.address}`);
      this.contractAbis.set(
        contract.address.toLowerCase(),
        contract.abi as Abi
      );
    });
    
    this.connect();
  }

  private connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('🟢 WebSocket connected to RISE');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Process queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          this.ws?.send(JSON.stringify(message));
        }
        
        // Subscribe to all contracts
        Object.values(contracts).forEach(contract => {
          console.log(`Subscribing to ${contract.address}`);
          this.subscribeToContract(contract.address);
        });
      };
      
      this.ws.onclose = (event: CloseEvent) => {
        console.log('🔴 WebSocket disconnected');
        console.log('Close code:', event.code);
        console.log('Close reason:', event.reason || 'No reason provided');
        console.log('Was clean:', event.wasClean);
        this.isConnecting = false;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        this.handleDisconnect();
      };
      
      this.ws.onerror = () => {
        // Only log detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('WebSocket connection error - this is normal during development');
        }
        this.isConnecting = false;
        // Don't emit error events for connection issues, let onclose handle it
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      console.error('WebSocket URL:', this.url);
      this.isConnecting = false;
      this.handleDisconnect();
    }
  }

  private handleMessage(message: { id?: number; result?: string; method?: string; params?: { subscription: string; result: LogEvent | ShredEvent }; error?: unknown }) {
    // Debug: Log all incoming messages
    console.log('🔍 Raw WebSocket message:', JSON.stringify(message, null, 2));
    
    // Initial subscription response - contains the subscription ID
    if (message.id && message.result && this.pendingSubscriptions.has(message.id)) {
      const pendingSub = this.pendingSubscriptions.get(message.id);
      if (pendingSub) {
        const subscriptionId = message.result;
        console.log('✅ Subscription confirmed - ID:', subscriptionId);
        console.log('📋 Subscription type:', pendingSub.params[0]); // 'shreds' or 'logs'
        
        // Move from pending to active subscriptions
        this.pendingSubscriptions.delete(message.id);
        this.subscriptions.set(subscriptionId, pendingSub);
        
        this.emit('subscribed', subscriptionId);
      }
      return;
    }

    // Event notification from subscription
    if (message.method === 'eth_subscription' && message.params) {
      const { subscription, result } = message.params;
      const sub = this.subscriptions.get(subscription);
      
      console.log('📨 Event notification for subscription:', subscription);
      console.log('📋 Subscription params were:', sub?.params);
      console.log('📦 Event result type:', 
        result && typeof result === 'object' ? 
          ('transactions' in result ? 'ShredEvent' : 'LogEvent') : 
          'Unknown'
      );
      
      if (sub && result) {
        // Check if this is a shred event (has transactions array)
        if ('transactions' in result && Array.isArray(result.transactions)) {
          // Process each transaction's logs in the shred
          const shredEvent = result as ShredEvent;
          console.log('🔥 Processing ShredEvent with', shredEvent.transactions.length, 'transactions');
          
          shredEvent.transactions.forEach(tx => {
            const logs = tx.receipt?.Eip1559?.logs || [];
            
            // Filter for logs from our subscribed addresses
            const addressFilter = sub.params[1] as { address?: string };
            const targetAddress = addressFilter?.address;
            
            logs.forEach(log => {
              // Check if this log is from our target contract
              if (targetAddress && log.address?.toLowerCase() !== targetAddress.toLowerCase()) {
                return; // Skip logs from other contracts
              }
              
              // Add transaction hash from the transaction object
              const enrichedLog = {
                ...log,
                transactionHash: tx.transaction.hash,
                blockNumber: `0x${shredEvent.block_number.toString(16)}`,
                blockHash: null // Not provided in shred events
              };
              
              console.log('🎯 Found matching log from contract:', log.address);
              
              try {
                const decodedEvent = this.decodeEvent(enrichedLog);
                sub.callback({
                  ...decodedEvent,
                  timestamp: new Date(shredEvent.block_timestamp * 1000)
                });
              } catch (error) {
                console.error('Failed to decode event:', error);
                // Still pass the raw event to the callback
                sub.callback({
                  ...enrichedLog,
                  decoded: false,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  timestamp: new Date(shredEvent.block_timestamp * 1000)
                });
              }
            });
          });
        } else {
          // Handle traditional log event format (fallback)
          console.log('📄 Processing standard LogEvent');
          console.log('🔍 Log event data:', JSON.stringify(result, null, 2));
          
          const logEvent = result as LogEvent;
          
          // Check if we have the required fields
          if (!logEvent.address || !logEvent.topics || !logEvent.data) {
            console.error('❌ Invalid log event format - missing required fields:', {
              hasAddress: !!logEvent.address,
              hasTopics: !!logEvent.topics,
              hasData: !!logEvent.data
            });
            sub.callback({
              ...logEvent,
              decoded: false,
              error: 'Invalid log event format',
              timestamp: new Date()
            });
            return;
          }
          
          try {
            const decodedEvent = this.decodeEvent(logEvent);
            sub.callback({
              ...decodedEvent,
              timestamp: new Date()
            });
          } catch (error) {
            console.error('Failed to decode event:', error);
            // Still pass the raw event to the callback
            sub.callback({
              ...logEvent,
              decoded: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date()
            });
          }
        }
      }
      return;
    }

    // Error response
    if (message.error) {
      console.error('WebSocket error response:', message.error);
      this.emit('error', message.error);
      
      // Remove pending subscription if it failed
      if (message.id && this.pendingSubscriptions.has(message.id)) {
        this.pendingSubscriptions.delete(message.id);
      }
    }
  }

  private decodeEvent(log: LogEvent & { timestamp?: Date }): {
    address: string;
    topics: string[];
    data: string;
    transactionHash: string;
    blockNumber: string | null;
    blockHash: string | null;
    eventName?: string;
    args?: unknown;
    decoded: boolean;
    error?: string;
    timestamp?: Date;
  } {
    try {
      // Get the correct ABI for this contract
      const contractAbi = this.contractAbis.get(log.address.toLowerCase());
      
      if (!contractAbi) {
        console.warn(`No ABI found for contract ${log.address}, returning raw event`);
        throw new Error(`No ABI found for contract ${log.address}`);
      }
      
      console.log('Decoding log for contract:', log.address, 'with topics:', log.topics);
      
      // Decode the log using viem
      const decodedLog = decodeEventLog({
        abi: contractAbi,
        data: log.data as `0x${string}`,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });

      return {
        ...log,
        eventName: decodedLog.eventName,
        args: decodedLog.args,
        decoded: true,
        timestamp: log.timestamp || new Date()
      };
    } catch (error) {
      console.error('Failed to decode event for address:', log.address, error);
      // Return raw log if decoding fails
      return {
        ...log,
        decoded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: log.timestamp || new Date()
      };
    }
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log(`🔄 Reconnecting in ${delay}ms...`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  private sendMessage(message: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  public subscribeToContract(address: string): void {
    // Subscribe with both shreds and standard logs format
    this.subscribeWithShreds(address);
    this.subscribeWithStandardLogs(address);
  }
  
  private subscribeWithShreds(address: string): void {
    const requestId = this.currentId++;
    
    // New format: eth_subscribe with "shreds" as first param
    const params = [
      'shreds',
      {
        address: address
      }
    ];

    const subscription: Subscription = {
      id: '', // Will be filled when we get the response
      requestId: requestId,
      type: 'logs',
      params,
      callback: (event) => this.emit('contractEvent', event)
    };

    // Store as pending until we get the subscription ID
    this.pendingSubscriptions.set(requestId, subscription);

    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'eth_subscribe',
      params
    };

    console.log('📤 Sending shreds subscription request:', request);
    this.sendMessage(request);
  }
  
  private subscribeWithStandardLogs(address: string): void {
    const requestId = this.currentId++;
    
    // Standard format: eth_subscribe with "logs"
    const params = [
      'logs',
      {
        address: address
      }
    ];

    const subscription: Subscription = {
      id: '', // Will be filled when we get the response
      requestId: requestId,
      type: 'logs',
      params,
      callback: (event) => this.emit('contractEvent', event)
    };

    // Store as pending until we get the subscription ID
    this.pendingSubscriptions.set(requestId, subscription);

    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'eth_subscribe',
      params
    };

    console.log('📤 Sending standard logs subscription request:', request);
    this.sendMessage(request);
  }

  public subscribeToLogs(
    address: string | string[],
    topics?: string[],
    callback?: (event: unknown) => void
  ): string {
    const requestId = this.currentId++;
    
    const filterParams: { address: string | string[]; topics?: string[] } = {
      address: address
    };
    
    if (topics && topics.length > 0) {
      filterParams.topics = topics;
    }
    
    // New format: eth_subscribe with "shreds" as first param
    const params = ['shreds', filterParams];

    const subscription: Subscription = {
      id: '', // Will be filled when we get the response
      requestId: requestId,
      type: 'logs',
      params,
      callback: callback || ((event) => this.emit('event', event))
    };

    // Store as pending until we get the subscription ID
    this.pendingSubscriptions.set(requestId, subscription);

    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'eth_subscribe',
      params
    };

    this.sendMessage(request);

    // Return the request ID for now
    return requestId.toString();
  }

  public unsubscribe(subscriptionId: string) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.subscriptions.delete(subscriptionId);

    const request = {
      jsonrpc: '2.0',
      id: this.currentId++,
      method: 'eth_unsubscribe',
      params: [subscriptionId]
    };

    this.sendMessage(request);
  }

  public disconnect() {
    this.subscriptions.clear();
    this.pendingSubscriptions.clear();
    this.messageQueue = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  // Helper method to compute event topic signatures
  public static computeEventTopic(eventSignature: string): string {
    return keccak256(toHex(eventSignature));
  }

  // Get all event signatures from all contract ABIs
  public getEventSignatures(): Record<string, string> {
    const events: Record<string, string> = {};
    
    // Iterate through all contracts and their ABIs
    this.contractAbis.forEach((abi) => {
      // Get all event items from the ABI
      const eventItems = abi.filter((item: { type: string }) => item.type === 'event');
      
      eventItems.forEach((event) => {
        if ('name' in event && event.name && typeof event.name === 'string') {
          try {
            // Build event signature manually for viem
            const inputs = 'inputs' in event ? event.inputs : [];
            const paramTypes = inputs.map((input: { type: string }) => input.type).join(',');
            const eventSignature = `${event.name}(${paramTypes})`;
            const topic = keccak256(toHex(eventSignature));
            events[event.name] = topic;
          } catch (error) {
            console.warn(`Failed to compute topic for event ${event.name}:`, error);
          }
        }
      });
    });
    
    return events;
  }
}