import { PublicKey, Transaction, VersionedTransaction, SendOptions } from '@solana/web3.js';

type DisplayEncoding = 'utf8' | 'hex';

type PhantomEvent = 'connect' | 'disconnect' | 'accountChanged';

type PhantomRequestMethod =
  | 'connect'
  | 'disconnect'
  | 'signAndSendTransaction'
  | 'signAndSendTransactionV0'
  | 'signAndSendTransactionV0WithLookupTable'
  | 'signTransaction'
  | 'signAllTransactions'
  | 'signMessage';

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

// IMPORTANT: Don't define a PhantomWindow interface here!
// Only use the one from phantom.d.ts to avoid conflicts

export interface PhantomProvider {
  isPhantom: boolean;
  publicKey: { toBytes(): Uint8Array; toString(): string; } | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signAndSendTransaction: (
    transaction: Transaction,
    options?: { signers?: unknown[] }
  ) => Promise<{ signature: string; publicKey: string }>;
  signMessage: (
    message: Uint8Array, 
    display?: string
  ) => Promise<{ signature: Uint8Array; publicKey: string }>;
  connect: () => Promise<{ publicKey: { toBytes(): Uint8Array; toString(): string; } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (args: unknown) => void) => void;
  request: (method: unknown) => Promise<unknown>;
}

// Helper function to get the Phantom provider as recommended in Phantom docs
export const getPhantomProvider = (): PhantomProvider | undefined => {
  if ('phantom' in window) {
    const anyWindow: any = window;
    const provider = anyWindow.phantom?.solana;

    if (provider?.isPhantom) {
      return provider;
    }
  }
  
  // If the provider is not found, you might want to redirect or handle this case
  return undefined;
}; 