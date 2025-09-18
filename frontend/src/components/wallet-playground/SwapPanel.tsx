'use client';

import { useState, useEffect } from 'react';
import { usePorto } from '@/providers/PortoProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast-manager';
import {
  UNISWAP_V2_ADDRESSES,
  TOKEN_INFO,
  RISE_FAUCET_URL,
  TRADING_PAIRS,
  UNISWAP_V2_ROUTER_ABI,
  UNISWAP_V2_PAIR_ABI,
  MOCK_TOKEN_ABI
} from '@/contracts/uniswapV2';
import { parseUnits, formatUnits } from 'viem';
import { ExternalLink, ArrowUpDown, Info } from 'lucide-react';

export function SwapPanel() {
  const { isConnected, account, provider } = usePorto();

  const [fromToken, setFromToken] = useState('WETH');
  const [toToken, setToToken] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isLoading, setIsLoading] = useState(false);
  const [priceImpact, setPriceImpact] = useState<string>('0');

  const tokens = ['WETH', 'USDC', 'USDT'];
  const slippageOptions = ['0.5', '1', '3'];

  // Get token info
  const getTokenInfo = (symbol: string) => {
    return TOKEN_INFO[symbol.toLowerCase() as keyof typeof TOKEN_INFO];
  };

  // Calculate output amount based on pair reserves
  const calculateOutput = async (inputAmount: string) => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return '';

    try {
      const pairKey = `${fromToken}/${toToken}`;
      const pairAddress = TRADING_PAIRS[pairKey as keyof typeof TRADING_PAIRS] ||
                         TRADING_PAIRS[`${toToken}/${fromToken}` as keyof typeof TRADING_PAIRS];

      if (!pairAddress) {
        // No direct pair, need to route through WETH
        return '0';
      }

      // TODO: Fetch reserves and calculate actual output
      // For now, use mock calculation
      const rate = fromToken === 'WETH' ? 10000 :
                   toToken === 'WETH' ? 0.0001 :
                   1;
      return (parseFloat(inputAmount) * rate).toFixed(6);
    } catch (error) {
      console.error('Error calculating output:', error);
      return '0';
    }
  };

  const handleFromAmountChange = async (value: string) => {
    setFromAmount(value);
    const output = await calculateOutput(value);
    setToAmount(output);

    // Calculate price impact
    if (value && output) {
      // TODO: Calculate actual price impact based on pool reserves
      setPriceImpact('< 0.1');
    }
  };

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = async () => {
    if (!isConnected || !provider || !account) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const fromInfo = getTokenInfo(fromToken);
      const toInfo = getTokenInfo(toToken);

      const amountIn = parseUnits(fromAmount, fromInfo.decimals);
      const amountOutMin = parseUnits(
        (parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toString(),
        toInfo.decimals
      );

      // Encode approve transaction
      const approveData = {
        to: fromInfo.address,
        data: encodeFunctionData({
          abi: MOCK_TOKEN_ABI,
          functionName: 'approve',
          args: [UNISWAP_V2_ADDRESSES.router, amountIn]
        })
      };

      // Encode swap transaction
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes
      const swapData = {
        to: UNISWAP_V2_ADDRESSES.router,
        data: encodeFunctionData({
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [
            amountIn,
            amountOutMin,
            [fromInfo.address, toInfo.address],
            account,
            deadline
          ]
        })
      };

      // Send batch transaction
      const result = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          calls: [approveData, swapData],
          from: account,
          version: '1'
        }]
      });

      toast.success(`Swap initiated! ${fromAmount} ${fromToken} → ${toAmount} ${toToken}`);

      // Reset form
      setFromAmount('');
      setToAmount('');
    } catch (error) {
      console.error('Swap error:', error);
      toast.error('Swap failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Faucet Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-blue-900">
            Need test tokens? Get USDC and USDT from the RISE testnet faucet.
          </p>
          <a
            href={RISE_FAUCET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Open Faucet
            <ExternalLink className="ml-1 w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Swap Interface */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        {/* From Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From
          </label>
          <div className="flex space-x-2">
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="w-32 px-3 py-2 border rounded-lg"
            >
              {tokens.map(token => (
                <option key={token} value={token}>{token}</option>
              ))}
            </select>
            <Input
              type="number"
              value={fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              placeholder="0.0"
              className="flex-1"
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwapTokens}
            className="rounded-full"
          >
            <ArrowUpDown className="w-5 h-5" />
          </Button>
        </div>

        {/* To Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To
          </label>
          <div className="flex space-x-2">
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="w-32 px-3 py-2 border rounded-lg"
            >
              {tokens.map(token => (
                <option key={token} value={token} disabled={token === fromToken}>
                  {token}
                </option>
              ))}
            </select>
            <Input
              type="number"
              value={toAmount}
              placeholder="0.0"
              readOnly
              className="flex-1 bg-gray-50"
            />
          </div>
        </div>

        {/* Slippage Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slippage Tolerance
          </label>
          <div className="flex space-x-2">
            {slippageOptions.map(option => (
              <Button
                key={option}
                variant={slippage === option ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSlippage(option)}
              >
                {option}%
              </Button>
            ))}
            <Input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              placeholder="Custom"
              className="w-24"
            />
          </div>
        </div>

        {/* Price Info */}
        {fromAmount && toAmount && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Rate</span>
              <span>
                1 {fromToken} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(4)} {toToken}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Price Impact</span>
              <span className="text-green-600">{priceImpact}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Min. Received</span>
              <span>
                {(parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toFixed(6)} {toToken}
              </span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={!isConnected || isLoading || !fromAmount}
          className="w-full"
        >
          {isLoading ? 'Swapping...' :
           !isConnected ? 'Connect Wallet' :
           !fromAmount ? 'Enter Amount' :
           'Swap'}
        </Button>
      </div>

      {/* Trading Pairs Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-sm mb-2">Available Trading Pairs</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>WETH/USDC</span>
            <span className="font-mono text-xs">{TRADING_PAIRS['WETH/USDC'].slice(0, 10)}...</span>
          </div>
          <div className="flex justify-between">
            <span>WETH/USDT</span>
            <span className="font-mono text-xs">{TRADING_PAIRS['WETH/USDT'].slice(0, 10)}...</span>
          </div>
          <div className="flex justify-between">
            <span>USDC/USDT</span>
            <span className="font-mono text-xs">{TRADING_PAIRS['USDC/USDT'].slice(0, 10)}...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to encode function data (simplified version)
function encodeFunctionData({ abi, functionName, args }: any) {
  // This would use viem's encodeFunctionData in a real implementation
  // For now, return a placeholder
  return '0x';
}