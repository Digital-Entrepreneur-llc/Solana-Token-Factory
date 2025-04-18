'use client';

import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
  SendOptions,
} from '@solana/web3.js';
import { PhantomProvider, PhantomWindow } from '@/app/types/phantom.d';

type DeviceType = 'desktop' | 'mobile' | 'tablet';

// Add enhanced error handling
const wrapPromiseWithErrorHandling = async <T,>(
  promise: Promise<T>,
  errorContext: string
): Promise<T> => {
  try {
    return await promise;
  } catch (error) {
    console.error(`${errorContext} error:`, error);
    throw error;
  }
};

export const useWallet = () => {
  const {
    publicKey,
    connecting,
    connected,
    disconnect,
    wallet,
    select,
    signTransaction: walletAdapterSignTransaction,
    wallets,
  } = useSolanaWallet();

  // Create a connection that doesn't use WebSockets by default
  const { connection: originalConnection } = useConnection();
  const [connection, setConnection] = useState(originalConnection);
  
  // Initialize connection without WebSockets
  useEffect(() => {
    if (typeof window !== 'undefined' && originalConnection) {
      // Create a connection that doesn't use WebSockets
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
      //console.log('Using RPC endpoint:', rpcUrl);
      
      try {
        // Create a more reliable connection with better configs
        const newConnection = new Connection(rpcUrl, {
          commitment: 'confirmed',
          wsEndpoint: undefined, // Disable WebSocket
          confirmTransactionInitialTimeout: 180000, // 3 minutes
          disableRetryOnRateLimit: false, // Enable retries on rate limit
          httpHeaders: {
            'Content-Type': 'application/json',
          }
        });
        
        // Only set the connection once to avoid infinite re-rendering
        setConnection(prevConnection => {
          // Only update if it's actually different to prevent re-renders
          if (prevConnection?.rpcEndpoint !== newConnection.rpcEndpoint) {
            return newConnection;
          }
          return prevConnection;
        });
        
        // Test the connection separately to avoid render loops
        newConnection.getLatestBlockhash()
          .then(blockhash => {
            console.log('Connection test successful:', blockhash.blockhash.substring(0, 8) + '...');
          })
          .catch(error => {
            console.error('Connection test failed:', error);
            console.warn('Falling back to default connection due to test failure');
          });
        
        //console.log('Connection initialized without WebSockets:', rpcUrl);
      } catch (error) {
        console.error('Failed to initialize connection:', error);
      }
    }
  }, [originalConnection]); // Keep originalConnection as the only dependency

  const { setVisible } = useWalletModal();
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [walletError, setWalletError] = useState<Error | null>(null);

  // Reset error state when wallet changes
  useEffect(() => {
    setWalletError(null);
  }, [wallet, connected]);

  // Determine device type for better UI handling
  useEffect(() => {
    const detectDeviceType = () => {
      const width = window.innerWidth;
      
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        window.navigator.userAgent
      )) {
        if (width >= 768) {
          setDeviceType('tablet');
        } else {
          setDeviceType('mobile');
        }
      } else {
        setDeviceType('desktop');
      }
    };

    detectDeviceType();
    window.addEventListener('resize', detectDeviceType);
    return () => window.removeEventListener('resize', detectDeviceType);
  }, []);

  const isMobile = useMemo(() => {
    return deviceType === 'mobile';
  }, [deviceType]);

  const isTablet = useMemo(() => {
    return deviceType === 'tablet';
  }, [deviceType]);

  // Log all available wallets without prioritizing any specific one
  useEffect(() => {
    if ((isMobile || isTablet) && !connected && !connecting && !wallet) {
      if (wallets.length > 0) {
        console.log(`Found ${wallets.length} wallet(s) on ${deviceType}:`, 
          wallets.map(w => w.adapter.name).join(', '));
          
        // Check if any were already selected
        const selectedWallet = wallets.find(w => w.adapter.connected);
        if (selectedWallet) {
          console.log(`Wallet already connected: ${selectedWallet.adapter.name}`);
        }
      } else {
        console.log(`No wallets found on ${deviceType}`);
      }
    }
  }, [isMobile, isTablet, connected, connecting, wallet, wallets, deviceType]);

  const connectWallet = useCallback(() => {
    try {
      setWalletError(null);
      
      if (!wallet) {
        // Show wallet selection modal without prioritizing any specific wallet
        console.log('Opening wallet selection modal');
        setVisible(true);
      } else {
        // If wallet is already selected but not connected, try connecting
        if (!connected && !connecting) {
          select(wallet.adapter.name);
        }
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setWalletError(error instanceof Error ? error : new Error('Unknown wallet connection error'));
    }
  }, [wallet, setVisible, select, connected, connecting]);

  const signTransaction = async (transaction: Transaction): Promise<Transaction> => {
    if (!wallet || !publicKey) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Check wallet type to determine the right approach
      const walletName = wallet.adapter.name;
      console.log(`Signing transaction with wallet: ${walletName}`);
      
      // For Phantom wallet, we might want to use the injected provider
      const isPhantomWallet = walletName === 'Phantom';
      const isSolflareWallet = walletName === 'Solflare';
      
      if (isPhantomWallet) {
        // Use Phantom's injected provider
        const phantomWindow = window as unknown as PhantomWindow;
        const provider = phantomWindow.solana;
        if (provider && provider.isPhantom) {
          console.log('Using Phantom injected provider for signing');
          const signedTx = await provider.signTransaction(transaction);
          // Ensure we're returning the right type
          return signedTx as Transaction;
        }
      } else if (isSolflareWallet) {
        // Use Solflare's injected provider
        const solflareWindow = window as unknown as PhantomWindow;
        const provider = solflareWindow.solflare;
        if (provider) {
          console.log('Using Solflare injected provider for signing');
          const signedTx = await provider.signTransaction(transaction);
          // Ensure we're returning the right type
          return signedTx as Transaction;
        }
      }
      
      // Fallback to wallet-adapter method
      if (walletAdapterSignTransaction) {
        console.log('Using wallet adapter for signing');
        return await wrapPromiseWithErrorHandling(
          walletAdapterSignTransaction(transaction),
          'Transaction signing'
        );
      }
      
      throw new Error('Wallet does not support signTransaction');
    } catch (error) {
      console.error('Signing error:', error);
      throw error;
    }
  };

  const signAndSendTransaction = async (transaction: Transaction, options?: SendOptions) => {
    if (!wallet || !publicKey) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const walletName = wallet.adapter.name;
      console.log(`Using wallet: ${walletName}`);
      
      let signature: string;
      const isPhantomWallet = walletName === 'Phantom';
      const isSolflareWallet = walletName === 'Solflare';
      
      if (isPhantomWallet) {
        // Use Phantom's injected provider directly - per Phantom docs
        const phantomWindow = window as unknown as PhantomWindow;
        const provider = phantomWindow.phantom?.solana;
        if (provider && provider.isPhantom) {
          console.log('Using Phantom injected provider');
          try {
            // Following Phantom docs: provider.signAndSendTransaction returns { signature, publicKey }
            const response = await provider.signAndSendTransaction(transaction, options);
            signature = response.signature;
            console.log('Phantom transaction response:', response);
          } catch (err) {
            console.error('Detailed Phantom error:', err);
            throw err; // Preserve the original error and stack trace
          }
        } else {
          // Fallback to wallet adapter
          console.log('Phantom provider not detected, using adapter');
          signature = await wallet.adapter.sendTransaction(transaction, connection, options);
        }
      } else if (isSolflareWallet) {
        // Use Solflare's injected provider directly
        const solflareWindow = window as unknown as PhantomWindow;
        const provider = solflareWindow.solflare;
        if (provider) {
          console.log('Using Solflare injected provider');
          // Similar to Phantom: provider.signAndSendTransaction returns { signature, publicKey }
          const response = await provider.signAndSendTransaction(transaction, options);
          signature = response.signature;
          console.log('Solflare transaction response:', response);
        } else {
          // Fallback to wallet adapter
          console.log('Solflare provider not detected, using adapter');
          signature = await wallet.adapter.sendTransaction(transaction, connection, options);
        }
      } else {
        // Use standard wallet adapter for other wallets
        console.log('Using standard wallet adapter');
        signature = await wallet.adapter.sendTransaction(transaction, connection, options);
      }
      
      console.log(`Transaction sent with signature: ${signature}`);
      return signature;
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  };

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey]);

  const walletAddress = useMemo(() => {
    if (!base58) return '';
    
    // Use shorter address for very small screens
    if (isMobile) {
      return `${base58.slice(0, 3)}...${base58.slice(-3)}`;
    }
    
    return `${base58.slice(0, 4)}...${base58.slice(-4)}`;
  }, [base58, isMobile]);

  return {
    connectWallet,
    disconnectWallet: disconnect,
    walletAddress,
    connecting,
    connected,
    publicKey,
    wallet,
    signAndSendTransaction,
    signTransaction,
    connection,
    deviceType,
    isMobile,
    isTablet,
    walletError,
  };
};
