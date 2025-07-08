import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { contracts } from '@/contracts/contracts';
import { formatUnits } from 'viem';
import { toast } from '@/lib/toast-manager';
import { getFeedIdFromHash } from '@/lib/feedIdMapping';
import type { ContractEvent } from '@/types/contracts';

export interface PositionOpenedEvent {
  positionId: bigint;
  trader: string;
  amount: bigint;
  entryPrice: bigint;
  leverage: number;
  isLong: boolean;
  feedId: string;
}

export interface PositionClosedEvent {
  positionId: bigint;
  trader: string;
  pnl: bigint;
  exitPrice: bigint;
}

export interface PositionLiquidatedEvent {
  positionId: bigint;
  trader: string;
  exitPrice: bigint;
}

export interface PriceUpdatedEvent {
  feedId: string;
  price: bigint;
  timestamp: bigint;
}

interface UseLeverageTradingEventsProps {
  onPositionOpened?: (event: PositionOpenedEvent) => void;
  onPositionClosed?: (event: PositionClosedEvent) => void;
  onPositionLiquidated?: (event: PositionLiquidatedEvent) => void;
  onPriceUpdated?: (event: PriceUpdatedEvent) => void;
}

export function useLeverageTradingEvents({
  onPositionOpened,
  onPositionClosed,
  onPositionLiquidated,
  onPriceUpdated
}: UseLeverageTradingEventsProps) {
  const { contractEvents } = useWebSocket();
  const processedEventsRef = useRef<Set<string>>(new Set());

  const handlePositionOpened = useCallback((event: ContractEvent) => {
    if (event.decoded && event.eventName === 'PositionOpened' && event.args) {
      const args = event.args as {
        positionId: bigint;
        trader: string;
        amount: bigint;
        entryPrice: bigint;
        leverage: bigint;
        isLong: boolean;
        feedId: string;
      };
      const { positionId, trader, amount, entryPrice, leverage, isLong, feedId } = args;
      
      const parsedEvent: PositionOpenedEvent = {
        positionId,
        trader,
        amount,
        entryPrice,
        leverage: Number(leverage) / 10000, // Convert from bigint and divide by precision
        isLong,
        feedId
      };

      console.log('Position opened event:', parsedEvent);
      onPositionOpened?.(parsedEvent);

      // Show toast notification
      toast.info(`${isLong ? 'Long' : 'Short'} position #${positionId} opened with ${Number(leverage) / 10000}x leverage`);
    }
  }, [onPositionOpened]);

  const handlePositionClosed = useCallback((event: ContractEvent) => {
    if (event.decoded && event.eventName === 'PositionClosed' && event.args) {
      const args = event.args as {
        positionId: bigint;
        trader: string;
        pnl: bigint;
        exitPrice: bigint;
      };
      const { positionId, trader, pnl, exitPrice } = args;
      
      const parsedEvent: PositionClosedEvent = {
        positionId,
        trader,
        pnl,
        exitPrice
      };

      console.log('Position closed event:', parsedEvent);
      onPositionClosed?.(parsedEvent);

      // Show toast notification with PnL
      const pnlAmount = Number(formatUnits(pnl, 6));
      const isProfit = pnl >= 0n;
      
      const message = `Position #${positionId} closed with ${isProfit ? 'profit' : 'loss'}: ${isProfit ? '+' : ''}${pnlAmount.toFixed(2)} USDC`;
      if (isProfit) {
        toast.success(message);
      } else {
        toast.error(message);
      }
    }
  }, [onPositionClosed]);

  const handlePositionLiquidated = useCallback((event: ContractEvent) => {
    if (event.decoded && event.eventName === 'PositionLiquidated' && event.args) {
      const args = event.args as {
        positionId: bigint;
        trader: string;
        exitPrice: bigint;
      };
      const { positionId, trader, exitPrice } = args;
      
      const parsedEvent: PositionLiquidatedEvent = {
        positionId,
        trader,
        exitPrice
      };

      console.log('Position liquidated event:', parsedEvent);
      onPositionLiquidated?.(parsedEvent);

      // Show toast notification
      toast.error(`Position #${positionId} has been liquidated`);
    }
  }, [onPositionLiquidated]);

  const handlePriceUpdated = useCallback((event: ContractEvent) => {
    if (event.decoded && event.eventName === 'PriceUpdated' && event.args) {
      const args = event.args as {
        price: bigint;
        timestamp: bigint;
        feedId?: string;
      };
      const { price, timestamp } = args;
      
      // For indexed string parameters, we need to check the topics
      // The feedId is the second topic (first is event signature)
      let feedId: string | undefined;
      if (event.topics && event.topics.length > 1) {
        const feedIdHash = event.topics[1];
        feedId = getFeedIdFromHash(feedIdHash);
      }
      
      if (feedId) {
        const parsedEvent: PriceUpdatedEvent = {
          feedId,
          price,
          timestamp
        };

        console.log('Price updated event:', parsedEvent);
        onPriceUpdated?.(parsedEvent);
      }
    }
  }, [onPriceUpdated]);

  useEffect(() => {
    // Process new events from the contractEvents array
    contractEvents.forEach(event => {
      // Create a unique key for each event
      const eventKey = `${event.transactionHash}-${event.logIndex}`;
      
      // Skip if already processed
      if (processedEventsRef.current.has(eventKey)) {
        return;
      }
      
      // Mark as processed
      processedEventsRef.current.add(eventKey);
      
      // Handle LeverageTrading events
      if (event.address?.toLowerCase() === contracts.LeverageTrading.address.toLowerCase()) {
        handlePositionOpened(event);
        handlePositionClosed(event);
        handlePositionLiquidated(event);
      }
      
      // Handle PriceOracle events
      if (event.address?.toLowerCase() === contracts.PriceOracle.address.toLowerCase()) {
        handlePriceUpdated(event);
      }
    });
    
    // Clean up old processed events to prevent memory leak
    if (processedEventsRef.current.size > 1000) {
      processedEventsRef.current.clear();
    }
  }, [contractEvents, handlePositionOpened, handlePositionClosed, handlePositionLiquidated, handlePriceUpdated]);

  return {
    // Can expose additional utilities here if needed
  };
}