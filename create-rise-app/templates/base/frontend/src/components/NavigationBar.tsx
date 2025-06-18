'use client';

import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { WalletSelector } from '@/components/WalletSelector';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

export function NavigationBar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const exampleApps = [
    { href: '/', label: 'Chat', icon: '💬' },
    { href: '/pump', label: 'Pump', icon: '🚀' },
    { href: '/frenpet', label: 'FrenPet', icon: '🐾' },
    { href: '/perps', label: 'Perps', icon: '📊' },
  ];

  const isExampleApp = exampleApps.some(app => app.href === pathname);
  const currentApp = exampleApps.find(app => app.href === pathname);

  return (
    <nav className="border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="text-2xl font-bold gradient-text">
                RISE Chat
              </div>
              <span className="text-2xl"></span>
            </Link>
            
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              {/* Example Apps Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                      isExampleApp
                        ? 'text-purple-600 dark:text-purple-400' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                    }`}
                  >
                    {currentApp ? (
                      <>
                        <span>{currentApp.icon}</span>
                        <span>{currentApp.label}</span>
                      </>
                    ) : (
                      'Example Apps'
                    )}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  {exampleApps.map((app) => (
                    <DropdownMenuItem key={app.href} asChild>
                      <Link 
                        href={app.href}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span>{app.icon}</span>
                        <span>{app.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

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
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-9 h-9"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                  />
                </svg>
              )}
            </Button>
            
            {/* Wallet Selector */}
            <WalletSelector />
          </div>
        </div>
      </div>
    </nav>
  );
}