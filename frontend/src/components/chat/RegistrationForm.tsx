'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface RegistrationFormProps {
  onRegister: (username: string) => Promise<void>;
  isLoading?: boolean;
}

export function RegistrationForm({ onRegister, isLoading = false }: RegistrationFormProps) {
  const [username, setUsername] = useState('');
  
  const handleSubmit = async () => {
    if (!username.trim()) return;
    await onRegister(username);
  };

  return (
    <Card className="max-w-md mx-auto p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Choose Your Username</h2>
      <div className="space-y-4">
        <Input
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={isLoading}
        />
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || !username.trim()}
          className="w-full"
        >
          {isLoading ? 'Registering...' : 'Register'}
        </Button>
      </div>
    </Card>
  );
}