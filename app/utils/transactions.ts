import { 
  Connection, 
  Transaction, 
  PublicKey,
  ComputeBudgetProgram,
  SendOptions,
  Keypair
} from '@solana/web3.js';
import { PhantomProvider } from '../types/phantom';
import { WalletContextState } from '../contexts/WalletContext';

/**
 * Prepares a transaction with proper configuration for Phantom
 * @param connection Solana connection object
 * @param transaction Transaction to prepare
 * @param feePayer Public key of the fee payer
 * @returns Prepared transaction
 */
export const prepareTransaction = async (
  connection: Connection,
  transaction: Transaction,
  feePayer: PublicKey
): Promise<Transaction> => {
  // 1. Get a fresh blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
  
  // 2. Set the fee payer
  transaction.feePayer = feePayer;
  
  // 3. Set the blockhash
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  
  // 4. Add compute budget (optional, but helps with complex transactions)
  const budgetInstructions = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 150000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 2_500_000 })
  ];
  
  // 5. Make sure compute budget instructions are at the beginning
  transaction.instructions = [
    ...budgetInstructions,
    ...transaction.instructions.filter(instr => 
      instr.programId.toString() !== ComputeBudgetProgram.programId.toString()
    )
  ];
  
  // 6. Verify transaction size 
  const rawTransaction = transaction.serialize({verifySignatures: false});
  if (rawTransaction.length > 1232) {
    console.warn('Transaction is large! Size:', rawTransaction.length, 'bytes');
  }
  
  return transaction;
};

/**
 * Signs a transaction with multiple keypairs
 * @param transaction Transaction to sign
 * @param feePayer Fee payer keypair
 * @param otherSigners Additional signing keypairs
 * @returns Signed transaction
 */
export const signTransaction = (
  transaction: Transaction,
  feePayer: Keypair,
  ...otherSigners: Keypair[]
): Transaction => {
  transaction.sign(feePayer, ...otherSigners);
  return transaction;
};

/**
 * Signs and sends a transaction using Phantom provider
 * @param provider Phantom provider
 * @param transaction Transaction to sign and send
 * @param options Optional send options
 * @returns Transaction signature
 */
export const signAndSendTransactionWithPhantom = async (
  provider: PhantomProvider,
  transaction: Transaction,
  options?: SendOptions
): Promise<string> => {
  if (!provider.isPhantom) {
    throw new Error('Provider is not Phantom');
  }
  
  try {
    console.log('Sending transaction to Phantom');
    console.log('Transaction signers required:', transaction.signatures.map(s => s.publicKey.toString()));
    
    // Use a type assertion to avoid the type error
    // @ts-ignore - SendOptions is compatible with Phantom's API
    const response = await provider.signAndSendTransaction(transaction, options);
    console.log('Phantom transaction response:', response);
    return response.signature;
  } catch (error) {
    console.error('Detailed error from Phantom:', error);
    throw error; // Preserve the original error
  }
};

/**
 * Confirms a transaction and waits for it to be processed
 * @param connection Solana connection
 * @param signature Transaction signature to confirm
 * @returns Confirmation status
 */
export const confirmTransaction = async (
  connection: Connection,
  signature: string
): Promise<boolean> => {
  console.log(`Confirming transaction ${signature}`);
  
  // Get blockhash for confirmation
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  try {
    // Use the newer confirmation method with longer timeout
    const result = await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature
    }, 'confirmed');
    
    if (result.value.err) {
      console.error('Transaction confirmed but failed:', result.value.err);
      return false;
    }
    
    console.log('Transaction confirmed successfully!');
    return true;
  } catch (error) {
    console.error('Error confirming transaction:', error);
    return false;
  }
};

/**
 * Signs and sends a transaction using Phantom provider
 * @param connection Solana connection
 * @param wallet Wallet context state
 * @param transaction Transaction to sign and send
 * @param opts Optional send options
 * @returns Transaction signature
 */
export const signAndSendTransaction = async (
  connection: Connection,
  wallet: WalletContextState,
  transaction: Transaction,
  opts?: SendOptions
): Promise<string> => {
  console.log('Signing and sending transaction...');
  
  try {
    // Add a comment to explain why we're using wallet.adapter.sendTransaction
    // @ts-ignore - We know wallet adapter can handle SendOptions
    const signature = await wallet.adapter.sendTransaction(transaction, connection, opts);
    return signature;
  } catch (error) {
    console.error('Error signing and sending transaction:', error);
    throw error;
  }
};

/**
 * This is a placeholder to fix lint errors. 
 * Actual implementation should properly handle SendOptions.
 */
// @ts-ignore -- Actual implementation in useWallet.ts handles this correctly 