import { PublicKey, Transaction, Connection, SendOptions } from '@solana/web3.js';

// Creating a stub/placeholder for the WalletContextState interface
// This is just to satisfy TypeScript and prevent import errors

export interface WalletContextState {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  wallet: any;
  adapter: {
    name: string;
    publicKey: PublicKey | null;
    connected: boolean;
    sendTransaction: (
      transaction: Transaction, 
      connection: Connection, 
      options?: any
    ) => Promise<string>;
  };
  sendTransaction: (
    transaction: Transaction, 
    connection: Connection, 
    options?: SendOptions
  ) => Promise<string>;
} 