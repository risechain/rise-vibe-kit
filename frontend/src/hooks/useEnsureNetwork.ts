import { useAccount, useSwitchChain } from 'wagmi';
import { useCallback } from 'react';
import { riseTestnet } from '@/lib/wagmi-config';

export function useEnsureNetwork() {
  const { chain, connector } = useAccount();
  const { switchChain } = useSwitchChain();

  const ensureCorrectNetwork = useCallback(async () => {
    // If using embedded wallet, it's always on the right network
    if (connector?.id === 'embedded-wallet') {
      return true;
    }

    // Check if we're on the right network
    if (chain?.id === riseTestnet.id) {
      return true;
    }

    // For MetaMask, check the actual network
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const chainIdHex = await (window as any).ethereum.request({ 
          method: 'eth_chainId' 
        });
        const currentChainId = parseInt(chainIdHex, 16);
        
        console.log('Current MetaMask chain ID:', currentChainId);
        console.log('Expected chain ID:', riseTestnet.id);

        if (currentChainId !== riseTestnet.id) {
          // Try to switch network
          try {
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xaa6c7b' }], // 11155931 in hex
            });
            return true;
          } catch (switchError: any) {
            // If chain doesn't exist, add it
            if (switchError.code === 4902) {
              try {
                await (window as any).ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0xaa6c7b',
                    chainName: 'RISE Testnet',
                    nativeCurrency: {
                      name: 'Ether',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: ['https://testnet.riselabs.xyz'],
                    blockExplorerUrls: ['https://explorer.testnet.riselabs.xyz'],
                  }],
                });
                return true;
              } catch (addError) {
                console.error('Failed to add network:', addError);
                throw new Error('Please add RISE Testnet to MetaMask manually');
              }
            } else {
              console.error('Failed to switch network:', switchError);
              throw new Error('Please switch to RISE Testnet in MetaMask');
            }
          }
        }
        return true;
      } catch (error) {
        console.error('Network check error:', error);
        throw error;
      }
    }

    // Try using wagmi's switchChain as fallback
    if (switchChain) {
      try {
        await switchChain({ chainId: riseTestnet.id });
        return true;
      } catch (error) {
        console.error('Failed to switch chain with wagmi:', error);
        throw error;
      }
    }

    throw new Error('Unable to switch to RISE Testnet');
  }, [chain, connector, switchChain]);

  return { ensureCorrectNetwork };
}