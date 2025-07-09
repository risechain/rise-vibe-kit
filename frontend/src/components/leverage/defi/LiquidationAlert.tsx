'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatUnits } from 'viem';
import type { Position } from './PositionCard';

interface LiquidationAlertProps {
  positions: Position[];
  currentPrices: Record<string, bigint>;
  decimals?: number;
  threshold?: number;
  onLiquidationRisk?: (position: Position) => void;
  className?: string;
}

export function LiquidationAlert({
  positions,
  currentPrices,
  decimals = 18,
  threshold = 10, // 10% distance to liquidation
  onLiquidationRisk,
  className = ''
}: LiquidationAlertProps) {
  const [riskyPositions, setRiskyPositions] = useState<Position[]>([]);
  const [criticalPositions, setCriticalPositions] = useState<Position[]>([]);

  useEffect(() => {
    const risky: Position[] = [];
    const critical: Position[] = [];

    positions.forEach(position => {
      if (!position.isOpen) return;
      
      const currentPrice = currentPrices[position.asset];
      if (!currentPrice) return;

      const currentPriceValue = parseFloat(formatUnits(currentPrice, decimals));
      const liquidationPriceValue = parseFloat(formatUnits(position.liquidationPrice, decimals));
      
      const distanceToLiquidation = position.side === 'long'
        ? ((currentPriceValue - liquidationPriceValue) / currentPriceValue) * 100
        : ((liquidationPriceValue - currentPriceValue) / currentPriceValue) * 100;

      if (distanceToLiquidation < threshold && distanceToLiquidation > threshold / 2) {
        risky.push(position);
      } else if (distanceToLiquidation <= threshold / 2) {
        critical.push(position);
        if (onLiquidationRisk) {
          onLiquidationRisk(position);
        }
      }
    });

    setRiskyPositions(risky);
    setCriticalPositions(critical);
  }, [positions, currentPrices, decimals, threshold, onLiquidationRisk]);

  if (riskyPositions.length === 0 && criticalPositions.length === 0) {
    return null;
  }

  return (
    <Card className={cn("p-4 border-orange-500 dark:border-orange-400", className)}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-orange-600 dark:text-orange-400">
            ⚠️ Liquidation Alerts
          </h3>
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            {riskyPositions.length + criticalPositions.length} at risk
          </Badge>
        </div>

        {/* Critical positions */}
        {criticalPositions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Critical Risk - Immediate Action Required
            </p>
            {criticalPositions.map(position => (
              <AlertItem
                key={position.id}
                position={position}
                currentPrice={currentPrices[position.asset]}
                decimals={decimals}
                severity="critical"
              />
            ))}
          </div>
        )}

        {/* Risky positions */}
        {riskyPositions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
              High Risk - Monitor Closely
            </p>
            {riskyPositions.map(position => (
              <AlertItem
                key={position.id}
                position={position}
                currentPrice={currentPrices[position.asset]}
                decimals={decimals}
                severity="warning"
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

interface AlertItemProps {
  position: Position;
  currentPrice: bigint;
  decimals: number;
  severity: 'warning' | 'critical';
}

function AlertItem({ position, currentPrice, decimals, severity }: AlertItemProps) {
  const currentPriceValue = parseFloat(formatUnits(currentPrice, decimals));
  const liquidationPriceValue = parseFloat(formatUnits(position.liquidationPrice, decimals));
  
  const distanceToLiquidation = position.side === 'long'
    ? ((currentPriceValue - liquidationPriceValue) / currentPriceValue) * 100
    : ((liquidationPriceValue - currentPriceValue) / currentPriceValue) * 100;

  const bgColor = severity === 'critical' 
    ? 'bg-red-100 dark:bg-red-900/20' 
    : 'bg-orange-100 dark:bg-orange-900/20';
    
  const textColor = severity === 'critical'
    ? 'text-red-700 dark:text-red-300'
    : 'text-orange-700 dark:text-orange-300';

  return (
    <div className={cn("p-2 rounded-md text-sm", bgColor, textColor)}>
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {position.asset} {position.side.toUpperCase()} {position.leverage}x
        </span>
        <span className="font-bold">
          {distanceToLiquidation.toFixed(1)}% to liquidation
        </span>
      </div>
      <div className="text-xs opacity-80 mt-1">
        Current: ${currentPriceValue.toFixed(2)} | Liquidation: ${liquidationPriceValue.toFixed(2)}
      </div>
    </div>
  );
}