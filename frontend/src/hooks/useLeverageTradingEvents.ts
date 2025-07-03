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
  const { manager } = useWebSocket();
  const listenersRef = useRef<{ [key: string]: (event: ContractEvent) => void }>({});

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
    if (!manager) return;

    // Create event listeners
    const leverageTradingListener = (event: ContractEvent) => {
      handlePositionOpened(event);
      handlePositionClosed(event);
      handlePositionLiquidated(event);
    };

    const priceOracleListener = (event: ContractEvent) => {
      handlePriceUpdated(event);
    };

    // Store listeners in ref for cleanup
    listenersRef.current = {
      leverageTrading: leverageTradingListener,
      priceOracle: priceOracleListener
    };

    // Subscribe to contract events
    manager.on(`logs:${contracts.LeverageTrading.address}`, leverageTradingListener);
    // Subscribe to oracle events
    manager.on(`logs:${contracts.PriceOracle.address}`, priceOracleListener);

    console.log('Subscribed to leverage trading events');

    // Cleanup
    return () => {
      if (listenersRef.current.leverageTrading) {
        manager.removeListener(`logs:${contracts.LeverageTrading.address}`, listenersRef.current.leverageTrading);
      }
      if (listenersRef.current.priceOracle) {
        manager.removeListener(`logs:${contracts.PriceOracle.address}`, listenersRef.current.priceOracle);
      }
      console.log('Unsubscribed from leverage trading events');
    };
  }, [manager, handlePositionOpened, handlePositionClosed, handlePositionLiquidated, handlePriceUpdated]);

  return {
    // Can expose additional utilities here if needed
  };
}