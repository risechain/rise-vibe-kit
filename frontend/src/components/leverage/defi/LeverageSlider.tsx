'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface LeverageSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  marks?: number[];
  showValue?: boolean;
  disabled?: boolean;
  className?: string;
}

export function LeverageSlider({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  marks = [1, 5, 10, 25, 50, 100],
  showValue = true,
  disabled = false,
  className = ''
}: LeverageSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  const percentage = ((value - min) / (max - min)) * 100;
  
  const getColorClass = (leverage: number) => {
    if (leverage <= 5) return 'bg-green-500';
    if (leverage <= 25) return 'bg-yellow-500';
    if (leverage <= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  const handleQuickSelect = (leverage: number) => {
    if (!disabled) {
      onChange(leverage);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Slider */}
      <div className="relative">
        {showValue && (
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Leverage</label>
            <span className={cn(
              "text-lg font-bold",
              getColorClass(value).replace('bg-', 'text-')
            )}>
              {value}x
            </span>
          </div>
        )}
        
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div 
            className={cn(
              "absolute h-full rounded-full transition-all",
              getColorClass(value),
              isDragging ? '' : 'transition-all duration-200'
            )}
            style={{ width: `${percentage}%` }}
          />
          
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            disabled={disabled}
            className={cn(
              "absolute w-full h-full opacity-0 cursor-pointer",
              disabled && "cursor-not-allowed"
            )}
          />
          
          <div 
            className={cn(
              "absolute w-4 h-4 rounded-full shadow-lg transform -translate-y-1/2 top-1/2 transition-all",
              getColorClass(value),
              isDragging ? 'scale-125' : '',
              disabled ? 'opacity-50' : ''
            )}
            style={{ left: `calc(${percentage}% - 8px)` }}
          />
        </div>
      </div>
      
      {/* Quick select buttons */}
      {marks.length > 0 && (
        <div className="flex items-center justify-between">
          {marks.map((mark) => (
            <button
              key={mark}
              onClick={() => handleQuickSelect(mark)}
              disabled={disabled}
              className={cn(
                "text-xs font-medium px-2 py-1 rounded transition-colors",
                value === mark 
                  ? cn(getColorClass(mark), 'text-white')
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {mark}x
            </button>
          ))}
        </div>
      )}
      
      {/* Risk warning */}
      {value > 25 && (
        <p className={cn(
          "text-xs",
          value > 50 ? 'text-red-500' : 'text-orange-500'
        )}>
          ⚠️ {value > 50 ? 'High risk! Liquidation risk increases significantly.' : 'Medium risk. Trade carefully.'}
        </p>
      )}
    </div>
  );
}