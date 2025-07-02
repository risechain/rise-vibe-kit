import { toast as toastify, ToastOptions, Id } from 'react-toastify';
import { ReactNode } from 'react';

interface ToastQueueItem {
  type: 'success' | 'error' | 'info' | 'warning';
  message: ReactNode;
  options?: ToastOptions;
  dedupKey?: string;
}

class ToastManager {
  private queue: ToastQueueItem[] = [];
  private activeToasts = new Set<Id>();
  private recentMessages = new Map<string, number>();
  private isPageVisible = true;
  private maxConcurrentToasts = 3;
  private deduplicationWindow = 5000; // 5 seconds
  private lastWebSocketNotification = 0;
  private webSocketNotificationCooldown = 10000; // 10 seconds

  constructor() {
    // Monitor page visibility
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isPageVisible = !document.hidden;
        if (this.isPageVisible) {
          this.processQueue();
        }
      });

      // Monitor toast lifecycle
      toastify.onChange((toast) => {
        if (toast.status === 'removed') {
          this.activeToasts.delete(toast.id);
          this.processQueue();
        }
      });
    }
  }

  private isDuplicate(dedupKey?: string): boolean {
    if (!dedupKey) return false;
    
    const lastShown = this.recentMessages.get(dedupKey);
    if (!lastShown) return false;
    
    const now = Date.now();
    return now - lastShown < this.deduplicationWindow;
  }

  private processQueue() {
    if (!this.isPageVisible) return;
    
    while (this.queue.length > 0 && this.activeToasts.size < this.maxConcurrentToasts) {
      const item = this.queue.shift();
      if (!item) continue;

      // Skip duplicates
      if (this.isDuplicate(item.dedupKey)) continue;

      // Show the toast
      let id: Id;
      switch (item.type) {
        case 'success':
          id = toastify.success(item.message, item.options);
          break;
        case 'error':
          id = toastify.error(item.message, item.options);
          break;
        case 'warning':
          id = toastify.warning(item.message, item.options);
          break;
        default:
          id = toastify.info(item.message, item.options);
      }

      this.activeToasts.add(id);
      
      // Track deduplication
      if (item.dedupKey) {
        this.recentMessages.set(item.dedupKey, Date.now());
      }
    }
  }

  private addToQueue(item: ToastQueueItem) {
    // Special handling for WebSocket notifications
    if (item.dedupKey?.startsWith('websocket-')) {
      const now = Date.now();
      if (now - this.lastWebSocketNotification < this.webSocketNotificationCooldown) {
        return; // Skip this notification
      }
      this.lastWebSocketNotification = now;
    }

    // If page is visible and we have capacity, show immediately
    if (this.isPageVisible && this.activeToasts.size < this.maxConcurrentToasts && !this.isDuplicate(item.dedupKey)) {
      this.queue.push(item);
      this.processQueue();
    } else {
      // Otherwise queue it
      this.queue.push(item);
    }
  }

  success(message: ReactNode, options?: ToastOptions & { dedupKey?: string }): Id {
    const { dedupKey, ...toastOptions } = options || {};
    
    // If page is visible and we have capacity, show immediately and return ID
    if (this.isPageVisible && this.activeToasts.size < this.maxConcurrentToasts && !this.isDuplicate(dedupKey)) {
      const id = toastify.success(message, toastOptions);
      this.activeToasts.add(id);
      if (dedupKey) {
        this.recentMessages.set(dedupKey, Date.now());
      }
      return id;
    }
    
    // Otherwise queue it and return a placeholder
    this.addToQueue({ type: 'success', message, options: toastOptions, dedupKey });
    return Symbol() as unknown as Id;
  }

  error(message: ReactNode, options?: ToastOptions & { dedupKey?: string }): Id {
    const { dedupKey, ...toastOptions } = options || {};
    
    if (this.isPageVisible && this.activeToasts.size < this.maxConcurrentToasts && !this.isDuplicate(dedupKey)) {
      const id = toastify.error(message, toastOptions);
      this.activeToasts.add(id);
      if (dedupKey) {
        this.recentMessages.set(dedupKey, Date.now());
      }
      return id;
    }
    
    this.addToQueue({ type: 'error', message, options: toastOptions, dedupKey });
    return Symbol() as unknown as Id;
  }

  info(message: ReactNode, options?: ToastOptions & { dedupKey?: string }): Id {
    const { dedupKey, ...toastOptions } = options || {};
    
    if (this.isPageVisible && this.activeToasts.size < this.maxConcurrentToasts && !this.isDuplicate(dedupKey)) {
      const id = toastify.info(message, toastOptions);
      this.activeToasts.add(id);
      if (dedupKey) {
        this.recentMessages.set(dedupKey, Date.now());
      }
      return id;
    }
    
    this.addToQueue({ type: 'info', message, options: toastOptions, dedupKey });
    return Symbol() as unknown as Id;
  }

  warning(message: ReactNode, options?: ToastOptions & { dedupKey?: string }): Id {
    const { dedupKey, ...toastOptions } = options || {};
    
    if (this.isPageVisible && this.activeToasts.size < this.maxConcurrentToasts && !this.isDuplicate(dedupKey)) {
      const id = toastify.warning(message, toastOptions);
      this.activeToasts.add(id);
      if (dedupKey) {
        this.recentMessages.set(dedupKey, Date.now());
      }
      return id;
    }
    
    this.addToQueue({ type: 'warning', message, options: toastOptions, dedupKey });
    return Symbol() as unknown as Id;
  }

  // Special method for WebSocket notifications
  websocketStatus(connected: boolean) {
    const message = connected ? 'WebSocket connected' : 'WebSocket disconnected';
    this.info(message, { 
      autoClose: 3000,
      dedupKey: `websocket-status-${connected}`
    });
  }

  // Clear the queue (useful for cleanup)
  clearQueue() {
    this.queue = [];
  }

  // Direct access to original toast for special cases
  get raw() {
    return toastify;
  }

  // Compatibility methods for react-toastify
  loading(message: ReactNode, options?: ToastOptions) {
    return toastify.loading(message, options);
  }

  update(toastId: Id, options: ToastOptions & { render?: ReactNode; type?: 'success' | 'error' | 'info' | 'warning' }) {
    return toastify.update(toastId, options);
  }

  dismiss(toastId?: Id) {
    return toastify.dismiss(toastId);
  }
}

// Export singleton instance
export const toast = new ToastManager();

// Re-export ToastContainer for compatibility
export { ToastContainer } from 'react-toastify';