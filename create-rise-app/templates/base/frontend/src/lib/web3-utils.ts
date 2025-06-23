/**
 * Web3 Utilities Library
 * Common helper functions for Web3 operations in RISE dApps
 */

import { formatEther, parseEther, isAddress } from 'viem';

/**
 * Format a bigint value to ETH string with proper decimals
 * @param value - The bigint value in wei
 * @param decimals - Number of decimal places to show (default: 4)
 * @returns Formatted string like "1.2345 ETH"
 */
export const formatETH = (value: bigint, decimals: number = 4): string => {
  const formatted = formatEther(value);
  const number = parseFloat(formatted);
  return `${number.toFixed(decimals)} ETH`;
};

/**
 * Parse ETH string to bigint wei value
 * @param value - The string value in ETH (e.g., "1.5")
 * @returns BigInt value in wei
 */
export const parseETH = (value: string): bigint => {
  try {
    return parseEther(value);
  } catch {
    throw new Error(`Invalid ETH amount: ${value}`);
  }
};

/**
 * Shorten an address for display
 * @param address - The full address
 * @param chars - Number of characters to show on each side (default: 4)
 * @returns Shortened address like "0x1234...5678"
 */
export const shortAddress = (address: string, chars: number = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/**
 * Check if a string is a valid Ethereum address
 * @param address - The address to validate
 * @returns True if valid address
 */
export const isValidAddress = (address: string): boolean => {
  return isAddress(address);
};

/**
 * Handle contract errors and return user-friendly messages
 * @param error - The error object from a contract call
 * @returns Object with title and description for display
 */
export const handleContractError = (error: unknown): { title: string; description: string } => {
  // Common error patterns
  const errorMessage = error instanceof Error ? error.message : String(error) || 'Unknown error';
  
  // User rejected transaction
  if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
    return {
      title: 'Transaction Cancelled',
      description: 'You rejected the transaction in your wallet'
    };
  }
  
  // Insufficient funds
  if (errorMessage.includes('insufficient funds') || errorMessage.includes('Insufficient funds')) {
    return {
      title: 'Insufficient Funds',
      description: 'You don\'t have enough ETH to complete this transaction'
    };
  }
  
  // Nonce too low
  if (errorMessage.includes('nonce too low') || errorMessage.includes('Nonce too low')) {
    return {
      title: 'Transaction Already Processed',
      description: 'This transaction has already been processed. Please refresh the page.'
    };
  }
  
  // Gas estimation failed
  if (errorMessage.includes('gas required exceeds') || errorMessage.includes('out of gas')) {
    return {
      title: 'Gas Estimation Failed',
      description: 'The transaction would fail. Please check your inputs and try again.'
    };
  }
  
  // Revert reasons
  if (errorMessage.includes('revert')) {
    const revertMatch = errorMessage.match(/reverted with reason string '(.+?)'/);
    if (revertMatch) {
      return {
        title: 'Transaction Failed',
        description: revertMatch[1]
      };
    }
    return {
      title: 'Transaction Reverted',
      description: 'The transaction would fail on-chain. Please check your inputs.'
    };
  }
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('Network')) {
    return {
      title: 'Network Error',
      description: 'Unable to connect to the blockchain. Please check your connection.'
    };
  }
  
  // Default error
  return {
    title: 'Transaction Failed',
    description: errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage
  };
};

// Note: waitForTransaction removed - use wagmi's useWaitForTransactionReceipt hook instead

/**
 * Format a timestamp to a readable date string
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date string
 */
export const formatTimestamp = (timestamp: bigint | number): string => {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
};

/**
 * Calculate gas buffer for transactions
 * @param estimatedGas - The estimated gas from contract
 * @param buffer - Percentage buffer to add (default: 20%)
 * @returns Buffered gas limit
 */
export const calculateGasBuffer = (estimatedGas: bigint, buffer: number = 20): bigint => {
  return (estimatedGas * BigInt(100 + buffer)) / BigInt(100);
};

/**
 * Format large numbers with commas
 * @param value - The number to format
 * @returns Formatted string with commas
 */
export const formatNumber = (value: number | bigint): string => {
  return new Intl.NumberFormat('en-US').format(Number(value));
};

/**
 * Convert hex string to number
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Number value
 */
export const hexToNumber = (hex: string): number => {
  return parseInt(hex, 16);
};

/**
 * Check if transaction hash is valid
 * @param hash - Transaction hash to validate
 * @returns True if valid transaction hash
 */
export const isValidTxHash = (hash: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

/**
 * Truncate text in the middle
 * @param text - Text to truncate
 * @param startChars - Characters to show at start
 * @param endChars - Characters to show at end
 * @returns Truncated text
 */
export const truncateMiddle = (text: string, startChars: number = 10, endChars: number = 10): string => {
  if (text.length <= startChars + endChars) return text;
  return `${text.slice(0, startChars)}...${text.slice(-endChars)}`;
};

/**
 * Retry an async function with exponential backoff
 * @param fn - Async function to retry
 * @param retries - Number of retries (default: 3)
 * @param delay - Initial delay in ms (default: 1000)
 * @returns Result of the function
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
};