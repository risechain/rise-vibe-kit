'use client';

import { useCallback } from 'react';
import { Slider } from '@/components/ui/slider';

interface BalancePercentageSliderProps {
  value: number;
  onChange: (value: number) => void;
  marks?: number[];
}

export function BalancePercentageSlider({
  value,
  onChange,
  marks = [10, 25, 50, 75, 100]
}: BalancePercentageSliderProps) {
  const handleChange = useCallback((values: number[]) => {
    onChange(values[0]);
  }, [onChange]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Slider
          value={[value]}
          onValueChange={handleChange}
          min={1}
          max={100}
          step={1}
          className="w-full"
        />
        
        {/* Percentage marks */}
        <div className="flex justify-between mt-2">
          {marks.map((mark) => (
            <button
              key={mark}
              type="button"
              onClick={() => onChange(mark)}
              className={`text-xs px-1 py-0.5 rounded ${
                value === mark
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground transition-colors'
              }`}
            >
              {mark}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}