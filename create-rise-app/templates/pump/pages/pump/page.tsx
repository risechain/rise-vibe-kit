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
import { Rocket, DollarSign } from 'lucide-react';

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
  const [showPreview, setShowPreview] = useState(false);
  const [imageValid, setImageValid] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const validateImage = (url: string) => {
    if (!url) {
      setImageValid(false);
      setShowPreview(false);
      return;
    }

    // Check if URL ends with common image extensions
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    if (!imageExtensions.test(url)) {
      // Still try to load it as some URLs don't have extensions
      setImageLoading(true);
    } else {
      setImageLoading(true);
    }

    // Test load the image
    const img = new window.Image();
    img.onload = () => {
      setImageValid(true);
      setImageLoading(false);
    };
    img.onerror = () => {
      setImageValid(false);
      setImageLoading(false);
    };
    img.src = url;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLaunch(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://example.com/token-image.png"
                value={formData.imageUrl}
                onChange={(e) => {
                  const url = e.target.value;
                  setFormData({ ...formData, imageUrl: url });
                  validateImage(url);
                }}
              />
              {formData.imageUrl && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    disabled={imageLoading}
                  >
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                  {imageLoading && <span className="text-sm text-gray-500">Loading...</span>}
                  {!imageLoading && !imageValid && formData.imageUrl && (
                    <span className="text-sm text-red-500">Invalid image URL</span>
                  )}
                </div>
              )}
              {showPreview && imageValid && (
                <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <Image 
                    src={formData.imageUrl} 
                    alt="Token preview" 
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </div>
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
  const [tradeAmounts, setTradeAmounts] = useState<Record<string, string>>({});
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
      console.log('Launching token with data:', formData);
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
      const amount = tradeAmounts[tokenAddress] || '0';
      console.log('Buying token:', tokenAddress, 'with amount:', amount, 'ETH');
      await buyToken(tokenAddress, parseEther(amount));
      toast.success('Purchase successful!');
      setTradeAmounts(prev => ({ ...prev, [tokenAddress]: '' }));
      void loadActiveTokens();
    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error('Purchase failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleSell = async (tokenAddress: string) => {
    try {
      const amount = tradeAmounts[tokenAddress] || '0';
      await sellToken(tokenAddress, parseEther(amount));
      toast.success('Sale successful!');
      setTradeAmounts(prev => ({ ...prev, [tokenAddress]: '' }));
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
        <Button onClick={() => setShowLaunchModal(true)} className="flex items-center gap-2">
          Launch Token <Rocket className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Live Activity Feed */}
      <Card className="mb-8 p-4">
        <h2 className="text-xl font-semibold mb-4">Live Activity</h2>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {events.slice(-10).reverse().map((event, idx) => (
            <div key={`event-${event.transactionHash}-${event.logIndex || idx}`} className="text-sm">
              {event.eventName === 'TokenLaunched' && (
                <span className="flex items-center gap-1">
                  <Rocket className="w-3 h-3 inline" /> 
                  <b>{event.args?.name as string || 'Unknown'}</b> launched!
                </span>
              )}
              {event.eventName === 'TokenTraded' && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 inline" />
                  {event.args?.isBuy ? 'Buy' : 'Sell'}: {formatEther(event.args?.tokenAmount ? BigInt(event.args.tokenAmount.toString()) : 0n)} {
                    // Find token name from activeTokens
                    activeTokens.find(t => t.tokenAddress.toLowerCase() === (event.args?.token as string || '').toLowerCase())?.symbol || 'tokens'
                  } for {formatEther(event.args?.ethAmount ? BigInt(event.args.ethAmount.toString()) : 0n)} ETH
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
      
      {/* Token Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTokens.map((token) => (
          <Card 
            key={token.tokenAddress} 
            className="relative overflow-hidden hover:shadow-lg transition-shadow"
            style={{
              backgroundImage: token.imageUrl ? `url(${token.imageUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Overlay for readability */}
            <div className={`absolute inset-0 ${token.imageUrl ? 'bg-black/70 backdrop-blur-sm' : ''}`} />
            
            {/* Content */}
            <div className="relative z-10 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{token.name}</h3>
                  <p className="text-sm text-gray-300">${token.symbol}</p>
                </div>
                {!token.imageUrl && (
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{token.symbol.charAt(0)}</span>
                  </div>
                )}
              </div>
              
              <p className="text-sm mb-4 text-gray-200">{token.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-200">
                  <span>Price:</span>
                  <span className="font-medium">{formatEther(token.currentPrice ? BigInt(token.currentPrice.toString()) : 0n)} ETH</span>
                </div>
                <div className="flex justify-between text-sm text-gray-200">
                  <span>Market Cap:</span>
                  <span className="font-medium">{formatEther(token.totalRaised ? BigInt(token.totalRaised.toString()) : 0n)} ETH</span>
                </div>
                <div className="flex justify-between text-sm text-gray-200">
                  <span>Progress:</span>
                  <span className="font-medium">{token.totalRaised && token.targetRaise ? ((Number(token.totalRaised) / Number(token.targetRaise)) * 100).toFixed(1) : '0.0'}%</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-600 rounded-full h-2 mb-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (Number(token.totalRaised) / Number(token.targetRaise)) * 100)}%` }}
                />
              </div>
              
              {/* Trade Interface */}
              <div className="space-y-3">
                {/* Balance Display */}
                {address && balance && (
                  <div className="text-xs text-gray-300">
                    Balance: {formatEther(balance.value)} ETH
                  </div>
                )}
              
              {/* Amount Input */}
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Amount in ETH"
                  value={tradeAmounts[token.tokenAddress] || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || parseFloat(value) >= 0) {
                      setTradeAmounts(prev => ({ ...prev, [token.tokenAddress]: value }));
                    }
                  }}
                  min="0"
                  step="0.001"
                  className="w-full"
                />
              </div>
              
              {/* Trade Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleBuy(token.tokenAddress)}
                  className="bg-green-500 hover:bg-green-600"
                  disabled={!tradeAmounts[token.tokenAddress] || parseFloat(tradeAmounts[token.tokenAddress]) <= 0}
                >
                  Buy
                </Button>
                <Button 
                  onClick={() => handleSell(token.tokenAddress)}
                  className="bg-red-500 hover:bg-red-600"
                  disabled={!tradeAmounts[token.tokenAddress] || parseFloat(tradeAmounts[token.tokenAddress]) <= 0}
                >
                  Sell
                </Button>
              </div>
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