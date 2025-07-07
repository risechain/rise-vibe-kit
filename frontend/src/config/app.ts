/**
 * Application configuration
 * Centralized configuration for app-wide settings
 */

export const appConfig = {
  // Wallet configuration
  wallet: {
    // If true, only embedded wallets will be available (no MetaMask, WalletConnect, etc.)
    embeddedOnly: false,
  },
  
  // Debug page configuration
  debug: {
    // Whether to auto-scroll to bottom when new events arrive
    autoScroll: false,
    // Stop auto-scrolling after this many events (prevents performance issues)
    autoScrollThreshold: 50,
  },
  
  // WebSocket configuration
  websocket: {
    // Whether to show the WebSocket connection status indicator
    showStatus: false,
  },
  
  // Add other app-wide configuration here as needed
} as const;

// Type-safe config getter
export function getAppConfig<K extends keyof typeof appConfig>(key: K): typeof appConfig[K] {
  return appConfig[key];
}