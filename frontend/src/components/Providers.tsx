'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from '@/lib/toast-manager';
import { wagmiConfig } from '@/lib/wagmi-config';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
import 'react-toastify/dist/ReactToastify.css';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          {children}
          <ToastContainer 
            position="bottom-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            className="toast-container"
          />
        </WebSocketProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}