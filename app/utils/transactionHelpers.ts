'use client';

import { Connection } from '@solana/web3.js';

const POLLING_INTERVAL = 1000; // one second
const MAX_POLLS = 30;

/**
 * Polls for transaction signature statuses
 * @param signature A transaction signature
 * @param connection An RPC connection
 * @param onStatusUpdate Function to call with status updates
 * @returns A promise that resolves when the transaction is confirmed or times out
 */
export const pollSignatureStatus = async (
  signature: string,
  connection: Connection,
  onStatusUpdate?: (status: { status: string, message: string }) => void
): Promise<boolean> => {
  let count = 0;

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      // Failed to confirm transaction in time
      if (count >= MAX_POLLS) {
        clearInterval(interval);
        const errorMessage = `Failed to confirm transaction within ${MAX_POLLS} seconds. The transaction may or may not have succeeded.`;
        
        if (onStatusUpdate) {
          onStatusUpdate({
            status: 'error',
            message: errorMessage
          });
        }
        
        console.error(`Transaction timeout: ${signature}\n${errorMessage}`);
        resolve(false);
        return;
      }

      try {
        const { value } = await connection.getSignatureStatus(signature);
        const confirmationStatus = value?.confirmationStatus;

        if (confirmationStatus) {
          const hasReachedSufficientCommitment = confirmationStatus === 'confirmed' || confirmationStatus === 'finalized';

          if (onStatusUpdate) {
            onStatusUpdate({
              status: hasReachedSufficientCommitment ? 'success' : 'info',
              message: `Status: ${confirmationStatus}`
            });
          }

          if (hasReachedSufficientCommitment) {
            clearInterval(interval);
            resolve(true);
            return;
          }
        } else {
          if (onStatusUpdate) {
            onStatusUpdate({
              status: 'info',
              message: 'Status: Waiting on confirmation...'
            });
          }
        }
      } catch (error) {
        console.warn('Error checking transaction status:', error);
        // Continue polling despite errors
      }

      count++;
    }, POLLING_INTERVAL);
  });
};

/**
 * Helper to check if a transaction has errored
 * @param signature Transaction signature
 * @param connection RPC connection
 * @returns Error object if transaction failed, null otherwise
 */
export const checkTransactionError = async (
  signature: string,
  connection: Connection
): Promise<any> => {
  try {
    const { value } = await connection.getSignatureStatus(signature);
    return value?.err || null;
  } catch (error) {
    console.error('Error checking transaction error:', error);
    return null;
  }
};

export const getRetrySignature = async (error: Error | unknown): Promise<string | null> => {
  // Type guard to check if error is an Error object with a message property
  if (error instanceof Error && typeof error.message === 'string') {
    // Existing code...
  }
  return null;
} 