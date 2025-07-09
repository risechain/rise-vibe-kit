import { useCallback } from 'react';
import { createContractHook } from '../useContractFactory';

// Create the base hook using the factory
const useBaseChatApp = createContractHook('ChatApp');

/**
 * Custom hook for ChatApp contract interactions
 * Built on top of the generic contract factory
 * 
 * This demonstrates how to create contract-specific hooks with
 * type-safe methods and business logic
 */
export function useChatAppContract() {
  const { read, write, isLoading } = useBaseChatApp();

  // Read functions with proper typing
  const checkRegistration = useCallback(async (address: string): Promise<boolean> => {
    return await read('isUserRegistered', [address]) as boolean;
  }, [read]);

  const getUserId = useCallback(async (address: string): Promise<string> => {
    return await read('userId', [address]) as string;
  }, [read]);

  const getKarma = useCallback(async (address: string): Promise<string> => {
    const karma = await read('karma', [address]) as bigint;
    return karma.toString();
  }, [read]);

  // Write functions with proper typing
  const registerUser = useCallback(async (userId: string) => {
    return await write('registerUser', [userId]);
  }, [write]);

  const sendMessage = useCallback(async (message: string) => {
    return await write('sendMessage', [message]);
  }, [write]);

  const giveKarma = useCallback(async (msgId: string) => {
    return await write('giveKarma', [msgId]);
  }, [write]);

  const takeKarma = useCallback(async (msgId: string) => {
    return await write('takeKarma', [msgId]);
  }, [write]);

  return {
    // State
    isLoading,
    
    // Read functions
    checkRegistration,
    getUserId,
    getKarma,
    
    // Write functions
    registerUser,
    sendMessage: sendMessage, // Keep the same name for backward compatibility
    sendContractMessage: sendMessage, // Alias for backward compatibility
    giveKarma,
    takeKarma,
  };
}