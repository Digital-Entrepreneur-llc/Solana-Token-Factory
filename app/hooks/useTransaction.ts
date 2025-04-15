'use client';

import { useState } from 'react';
import { Transaction, Keypair, Connection } from '@solana/web3.js';
import { useWallet } from '@hooks/useWallet';
import { TransactionResponse } from '@/app/types/wallet';

// Add type declaration for dataLayer
declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * useTransaction hook for handling Solana transactions with proper fee display
 * Uses Solflare deeplinks on mobile and direct adapter on desktop
 */
export const useTransaction = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { publicKey, connection: defaultConnection, wallet } = useWallet();

  const sendTransaction = async (
    transaction: Transaction,
    additionalSigners: Keypair[] = [],
    customConnection?: Connection
  ): Promise<TransactionResponse | null> => {
    try {
      console.log('Starting transaction process...');
      setIsProcessing(true);
      setError(null);
  
      if (!publicKey || !wallet) {
        throw new Error('Wallet not connected');
      }
      
      // Use custom connection if provided, otherwise use default connection
      const connection = customConnection || defaultConnection;
  
      // Get latest blockhash
      console.log('Getting latest blockhash...');
      console.log('Using connection:', connection.rpcEndpoint);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      console.log('Using blockhash:', blockhash, 'with lastValidBlockHeight:', lastValidBlockHeight);
      
      // Set transaction parameters
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Have additional signers (like mint) sign first
      console.log('Processing pre-signatures:', additionalSigners.length);
      if (additionalSigners.length > 0) {
        transaction.partialSign(...additionalSigners);
      }

      // Serialize transaction to check size - transactions over 1232 bytes may fail
      try {
        // Use serializeMessage instead of serialize to avoid signature verification errors
        const serializedTxMessage = transaction.serializeMessage();
        console.log('Transaction message serialized successfully, size:', serializedTxMessage.length, 'bytes');
        // Account for signatures which will add ~65 bytes per required signature
        const signaturesSize = transaction.signatures.length * 65;
        const estimatedTotalSize = serializedTxMessage.length + signaturesSize;
        
        console.log('Estimated total transaction size:', estimatedTotalSize, 'bytes');
        if (estimatedTotalSize > 1000) {
          console.warn('Transaction is large (' + estimatedTotalSize + ' bytes), may need optimization');
        }
      } catch (serializeError) {
        console.error('Transaction message serialization check failed:', serializeError);
      }

      // Log transaction details for debugging
      console.log('Transaction details:', {
        numInstructions: transaction.instructions.length,
        hasMemo: transaction.instructions.some(
          instr => instr.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
        ),
        hasTransfer: transaction.instructions.some(
          instr => instr.programId.toString() === '11111111111111111111111111111111'
        ),
        feePayer: publicKey.toString(),
        requiredSigners: transaction.signatures
          .filter(s => s.signature === null)
          .map(s => s.publicKey.toString())
      });
      
      // Use the direct wallet adapter approach which has proven more reliable
      console.log('Using direct wallet adapter for transaction');
      
      // List any keypairs that have already signed the transaction
      const partiallySignedBy = transaction.signatures
        .filter(s => s.signature !== null)
        .map(s => s.publicKey.toString());
        
      if (partiallySignedBy.length > 0) {
        console.log('Transaction is pre-signed by these keypairs:', partiallySignedBy);
      }
      
      // Log the signing status before sending
      console.log('Transaction signing status:', {
        partiallySignedBy,
        pendingSignatures: transaction.signatures
          .filter(s => s.signature === null)
          .map(s => s.publicKey.toString()),
        currentSigner: publicKey.toString()
      });

      // Use the wallet adapter's sendTransaction which handles signing and sending in one step
      const signature = await wallet.adapter.sendTransaction(transaction, connection, {
        skipPreflight: false, // Enable preflight by default
        preflightCommitment: 'confirmed',
        maxRetries: 5
      });
      
      console.log('Wallet adapter returned signature:', signature);

      // Wait for confirmation with a polling approach
      console.log('Waiting for transaction confirmation:', signature);
      console.log('Explorer link:', `https://explorer.solana.com/tx/${signature}`);
      
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 40; // Try for up to 40 seconds
      
      while (attempts < maxAttempts && !confirmed) {
        try {
          const status = await connection.getSignatureStatus(signature);
          
          if (status && status.value) {
            if (status.value.confirmationStatus === 'confirmed' || 
                status.value.confirmationStatus === 'finalized') {
              console.log('Transaction confirmed via polling:', status.value.confirmationStatus);
              confirmed = true;
              break;
            }
            
            if (status.value.err) {
              console.error('Transaction failed on chain:', status.value.err);
              throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
            }
          } else {
            console.log(`Transaction not found yet (attempt ${attempts+1}/${maxAttempts}), retrying...`);
          }
        } catch (pollError) {
          console.warn('Error checking transaction status:', pollError);
        }
        
        // Wait 1 second before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (!confirmed) {
        console.warn('Transaction confirmation timed out, but signature was returned');
      }
      
      // Return a consistent response object
      return {
        signature,
        status: confirmed ? 'confirmed' : 'pending'
      };

    } catch (err) {
      console.error('Transaction error details:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });

      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      console.error('Transaction error:', errorMessage);
      return null;

    } finally {
      setIsProcessing(false);
    }
  };

  return {
    sendTransaction,
    isProcessing,
    error,
  };
};
