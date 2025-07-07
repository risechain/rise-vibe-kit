'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useCallback } from 'react';
import PerpExchangeABI from '@/contracts/abi/PerpExchange.json';
// import { useEventCache } from './useEventCache';

// This would be set after deployment
const PERP_EXCHANGE_ADDRESS = process.env.NEXT_PUBLIC_PERP_EXCHANGE_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

export interface Position {
  trader: string;
  isLong: boolean;
  size: bigint;
  collateral: bigint;
  entryPrice: bigint;
  entryTimestamp: bigint;
  lastFundingTimestamp: bigint;
  isOpen: boolean;
}

export interface PriceInfo {
  price: bigint;
  timestamp: bigint;
}

// Stork oracle price update data structure
export interface StorkPriceUpdate {
  temporalNumericValue: {
    timestampNs: bigint;
    quantizedValue: bigint;
  };
  id: string; // bytes32 as hex string
  publisherMerkleRoot: string;
  valueComputeAlgHash: string;
  r: string;
  s: string;
  v: number;
}

export function usePerpExchange() {
  // Read current price info
  const { data: priceInfo } = useReadContract({
    address: PERP_EXCHANGE_ADDRESS,
    abi: PerpExchangeABI,
    functionName: 'getCurrentPrice',
  }) as { data: PriceInfo | undefined };

  // Check if price is stale
  const { data: isPriceStale } = useReadContract({
    address: PERP_EXCHANGE_ADDRESS,
    abi: PerpExchangeABI,
    functionName: 'isPriceStale',
  }) as { data: boolean | undefined };

  // Open position
  const { 
    writeContract: openPosition, 
    data: openPositionData,
    isPending: isOpeningPosition 
  } = useWriteContract();

  // Close position
  const { 
    writeContract: closePosition,
    data: closePositionData, 
    isPending: isClosingPosition 
  } = useWriteContract();

  // Submit price update to Stork oracle
  const { 
    writeContract: submitPriceUpdate,
    isPending: isSubmittingPriceUpdate 
  } = useWriteContract();

  // Force price update from oracle
  const { 
    writeContract: updatePrice,
    isPending: isUpdatingPrice 
  } = useWriteContract();

  // Liquidate position
  const { 
    writeContract: liquidatePosition,
    isPending: isLiquidating 
  } = useWriteContract();

  // Wait for transaction receipts
  const { isLoading: isOpenPositionPending } = useWaitForTransactionReceipt({
    hash: openPositionData,
  });

  const { isLoading: isClosePositionPending } = useWaitForTransactionReceipt({
    hash: closePositionData,
  });

  // Get config for readContract
  const config = useConfig();

  // Get position details
  const getPosition = useCallback(async (positionId: number): Promise<Position | null> => {
    try {
      const position = await readContract(config, {
        address: PERP_EXCHANGE_ADDRESS,
        abi: PerpExchangeABI,
        functionName: 'getPosition',
        args: [BigInt(positionId)],
      });
      return position as Position;
    } catch (error) {
      console.error('Failed to get position:', error);
      return null;
    }
  }, [config]);

  // Get position health
  const getPositionHealth = useCallback(async (positionId: number) => {
    try {
      const result = await readContract(config, {
        address: PERP_EXCHANGE_ADDRESS,
        abi: PerpExchangeABI,
        functionName: 'getPositionHealth',
        args: [BigInt(positionId)],
      });
      return result as { pnl: bigint; healthRatio: bigint };
    } catch (error) {
      console.error('Failed to get position health:', error);
      return null;
    }
  }, [config]);

  // Calculate PnL
  const calculatePnL = useCallback(async (positionId: number) => {
    try {
      const pnl = await readContract(config, {
        address: PERP_EXCHANGE_ADDRESS,
        abi: PerpExchangeABI,
        functionName: 'calculatePnL',
        args: [BigInt(positionId)],
      });
      return pnl as bigint;
    } catch (error) {
      console.error('Failed to calculate PnL:', error);
      return null;
    }
  }, [config]);

  // Note: useEventCache currently only supports 'ChatApp' contract
  // In production, you would extend this to support multiple contracts
  const positionEvents: unknown[] = [];
  const priceUpdateEvents: unknown[] = [];

  // Helper functions
  const openLongPosition = useCallback((collateralEth: string, leverage: number) => {
    openPosition({
      address: PERP_EXCHANGE_ADDRESS,
      abi: PerpExchangeABI,
      functionName: 'openPosition',
      args: [true, BigInt(leverage)],
      value: parseEther(collateralEth),
    });
  }, [openPosition]);

  const openShortPosition = useCallback((collateralEth: string, leverage: number) => {
    openPosition({
      address: PERP_EXCHANGE_ADDRESS,
      abi: PerpExchangeABI,
      functionName: 'openPosition',
      args: [false, BigInt(leverage)],
      value: parseEther(collateralEth),
    });
  }, [openPosition]);

  const closePositionById = useCallback((positionId: number) => {
    closePosition({
      address: PERP_EXCHANGE_ADDRESS,
      abi: PerpExchangeABI,
      functionName: 'closePosition',
      args: [BigInt(positionId)],
    });
  }, [closePosition]);

  const submitStorkPriceUpdate = useCallback((updateData: StorkPriceUpdate, fee: string) => {
    submitPriceUpdate({
      address: PERP_EXCHANGE_ADDRESS,
      abi: PerpExchangeABI,
      functionName: 'submitPriceUpdate',
      args: [updateData],
      value: parseEther(fee),
    });
  }, [submitPriceUpdate]);

  const forcePriceUpdate = useCallback(() => {
    updatePrice({
      address: PERP_EXCHANGE_ADDRESS,
      abi: PerpExchangeABI,
      functionName: 'updatePrice',
    });
  }, [updatePrice]);

  const liquidatePositionById = useCallback((positionId: number) => {
    liquidatePosition({
      address: PERP_EXCHANGE_ADDRESS,
      abi: PerpExchangeABI,
      functionName: 'liquidatePosition',
      args: [BigInt(positionId)],
    });
  }, [liquidatePosition]);

  return {
    // State
    currentPrice: priceInfo?.price,
    lastPriceTimestamp: priceInfo?.timestamp,
    isPriceStale,
    positionEvents,
    priceUpdateEvents,
    
    // Actions
    openLongPosition,
    openShortPosition,
    closePositionById,
    submitStorkPriceUpdate,
    forcePriceUpdate,
    liquidatePositionById,
    
    // Read functions
    getPosition,
    getPositionHealth,
    calculatePnL,
    
    // Loading states
    isOpeningPosition: isOpeningPosition || isOpenPositionPending,
    isClosingPosition: isClosingPosition || isClosePositionPending,
    isSubmittingPriceUpdate,
    isUpdatingPrice,
    isLiquidating,
  };
}

// Helper to use wagmi's readContract
import { readContract } from '@wagmi/core';
import { useConfig } from 'wagmi';