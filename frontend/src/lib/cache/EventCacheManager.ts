import type { ContractEvent } from '@/types/contracts';

export interface CacheOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
  storage?: 'memory' | 'indexeddb';
}

interface CacheEntry {
  events: ContractEvent[];
  timestamp: number;
  lastBlock?: bigint;
}

export class EventCacheManager {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number;
  private storage: 'memory' | 'indexeddb';
  private dbName = 'RiseEventCache';
  private storeName = 'events';
  private db: IDBDatabase | null = null;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 10000; // Max events per key
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.storage = options.storage || 'memory';
    
    if (this.storage === 'indexeddb' && typeof window !== 'undefined') {
      this.initIndexedDB();
    }
  }

  private async initIndexedDB(): Promise<void> {
    try {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        this.storage = 'memory'; // Fallback to memory
      };
      
      request.onsuccess = () => {
        this.db = request.result;
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    } catch (error) {
      console.error('IndexedDB initialization failed:', error);
      this.storage = 'memory';
    }
  }

  private generateKey(contractName: string, eventName?: string, chainId?: number): string {
    return `${chainId || 'default'}_${contractName}_${eventName || 'all'}`;
  }

  async getEvents(key: string): Promise<ContractEvent[]> {
    // Try memory cache first
    const memoryEntry = this.cache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.events;
    }

    // Try IndexedDB if enabled
    if (this.storage === 'indexeddb' && this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const entry = request.result as CacheEntry & { key: string } | undefined;
            if (entry && this.isValid(entry)) {
              // Update memory cache
              this.cache.set(key, {
                events: entry.events,
                timestamp: entry.timestamp,
                lastBlock: entry.lastBlock
              });
              resolve(entry.events);
            } else {
              resolve([]);
            }
          };
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.error('Failed to read from IndexedDB:', error);
      }
    }

    return [];
  }

  async setEvents(key: string, events: ContractEvent[], lastBlock?: bigint): Promise<void> {
    const entry: CacheEntry = {
      events: this.limitEvents(events),
      timestamp: Date.now(),
      lastBlock
    };

    // Update memory cache
    this.cache.set(key, entry);

    // Update IndexedDB if enabled
    if (this.storage === 'indexeddb' && this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.put({ key, ...entry });
      } catch (error) {
        console.error('Failed to write to IndexedDB:', error);
      }
    }

    // Clean up old entries
    this.cleanup();
  }

  async mergeEvents(key: string, newEvents: ContractEvent[]): Promise<void> {
    const existingEvents = await this.getEvents(key);
    
    // Create a map to track unique events
    const eventMap = new Map<string, ContractEvent>();
    
    // Add existing events
    existingEvents.forEach(event => {
      const eventKey = `${event.transactionHash}_${event.logIndex}`;
      eventMap.set(eventKey, event);
    });
    
    // Add new events (will overwrite duplicates)
    newEvents.forEach(event => {
      const eventKey = `${event.transactionHash}_${event.logIndex}`;
      eventMap.set(eventKey, event);
    });
    
    // Convert back to array and sort by block number (newest first)
    const mergedEvents = Array.from(eventMap.values())
      .sort((a, b) => {
        if (!a.blockNumber || !b.blockNumber) return 0;
        const aBlock = BigInt(a.blockNumber);
        const bBlock = BigInt(b.blockNumber);
        return Number(bBlock - aBlock);
      });
    
    // Find the oldest block number
    let lastBlock: bigint | undefined;
    if (mergedEvents.length > 0) {
      const lastEvent = mergedEvents[mergedEvents.length - 1];
      if (lastEvent.blockNumber) {
        lastBlock = BigInt(lastEvent.blockNumber);
      }
    }
    
    await this.setEvents(key, mergedEvents, lastBlock);
  }

  async clear(key?: string): Promise<void> {
    if (key) {
      this.cache.delete(key);
      
      if (this.storage === 'indexeddb' && this.db) {
        try {
          const transaction = this.db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          store.delete(key);
        } catch (error) {
          console.error('Failed to delete from IndexedDB:', error);
        }
      }
    } else {
      // Clear all
      this.cache.clear();
      
      if (this.storage === 'indexeddb' && this.db) {
        try {
          const transaction = this.db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          store.clear();
        } catch (error) {
          console.error('Failed to clear IndexedDB:', error);
        }
      }
    }
  }

  getCacheKey(contractName: string, eventName?: string, chainId?: number): string {
    return this.generateKey(contractName, eventName, chainId);
  }

  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.ttl;
  }

  private limitEvents(events: ContractEvent[]): ContractEvent[] {
    if (events.length <= this.maxSize) {
      return events;
    }
    // Keep the most recent events
    return events.slice(0, this.maxSize);
  }

  private cleanup(): void {
    // Clean up expired entries from memory
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): {
    size: number;
    keys: string[];
    storage: string;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      storage: this.storage
    };
  }
}