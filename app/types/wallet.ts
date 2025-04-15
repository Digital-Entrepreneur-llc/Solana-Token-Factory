import { Transaction, SendOptions } from '@solana/web3.js';

export interface WalletProvider {
  signAndSendTransaction(
    transaction: Transaction, 
    options?: SendOptions
  ): Promise<{ signature: string }>;
}

declare global {
  interface Window {
    phantom?: {
      solana?: WalletProvider;
    };
    solflare?: WalletProvider;
  }
}

declare global {
  interface Window {
    phantom?: {
      solana?: WalletProvider;
    };
    solflare?: WalletProvider;
    // For standardization with other wallet adapters
    // If any code directly accesses window.solflare, leave it as is
  }
}

export interface TransactionResponse {
  signature: string;
  status: 'confirmed' | 'failed' | 'pending';
}
