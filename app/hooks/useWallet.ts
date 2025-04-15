'use client';

import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { Transaction, SendOptions, Commitment, Connection } from '@solana/web3.js';

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
        
        // Test the connection to make sure it's working
        newConnection.getLatestBlockhash()
          .then(blockhash => {
            console.log('Connection test successful:', blockhash.blockhash.substring(0, 8) + '...');
          })
          .catch(error => {
            console.error('Connection test failed:', error);
            console.warn('Falling back to default connection due to test failure');
          });
        
        setConnection(newConnection);
        //console.log('Connection initialized without WebSockets:', rpcUrl);
      } catch (error) {
        console.error('Failed to initialize connection:', error);
      }
    }
  }, [originalConnection]);

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

  const signAndSendTransaction = async (transaction: Transaction, options?: SendOptions) => {
    if (!wallet || !publicKey) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const commitment: Commitment = 'confirmed';
      
      // Get the latest blockhash and set transaction parameters
      console.log('Getting latest blockhash...');
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      // Log transaction details for debugging
      console.log('Transaction details:', {
        numInstructions: transaction.instructions.length,
        feePayer: publicKey.toString(),
        requiredSigners: transaction.signatures
          .filter(s => s.signature === null)
          .map(s => s.publicKey.toString())
      });
      
      // Send the transaction
      console.log('Sending transaction...');
      const signature = await wallet.adapter.sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: commitment,
        maxRetries: 5,
        ...options,
      });
      
      console.log('Transaction sent with signature:', signature);
      
      // Wait for confirmation with a polling approach
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      
      while (attempts < maxAttempts && !confirmed) {
        try {
          const status = await connection.getSignatureStatus(signature);
          if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
            console.log('Transaction confirmed via polling');
            confirmed = true;
            break;
          }
          
          if (status.value?.err) {
            throw new Error(`Transaction failed: ${status.value.err.toString()}`);
          }
        } catch (pollError) {
          console.warn('Polling attempt failed:', pollError);
        }
        
        // Wait 1 second before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (!confirmed) {
        console.warn('Transaction confirmation timed out, but signature was returned');
      }
      
      return signature;
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  };

  const signTransaction = async (transaction: Transaction): Promise<Transaction> => {
    if (!wallet || !publicKey) {
      throw new Error('Wallet not connected');
    }
    
    try {
      if (walletAdapterSignTransaction) {
        console.log('Signing transaction with wallet:', wallet.adapter.name);
        
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
