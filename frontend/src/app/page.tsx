'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/providers/ThemeProvider';
import { ArrowRight, BookOpen, ExternalLink } from 'lucide-react';

export default function LandingPage() {
  const { theme } = useTheme();

  // Commented out as sections are currently hidden
  /*
  const features = [
    {
      icon: <Rocket className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Sub-second transactions with RISE's optimized blockchain"
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: "Developer Friendly",
      description: "Full-stack templates with TypeScript, React, and Solidity"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Real-time Updates",
      description: "WebSocket subscriptions for instant blockchain events"
    }
  ];

  const exampleApps = [
    {
      href: '/chat',
      icon: <MessageCircle className="w-8 h-8" />,
      title: 'Chat App',
      description: 'Real-time messaging with on-chain history and karma system',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      href: '/pump',
      icon: <Rocket className="w-8 h-8" />,
      title: 'Token Launchpad',
      description: 'Launch and trade tokens with bonding curve mechanics',
      color: 'from-purple-500 to-pink-500'
    },
    {
      href: '/frenpet',
      icon: <PawPrint className="w-8 h-8" />,
      title: 'FrenPet',
      description: 'Collect and care for virtual pets on the blockchain',
      color: 'from-orange-500 to-red-500'
    }
  ];
  */

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/5 dark:to-pink-500/5" />
        <div className="container mx-auto px-4 py-24 relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo and Vibe Kit branding */}
            <div className="mb-8 space-y-2">
              <div>
                {theme === 'dark' ? (
                  <div className="inline-block">
                    <Image 
                      src="/images/rise-logo-light.png" 
                      alt="RISE" 
                      width={300} 
                      height={90}
                      className="h-20 md:h-24 w-auto"
                      priority
                    />
                  </div>
                ) : (
                  <div className="inline-block">
                    <Image 
                      src="/images/rise-logo-black.png" 
                      alt="RISE" 
                      width={300} 
                      height={90}
                      className="h-20 md:h-24 w-auto"
                      priority
                    />
                  </div>
                )}
              </div>
              <div className="text-xl md:text-2xl tracking-widest uppercase text-gray-600 dark:text-gray-400 font-light">
                vibe kit
              </div>
            </div>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              A full stack template for building, low latency apps with{' '}
              <Link 
                href="https://blog.risechain.com/enabling-the-fastest-transactions-with-shreds/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
              >
                shreds
              </Link>{' '}
              on RISE.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="https://docs.risechain.com" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="w-full sm:w-auto">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Documentation
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="https://github.com/risechain/rise-vibe-kit" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                  View on GitHub
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      
      {/* Features Section 
      
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why RISE Vibe Kit?</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Example Apps Section *
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Example Applications</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Explore our pre-built templates to jumpstart your development
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {exampleApps.map((app, index) => (
              <Link key={index} href={app.href}>
                <Card className="p-6 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer h-full">
                  <div className={`w-16 h-16 bg-gradient-to-br ${app.color} rounded-lg flex items-center justify-center text-white mb-4`}>
                    {app.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{app.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{app.description}</p>
                  <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium">
                    Try it out <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
      */}


      {/* Quick Start Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Get Started in Seconds</h2>
            
            <Card className="p-6 bg-gray-900 dark:bg-gray-800 text-white">
              <code className="text-lg">
                npx create-rise-app@latest my-app
              </code>
            </Card>
            
            <p className="mt-6 text-gray-600 dark:text-gray-400">
              Create a new RISE application with a single command. 
              Choose from our templates or start fresh.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="https://docs.risechain.xyz/quickstart" target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  Quick Start Guide
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="https://docs.risechain.xyz/templates" target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  View All Templates
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Resources</h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Developer Resources</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="https://docs.risechain.com" target="_blank" rel="noopener noreferrer" 
                    className="flex items-center text-purple-600 dark:text-purple-400 hover:underline">
                    Documentation <ExternalLink className="w-4 h-4 ml-1" />
                  </Link>
                </li>
                <li>
                  <Link href="https://github.com/risechain" target="_blank" rel="noopener noreferrer"
                    className="flex items-center text-purple-600 dark:text-purple-400 hover:underline">
                    GitHub Organization <ExternalLink className="w-4 h-4 ml-1" />
                  </Link>
                </li>
                <li>
                  <Link href="https://www.npmjs.com/package/shreds" target="_blank" rel="noopener noreferrer"
                    className="flex items-center text-purple-600 dark:text-purple-400 hover:underline">
                    Shred API <ExternalLink className="w-4 h-4 ml-1" />
                  </Link>
                </li>
              </ul>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Community</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="https://discord.gg/risechain" target="_blank" rel="noopener noreferrer"
                    className="flex items-center text-purple-600 dark:text-purple-400 hover:underline">
                    Discord Community <ExternalLink className="w-4 h-4 ml-1" />
                  </Link>
                </li>
                <li>
                  <Link href="https://x.com/rise_chain" target="_blank" rel="noopener noreferrer"
                    className="flex items-center text-purple-600 dark:text-purple-400 hover:underline">
                    X Updates <ExternalLink className="w-4 h-4 ml-1" />
                  </Link>
                </li>
                <li>
                  <Link href="https://blog.risechain.com" target="_blank" rel="noopener noreferrer"
                    className="flex items-center text-purple-600 dark:text-purple-400 hover:underline">
                    Blog <ExternalLink className="w-4 h-4 ml-1" />
                  </Link>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}