'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFrenPet } from '@/hooks/useFrenPet';
import { useContractEvents } from '@/hooks/useContractEvents';
import { toast } from 'react-toastify';

interface PetData {
  name: string;
  level: number;
  experience: number;
  happiness: number;
  hunger: number;
  isAlive: boolean;
  winStreak: number;
}

export default function FrenPetPage() {
  const { address, isConnected } = useAccount();
  const [petName, setPetName] = useState('');
  const [myPet, setMyPet] = useState<PetData | null>(null);
  const [opponentAddress, setOpponentAddress] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  const {
    createPet,
    feedPet,
    playWithPet,
    initiateBattle,
    getPetStats,
    hasPet
  } = useFrenPet();
  
  const { events } = useContractEvents('FrenPet');
  
  // Load pet data
  const loadPetData = useCallback(async () => {
    if (!address) return;
    
    const hasExistingPet = await hasPet(address);
    if (hasExistingPet) {
      const stats = await getPetStats(address);
      if (stats && Array.isArray(stats) && stats.length >= 7) {
        setMyPet({
          name: String(stats[0]),
          level: Number(stats[1]),
          experience: Number(stats[2]),
          happiness: Number(stats[3]),
          hunger: Number(stats[4]),
          isAlive: Boolean(stats[5]),
          winStreak: Number(stats[6])
        });
      }
    }
  }, [address, hasPet, getPetStats]);
  
  useEffect(() => {
    loadPetData();
  }, [address, refreshKey, loadPetData]);
  
  // Handle events
  useEffect(() => {
    const latestEvent = events[events.length - 1];
    if (latestEvent) {
      if (latestEvent.eventName === 'PetCreated' && latestEvent.args?.owner === address) {
        toast.success('Pet created successfully!');
        setRefreshKey(prev => prev + 1);
      } else if (latestEvent.eventName === 'BattleResult' && latestEvent.args) {
        const winner = latestEvent.args.winner;
        const loser = latestEvent.args.loser;
        
        if (winner === address) {
          toast.success('You won the battle! 🎉');
        } else if (loser === address) {
          toast.info('You lost the battle. Better luck next time!');
        }
        setRefreshKey(prev => prev + 1);
      } else if (latestEvent.eventName === 'PetLevelUp' && latestEvent.args?.owner === address) {
        toast.success(`Level up! Your pet is now level ${latestEvent.args?.newLevel}`);
        setRefreshKey(prev => prev + 1);
      } else if (latestEvent.eventName === 'PetFed' && latestEvent.args?.owner === address) {
        console.log('PetFed event received:', latestEvent);
        toast.success('Pet fed successfully! 🍖');
        setRefreshKey(prev => prev + 1);
      } else if (latestEvent.eventName === 'PetPlayed' && latestEvent.args?.owner === address) {
        console.log('PetPlayed event received:', latestEvent);
        toast.success('Your pet is happy! 🎮');
        setRefreshKey(prev => prev + 1);
      }
    }
  }, [events, address]);
  
  const handleCreatePet = async () => {
    try {
      console.log('Creating pet with name:', petName);
      const result = await createPet(petName);
      console.log('Create pet result:', result);
      setPetName('');
      toast.success('Pet creation transaction sent!');
    } catch (error) {
      console.error('Failed to create pet:', error);
      toast.error('Failed to create pet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleFeedPet = async () => {
    try {
      console.log('🍖 Feeding pet...');
      await feedPet();
      toast.success('Your pet has been fed!');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to feed pet:', error);
      toast.error('Failed to feed pet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handlePlayWithPet = async () => {
    try {
      console.log('🎮 Playing with pet...');
      await playWithPet();
      toast.success('Your pet is happy!');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to play with pet:', error);
      toast.error('Failed to play with pet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleBattle = async () => {
    try {
      await initiateBattle(opponentAddress);
      toast.info('Battle initiated! Waiting for result...');
      setOpponentAddress('');
    } catch {
      toast.error('Failed to initiate battle');
    }
  };
  
  const getPetEmoji = () => {
    if (!myPet || !myPet.isAlive) return '💀';
    if (myPet.happiness > 70 && myPet.hunger < 30) return '😊';
    if (myPet.happiness > 50) return '😐';
    if (myPet.hunger > 70) return '😢';
    return '😔';
  };
  
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p>Please connect your wallet to play FrenPet</p>
        </Card>
      </div>
    );
  }
  
  if (!myPet) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-4">Create Your FrenPet</h2>
          <div className="space-y-4">
            <Input
              placeholder="Pet Name"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
            />
            <Button onClick={handleCreatePet} className="w-full">
              Create Pet 🥚
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-4xl font-bold text-center mb-8">FrenPet</h1>
      
      {/* Pet Display */}
      <Card className="p-8 mb-6">
        <div className="text-center mb-6">
          <div className="text-8xl mb-4">{getPetEmoji()}</div>
          <h2 className="text-2xl font-bold">{myPet.name}</h2>
          <Badge className="mt-2">Level {myPet.level}</Badge>
        </div>
        
        {/* Stats */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Happiness</span>
              <span>{myPet.happiness}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full"
                style={{ width: `${myPet.happiness}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Hunger</span>
              <span>{myPet.hunger}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-red-500 h-3 rounded-full"
                style={{ width: `${myPet.hunger}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Experience</span>
              <span>{myPet.experience}/{myPet.level * 100}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full"
                style={{ width: `${(myPet.experience / (myPet.level * 100)) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="text-center">
            <Badge variant="outline">Win Streak: {myPet.winStreak}</Badge>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Button onClick={handleFeedPet} disabled={!myPet.isAlive}>
            Feed Pet 🍎 (0.001 ETH)
          </Button>
          <Button onClick={handlePlayWithPet} disabled={!myPet.isAlive}>
            Play 🎾 (0.0005 ETH)
          </Button>
        </div>
        
        {!myPet.isAlive && (
          <div className="mt-4 text-center text-red-500">
            Your pet has passed away. Create a new pet to continue playing.
          </div>
        )}
      </Card>
      
      {/* Battle Section */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Battle Arena ⚔️</h3>
        <div className="space-y-4">
          <Input
            placeholder="Opponent Address (0x...)"
            value={opponentAddress}
            onChange={(e) => setOpponentAddress(e.target.value)}
          />
          <Button 
            onClick={handleBattle} 
            className="w-full"
            disabled={!myPet.isAlive || !opponentAddress}
          >
            Challenge to Battle 🥊 (0.002 ETH)
          </Button>
        </div>
      </Card>
      
      {/* Recent Events */}
      <Card className="p-6 mt-6">
        <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {events.slice(-5).reverse().map((event, idx) => (
            <div key={idx} className="text-sm">
              {event.eventName === 'PetCreated' && (
                <span>🥚 New pet created: {event.args?.name as string || 'Unknown'}</span>
              )}
              {event.eventName === 'BattleResult' && (
                <span>⚔️ Battle won by {(event.args?.winner as string || '').slice(0, 6)}...</span>
              )}
              {event.eventName === 'PetLevelUp' && (
                <span>⬆️ Pet leveled up to {event.args?.newLevel as string || 'Unknown'}</span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}