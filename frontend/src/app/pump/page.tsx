'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useTokenLaunchpad } from '@/hooks/useTokenLaunchpad';
import { useContractEvents } from '@/hooks/useContractEvents';
import { toast } from 'react-toastify';

interface TokenInfo {
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  createdAt: bigint;
  totalRaised: bigint;
  targetRaise: bigint;
  isActive: boolean;
  currentPrice?: bigint;
}

interface LaunchModalProps {
  onClose: () => void;
  onLaunch: (data: { name: string; symbol: string; description: string; imageUrl: string }) => void;
}

function LaunchTokenModal({ onClose, onLaunch }: LaunchModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    imageUrl: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLaunch(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Launch New Token</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Token Name</label>
            <Input
              type="text"
              placeholder="My Awesome Token"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Symbol</label>
            <Input
              type="text"
              placeholder="AWESOME"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Describe your token..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Image URL (optional)</label>
            <Input
              type="url"
              placeholder="https://example.com/token-image.png"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Launch Token</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PumpPage() {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const [activeTokens, setActiveTokens] = useState<TokenInfo[]>([]);
  const [tradeAmount, setTradeAmount] = useState('0.01');
  const [tradePercentage, setTradePercentage] = useState(10);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  
  const {
    launchToken,
    buyToken,
    sellToken,
    getActiveTokens,
    getTokenInfo,
    getCurrentPrice
  } = useTokenLaunchpad();
  
  const { events } = useContractEvents('TokenLaunchpad');
  
  // Load active tokens
  const loadActiveTokens = useCallback(async () => {
    try {
      const tokens = await getActiveTokens();
      const tokenDetails = await Promise.all(
        tokens.map(async (addr) => {
          const info = await getTokenInfo(addr);
          const price = await getCurrentPrice(addr);
          // Ensure we have tokenAddress field
          return { 
            ...info, 
            tokenAddress: addr, // Explicitly set tokenAddress
            currentPrice: price 
          } as TokenInfo;
        })
      );
      setActiveTokens(tokenDetails);
    } catch (error) {
      console.error('Failed to load active tokens:', error);
      toast.error('Failed to load tokens');
    }
  }, [getActiveTokens, getTokenInfo, getCurrentPrice]);
  
  // Real-time event updates
  useEffect(() => {
    const latestEvent = events[events.length - 1];
    if (latestEvent) {
      if (latestEvent.eventName === 'TokenLaunched') {
        toast.success(`New token launched: ${latestEvent.args?.name}`);
        void loadActiveTokens();
      } else if (latestEvent.eventName === 'TokenTraded') {
        const action = latestEvent.args?.isBuy ? 'bought' : 'sold';
        toast.info(`Someone ${action} ${formatEther((latestEvent.args?.tokenAmount as bigint) || 0n)} tokens`);
        void loadActiveTokens();
      }
    }
  }, [events, loadActiveTokens]);
  
  useEffect(() => {
    void loadActiveTokens();
  }, [loadActiveTokens]);
  
  const handleLaunchToken = async (formData: { name: string; symbol: string; description: string; imageUrl: string }) => {
    try {
      console.log('🚀 Launching token with data:', formData);
      const result = await launchToken(
        formData.name,
        formData.symbol,
        formData.description,
        formData.imageUrl
      );
      console.log('✅ Token launch result:', result);
      toast.success('Token launched successfully!');
      setShowLaunchModal(false);
      void loadActiveTokens();
    } catch (error) {
      console.error('❌ Failed to launch token:', error);
      toast.error('Failed to launch token: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleBuy = async (tokenAddress: string) => {
    try {
      console.log('🛒 Buying token:', tokenAddress, 'with amount:', tradeAmount, 'ETH');
      await buyToken(tokenAddress, parseEther(tradeAmount));
      toast.success('Purchase successful!');
      setTradeAmount('');
      void loadActiveTokens();
    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error('Purchase failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleSell = async (tokenAddress: string, amount: string) => {
    try {
      await sellToken(tokenAddress, parseEther(amount));
      toast.success('Sale successful!');
      setTradeAmount('');
      void loadActiveTokens();
    } catch {
      toast.error('Sale failed');
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">pump.rise</h1>
        <Button onClick={() => setShowLaunchModal(true)}>
          Launch Token 🚀
        </Button>
      </div>
      
      {/* Live Activity Feed */}
      <Card className="mb-8 p-4">
        <h2 className="text-xl font-semibold mb-4">Live Activity</h2>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {events.slice(-10).reverse().map((event, idx) => (
            <div key={`event-${event.transactionHash}-${event.logIndex || idx}`} className="text-sm">
              {event.eventName === 'TokenLaunched' && (
                <span>🚀 <b>{event.args?.name as string || 'Unknown'}</b> launched!</span>
              )}
              {event.eventName === 'TokenTraded' && (
                <span>
                  💰 {event.args?.isBuy ? 'Buy' : 'Sell'}: {formatEther(event.args?.tokenAmount ? BigInt(event.args.tokenAmount.toString()) : 0n)} tokens
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
      
      {/* Token Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTokens.map((token) => (
          <Card key={token.tokenAddress} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">{token.name}</h3>
                <p className="text-sm text-gray-500">${token.symbol}</p>
              </div>
              {token.imageUrl && (
                <Image src={token.imageUrl} alt={token.name} width={48} height={48} className="rounded" />
              )}
            </div>
            
            <p className="text-sm mb-4">{token.description}</p>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Price:</span>
                <span>{formatEther(token.currentPrice ? BigInt(token.currentPrice.toString()) : 0n)} ETH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Market Cap:</span>
                <span>{formatEther(token.totalRaised ? BigInt(token.totalRaised.toString()) : 0n)} ETH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Progress:</span>
                <span>{token.totalRaised && token.targetRaise ? ((Number(token.totalRaised) / Number(token.targetRaise)) * 100).toFixed(1) : '0.0'}%</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                style={{ width: `${Math.min(100, (Number(token.totalRaised) / Number(token.targetRaise)) * 100)}%` }}
              />
            </div>
            
            {/* Trade Interface */}
            <div className="space-y-3">
              {/* Balance Display */}
              {address && balance && (
                <div className="text-xs text-gray-500">
                  Balance: {formatEther(balance.value)} ETH
                </div>
              )}
              
              {/* Amount Input with Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Input
                    type="number"
                    placeholder="Amount in ETH"
                    value={tradeAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || parseFloat(value) >= 0) {
                        setTradeAmount(value);
                        // Update percentage if we have balance
                        if (balance && parseFloat(value) > 0) {
                          const percentage = (parseFloat(value) / parseFloat(formatEther(balance.value))) * 100;
                          setTradePercentage(Math.min(100, Math.round(percentage)));
                        }
                      }
                    }}
                    min="0"
                    step="0.001"
                    className="w-full"
                  />
                </div>
                
                {/* Percentage Slider (only show if wallet connected) */}
                {address && balance && (
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tradePercentage}
                      onChange={(e) => {
                        const percentage = parseInt(e.target.value);
                        setTradePercentage(percentage);
                        // Calculate amount based on percentage
                        const amount = (parseFloat(formatEther(balance.value)) * percentage) / 100;
                        setTradeAmount(amount.toFixed(4));
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0%</span>
                      <span>{tradePercentage}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                )}
                
                {/* Quick percentage buttons */}
                {address && balance && (
                  <div className="flex gap-1">
                    {[10, 25, 50, 75, 100].map((percent) => (
                      <Button
                        key={percent}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTradePercentage(percent);
                          const amount = (parseFloat(formatEther(balance.value)) * percent) / 100;
                          setTradeAmount(amount.toFixed(4));
                        }}
                        className="flex-1 text-xs"
                      >
                        {percent}%
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Trade Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleBuy(token.tokenAddress)}
                  className="bg-green-500 hover:bg-green-600"
                  disabled={!tradeAmount || parseFloat(tradeAmount) <= 0}
                >
                  Buy
                </Button>
                <Button 
                  onClick={() => handleSell(token.tokenAddress, tradeAmount)}
                  className="bg-red-500 hover:bg-red-600"
                  disabled={!tradeAmount || parseFloat(tradeAmount) <= 0}
                >
                  Sell
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Launch Token Modal */}
      {showLaunchModal && (
        <LaunchTokenModal
          onClose={() => setShowLaunchModal(false)}
          onLaunch={handleLaunchToken}
        />
      )}
    </div>
  );
}