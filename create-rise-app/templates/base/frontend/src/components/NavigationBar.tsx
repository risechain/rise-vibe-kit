'use client';

import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { WalletSelector } from '@/components/WalletSelector';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';

export function NavigationBar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="text-2xl font-bold gradient-text">
                RISE App
              </div>
            </Link>
            
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/debug"
                className={`text-sm font-medium transition-colors ${
                  pathname === '/debug' 
                    ? 'text-purple-600 dark:text-purple-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                Debug
              </Link>
              <Link 
                href="/events"
                className={`text-sm font-medium transition-colors ${
                  pathname === '/events' 
                    ? 'text-purple-600 dark:text-purple-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                Events
              </Link>
            </nav>
          </div>

          {/* Right side items */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-gray-700 dark:text-gray-300"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <WalletSelector />
          </div>
        </div>
      </div>
    </nav>
  );
}