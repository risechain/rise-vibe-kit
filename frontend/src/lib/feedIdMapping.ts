import { keccak256, toHex } from 'viem';

// Mapping of feedId strings to their keccak256 hashes
export const FEED_ID_HASHES = {
  BTCUSD: keccak256(toHex('BTCUSD')),
  ETHUSD: keccak256(toHex('ETHUSD')),
} as const;

// Reverse mapping for quick lookups
export const HASH_TO_FEED_ID = Object.entries(FEED_ID_HASHES).reduce(
  (acc, [feedId, hash]) => {
    acc[hash] = feedId;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Get the feedId string from a hash
 * @param hash The keccak256 hash of the feedId
 * @returns The original feedId string or undefined if not found
 */
export function getFeedIdFromHash(hash: string): string | undefined {
  return HASH_TO_FEED_ID[hash.toLowerCase()];
}

/**
 * Get the hash for a feedId string
 * @param feedId The feedId string (e.g., "BTCUSD")
 * @returns The keccak256 hash of the feedId
 */
export function getFeedIdHash(feedId: keyof typeof FEED_ID_HASHES): string {
  return FEED_ID_HASHES[feedId];
}