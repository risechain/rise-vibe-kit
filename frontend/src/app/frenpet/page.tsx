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
import { Skull, PawPrint, Apple, Gamepad2, Swords, ArrowUp, SmilePlus, Smile, Frown, Meh } from 'lucide-react';

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
  const [hasJustCreatedPet, setHasJustCreatedPet] = useState(false);
  
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
    if (!address || hasJustCreatedPet) return;
    
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
  }, [address, hasPet, getPetStats, hasJustCreatedPet]);
  
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
          toast.success('You won the battle!');
        } else if (loser === address) {
          toast.info('You lost the battle. Better luck next time!');
        }
        setRefreshKey(prev => prev + 1);
      } else if (latestEvent.eventName === 'PetLevelUp' && latestEvent.args?.owner === address) {
        toast.success(`Level up! Your pet is now level ${latestEvent.args?.newLevel}`);
        setRefreshKey(prev => prev + 1);
      } else if (latestEvent.eventName === 'PetFed' && latestEvent.args?.owner === address) {
        console.log('PetFed event received:', latestEvent);
        toast.success('Pet fed successfully!');
        setRefreshKey(prev => prev + 1);
      } else if (latestEvent.eventName === 'PetPlayed' && latestEvent.args?.owner === address) {
        console.log('PetPlayed event received:', latestEvent);
        toast.success('Your pet is happy!');
        setRefreshKey(prev => prev + 1);
      }
    }
  }, [events, address]);
  
  const handleCreatePet = async () => {
    try {
      console.log('Creating pet with name:', petName);
      setHasJustCreatedPet(true);
      const result = await createPet(petName);
      console.log('Create pet result:', result);
      
      // Set pet data immediately from transaction result
      if (result) {
        setMyPet({
          name: petName,
          level: 1,
          experience: 0,
          happiness: 50,
          hunger: 50,
          isAlive: true,
          winStreak: 0
        });
      }
      
      setPetName('');
      toast.success('Pet created successfully!');
      
      // Reset flag after a delay
      setTimeout(() => {
        setHasJustCreatedPet(false);
      }, 5000);
    } catch (error) {
      console.error('Failed to create pet:', error);
      setHasJustCreatedPet(false);
      toast.error('Failed to create pet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleFeedPet = async () => {
    try {
      console.log('Feeding pet...');
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
      console.log('Playing with pet...');
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
  
  const getPetIcon = () => {
    if (!myPet || !myPet.isAlive) return { Icon: Skull, className: 'text-gray-500' };
    if (myPet.happiness > 70 && myPet.hunger < 30) return { Icon: SmilePlus, className: 'text-green-500' };
    if (myPet.happiness > 50) return { Icon: Smile, className: 'text-yellow-500' };
    if (myPet.hunger > 70) return { Icon: Frown, className: 'text-red-500' };
    return { Icon: Meh, className: 'text-orange-500' };
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
  
  // Show create pet interface if no pet or pet is dead
  if (!myPet || !myPet.isAlive) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-4">
            {myPet && !myPet.isAlive ? 'Create a New FrenPet' : 'Create Your FrenPet'}
          </h2>
          {myPet && !myPet.isAlive && (
            <div className="mb-6 text-center">
              <Skull className="w-16 h-16 mb-2 text-gray-500 mx-auto" />
              <p className="text-gray-500">Your pet {myPet.name} has passed away.</p>
              <p className="text-sm text-gray-400">Create a new pet to continue playing.</p>
            </div>
          )}
          <div className="space-y-4">
            <Input
              placeholder="Pet Name"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
            />
            <Button onClick={handleCreatePet} className="w-full flex items-center justify-center gap-2">
              Create Pet <PawPrint className="w-4 h-4" />
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
          <div className="mb-4 flex justify-center">
            {(() => {
              const { Icon, className } = getPetIcon();
              return <Icon className={`w-24 h-24 ${className}`} />;
            })()}
          </div>
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
          <Button onClick={handleFeedPet} className="flex items-center justify-center gap-2">
            <Apple className="w-4 h-4" /> Feed Pet (0.001 ETH)
          </Button>
          <Button onClick={handlePlayWithPet} className="flex items-center justify-center gap-2">
            <Gamepad2 className="w-4 h-4" /> Play (0.0005 ETH)
          </Button>
        </div>
      </Card>
      
      {/* Battle Section */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          Battle Arena <Swords className="w-5 h-5" />
        </h3>
        <div className="space-y-4">
          <Input
            placeholder="Opponent Address (0x...)"
            value={opponentAddress}
            onChange={(e) => setOpponentAddress(e.target.value)}
          />
          <Button 
            onClick={handleBattle} 
            className="w-full"
            disabled={!opponentAddress}
          >
            <span className="flex items-center justify-center gap-2">
              Challenge to Battle <Swords className="w-4 h-4" /> (0.002 ETH)
            </span>
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
                <span className="flex items-center gap-1">
                  <PawPrint className="w-3 h-3 inline" /> New pet created: {event.args?.name as string || 'Unknown'}
                </span>
              )}
              {event.eventName === 'BattleResult' && (
                <span className="flex items-center gap-1">
                  <Swords className="w-3 h-3 inline" /> Battle won by {(event.args?.winner as string || '').slice(0, 6)}...
                </span>
              )}
              {event.eventName === 'PetLevelUp' && (
                <span className="flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 inline" /> Pet leveled up to {event.args?.newLevel as string || 'Unknown'}
                </span>
              )}
              {event.eventName === 'PetFed' && (
                <span className="flex items-center gap-1">
                  <Apple className="w-3 h-3 inline" /> {(event.args?.owner as string || '').slice(0, 6)}... fed their pet
                </span>
              )}
              {event.eventName === 'PetPlayed' && (
                <span className="flex items-center gap-1">
                  <Gamepad2 className="w-3 h-3 inline" /> {(event.args?.owner as string || '').slice(0, 6)}... played with their pet
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}