# Solana Token Factory - Wallet Integration

This document explains how our wallet integration works with Phantom and Solflare wallets.

## Overview

Our application uses Solana wallet adapters for initial connection, but directly accesses the injected providers (window.solana, window.solflare) for transaction signing and sending, following the best practices from [Phantom's documentation](https://docs.phantom.com/phantom-deeplinks/provider-methods/signandsendtransaction).

## Key Components

1. **Providers.tsx**
   - Uses `PhantomWalletAdapter` and `SolflareWalletAdapter` with proper configuration
   - Includes WalletLogger for better debugging

2. **useWallet.ts Hook**
   - Provides wallet connection functionality
   - **Important**: Uses direct injected providers for transaction signing/sending:
     - `window.solana.signAndSendTransaction` for Phantom
     - `window.solflare.signAndSendTransaction` for Solflare
   - Falls back to standard wallet adapter methods for other wallets

3. **Correct Transaction Submission**
   - **CRITICAL**: Always use the injected provider directly for Phantom and Solflare
   - Never use the wallet adapter's sendTransaction method for these wallets
   - Example:
   ```typescript
   // CORRECT approach:
   if (wallet.adapter.name === 'Phantom') {
     const provider = (window as any).solana;
     const res = await provider.signAndSendTransaction(transaction);
     signature = res.signature;
   } else if (wallet.adapter.name === 'Solflare') {
     const provider = (window as any).solflare;
     const res = await provider.signAndSendTransaction(transaction);
     signature = res.signature;
   } else {
     // Only use adapter for other wallets
     signature = await wallet.adapter.sendTransaction(transaction, connection);
   }
   ```

## Usage Example

Here's a simple example of sending a transaction:

```tsx
import React, { useCallback } from 'react';
import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

export default function SendSolButton() {
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  
  const handleSendSol = useCallback(async () => {
    if (!publicKey || !wallet) return;
    
    try {
      // 1) Build transaction
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECIPIENT_PUBKEY,
          lamports: 0.01 * LAMPORTS_PER_SOL,
        })
      );
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      
      // 2) Use the appropriate provider directly
      let signature;
      if (wallet.adapter.name === 'Phantom') {
        const provider = (window as any).solana;
        const res = await provider.signAndSendTransaction(tx);
        signature = res.signature;
      } else if (wallet.adapter.name === 'Solflare') {
        const provider = (window as any).solflare;
        const res = await provider.signAndSendTransaction(tx);
        signature = res.signature;
      } else {
        // Use adapter for other wallets
        signature = await wallet.adapter.sendTransaction(tx, connection);
      }
      
      console.log(`Transaction sent: ${signature}`);
    } catch (err) {
      console.error('Transaction failed:', err);
    }
  }, [publicKey, wallet, connection]);
  
  return (
    <button onClick={handleSendSol} disabled={!publicKey}>
      Send 0.01 SOL
    </button>
  );
}
```

## Troubleshooting

If transactions are failing, especially with Phantom or Solflare, check:

1. Are you using the injected provider directly (`window.solana` or `window.solflare`)?
2. Are you handling `signAndSendTransaction`'s response correctly? (Extract `signature` from `res.signature`)
3. Is the transaction properly constructed with all required fields? 