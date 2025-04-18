'use client';

import { Transaction, Connection, SendOptions } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

/**
 * Signs and sends a transaction using the appropriate wallet provider
 * @param wallet The wallet context from useWallet hook
 * @param transaction The transaction to sign and send
 * @param connection The Solana RPC connection
 * @param options Optional send options
 * @returns The transaction signature
 */
export async function signAndSendTransaction(
  wallet: WalletContextState,
  transaction: Transaction,
  connection: Connection,
  options?: SendOptions
): Promise<string> {
  if (!wallet.publicKey || !wallet.connected) {
    throw new Error('Wallet not connected');
  }

  try {
    const walletName = wallet.wallet?.adapter.name || 'Unknown';
    console.log(`Using wallet: ${walletName}`);
    
    let signature: string;
    const isPhantomWallet = walletName === 'Phantom';
    const isSolflareWallet = walletName === 'Solflare';
    
    if (isPhantomWallet) {
      // Use Phantom's injected provider
      const provider = (window as any).solana;
      if (provider && provider.isPhantom) {
        console.log('Using Phantom injected provider');
        // Provider returns { signature, publicKey }
        const response = await provider.signAndSendTransaction(transaction, options);
        signature = response.signature;
        console.log('Phantom transaction response:', response);
      } else {
        // Fallback to wallet adapter
        console.log('Phantom provider not detected, using adapter');
        signature = await wallet.sendTransaction(transaction, connection, options);
      }
    } else if (isSolflareWallet) {
      // Use Solflare's injected provider
      const provider = (window as any).solflare;
      if (provider) {
        console.log('Using Solflare injected provider');
        // Provider returns { signature, publicKey }
        const response = await provider.signAndSendTransaction(transaction, options);
        signature = response.signature;
        console.log('Solflare transaction response:', response);
      } else {
        // Fallback to wallet adapter
        console.log('Solflare provider not detected, using adapter');
        signature = await wallet.sendTransaction(transaction, connection, options);
      }
    } else {
      // Use standard wallet adapter for other wallets
      console.log('Using standard wallet adapter');
      signature = await wallet.sendTransaction(transaction, connection, options);
    }
    
    console.log(`Transaction sent with signature: ${signature}`);
    return signature;
  } catch (error) {
    console.error('Transaction error:', error);
    throw error;
  }
}

export const handleSignAndSendTransactionError = (error: Error | unknown): string => {
  let errorMessage = 'Unknown error occurred';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String(error.message);
  }
  
  // Rest of the function...
  return errorMessage;
};

export const extractErrorMessage = (error: Error | unknown): string => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error occurred';
}; 