'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatUnits } from 'viem';

export interface PriceData {
  timestamp: Date;
  price: bigint;
  volume?: bigint;
  high?: bigint;
  low?: bigint;
  open?: bigint;
}

export interface PriceChartProps {
  data: PriceData[];
  decimals?: number;
  height?: number;
  chartType?: 'line' | 'area';
  showVolume?: boolean;
  showGrid?: boolean;
  currentPrice?: bigint;
  referenceLines?: Array<{
    value: bigint;
    label: string;
    color?: string;
  }>;
  className?: string;
}

export function PriceChart({
  data,
  decimals = 18,
  height = 400,
  chartType = 'area',
  showVolume = false,
  showGrid = true,
  currentPrice,
  referenceLines = [],
  className = '',
}: PriceChartProps) {
  // Transform data for recharts
  const chartData = useMemo(() => {
    return data.map((item) => ({
      time: item.timestamp.getTime(),
      price: parseFloat(formatUnits(item.price, decimals)),
      volume: item.volume ? parseFloat(formatUnits(item.volume, decimals)) : undefined,
      high: item.high ? parseFloat(formatUnits(item.high, decimals)) : undefined,
      low: item.low ? parseFloat(formatUnits(item.low, decimals)) : undefined,
      open: item.open ? parseFloat(formatUnits(item.open, decimals)) : undefined,
    }));
  }, [data, decimals]);

  // Calculate price change
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return { value: 0, percentage: 0, isPositive: true };
    
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    const change = lastPrice - firstPrice;
    const percentage = (change / firstPrice) * 100;
    
    return {
      value: change,
      percentage,
      isPositive: change >= 0,
    };
  }, [chartData]);

  const formatXAxis = (tickItem: number) => {
    const date = new Date(tickItem);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTooltipLabel = (value: number) => {
    const date = new Date(value);
    return date.toLocaleString();
  };

  const ChartComponent = chartType === 'line' ? LineChart : AreaChart;
  const DataComponent = chartType === 'line' ? Line : Area;

  if (data.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-center h-[400px] text-gray-500">
          No price data available
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Price Chart</h3>
          <div className="text-right">
            {currentPrice && (
              <p className="text-2xl font-bold">
                ${parseFloat(formatUnits(currentPrice, decimals)).toFixed(2)}
              </p>
            )}
            <p className={cn(
              'text-sm font-medium',
              priceChange.isPositive ? 'text-green-500' : 'text-red-500'
            )}>
              {priceChange.isPositive ? '+' : ''}{priceChange.value.toFixed(2)} (
              {priceChange.percentage.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.5} />
          )}
          
          <XAxis
            dataKey="time"
            tickFormatter={formatXAxis}
            stroke="#666"
            fontSize={12}
          />
          
          <YAxis
            stroke="#666"
            fontSize={12}
            domain={['dataMin - 5', 'dataMax + 5']}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          
          <Tooltip
            labelFormatter={formatTooltipLabel}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          
          <DataComponent
            dataKey="price"
            stroke={priceChange.isPositive ? '#10b981' : '#ef4444'}
            fill={priceChange.isPositive ? '#10b981' : '#ef4444'}
            fillOpacity={chartType === 'area' ? 0.3 : 1}
            strokeWidth={2}
          />
          
          {/* Reference lines */}
          {referenceLines.map((line, index) => (
            <ReferenceLine
              key={index}
              y={parseFloat(formatUnits(line.value, decimals))}
              stroke={line.color || '#666'}
              strokeDasharray="5 5"
              label={line.label}
            />
          ))}
          
          {/* Current price line */}
          {currentPrice && (
            <ReferenceLine
              y={parseFloat(formatUnits(currentPrice, decimals))}
              stroke="#3b82f6"
              strokeWidth={2}
              label="Current"
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>

      {/* Volume chart (optional) */}
      {showVolume && chartData.some(d => d.volume !== undefined) && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Volume</h4>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.5} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}`, 'Volume']}
              />
              <Area
                dataKey="volume"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}