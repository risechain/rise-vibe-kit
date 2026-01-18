import { keccak256, toHex, parseEther } from 'viem';
import { FRENPET_ADDRESS, CHATAPP_ADDRESS } from '@/contracts/contracts';

// MockUSD from wallet-demo for testing
const MOCK_USD_ADDRESS = '0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50';
const USDC_ADDRESS = MOCK_USD_ADDRESS; // Use MockUSD as USDC for testing

/**
 * Global permissions for Rise Wallet session keys
 * This defines all contracts and functions that can be called across the entire app
 */

// All contract calls that can be made with session keys
export const GLOBAL_CALLS = [
  // FrenPet contract functions
  {
    to: FRENPET_ADDRESS,
    signature: keccak256(toHex('createPet(string)')).slice(0, 10),
  },
  {
    to: FRENPET_ADDRESS,
    signature: keccak256(toHex('feedPet()')).slice(0, 10),
  },
  {
    to: FRENPET_ADDRESS,
    signature: keccak256(toHex('playWithPet()')).slice(0, 10),
  },
  {
    to: FRENPET_ADDRESS,
    signature: keccak256(toHex('initiateBattle(address)')).slice(0, 10),
  },

  // ChatApp contract functions
  {
    to: CHATAPP_ADDRESS,
    signature: keccak256(toHex('registerUser(string)')).slice(0, 10),
  },
  {
    to: CHATAPP_ADDRESS,
    signature: keccak256(toHex('sendMessage(string)')).slice(0, 10),
  },
  {
    to: CHATAPP_ADDRESS,
    signature: keccak256(toHex('giveKarma(uint256)')).slice(0, 10),
  },
  {
    to: CHATAPP_ADDRESS,
    signature: keccak256(toHex('takeKarma(uint256)')).slice(0, 10),
  },

  // USDC (ERC20) functions
  {
    to: USDC_ADDRESS,
    signature: keccak256(toHex('transfer(address,uint256)')).slice(0, 10),
  },
  {
    to: USDC_ADDRESS,
    signature: keccak256(toHex('approve(address,uint256)')).slice(0, 10),
  },
  {
    to: USDC_ADDRESS,
    signature: keccak256(toHex('transferFrom(address,address,uint256)')).slice(0, 10),
  },

  // MockUSD (for testing)
  {
    to: MOCK_USD_ADDRESS,
    signature: keccak256(toHex('transfer(address,uint256)')).slice(0, 10),
  },
  {
    to: MOCK_USD_ADDRESS,
    signature: keccak256(toHex('approve(address,uint256)')).slice(0, 10),
  },
];

// Spending limits for tokens
export const GLOBAL_SPEND = [
  {
    limit: parseEther('1000'), // 1000 USDC per minute
    period: 'minute' as const,
    token: USDC_ADDRESS,
  },
  {
    limit: parseEther('50'), // 50 MockUSD per minute (for testing)
    period: 'minute' as const,
    token: MOCK_USD_ADDRESS,
  },
];

// Combined global permissions
export const GLOBAL_PERMISSIONS = {
  calls: GLOBAL_CALLS,
  spend: GLOBAL_SPEND,
};
