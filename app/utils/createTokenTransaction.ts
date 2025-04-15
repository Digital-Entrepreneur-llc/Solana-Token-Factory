'use client';

import {
  Connection,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  TransactionInstruction,
  SystemProgram
  } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  MINT_SIZE
} from '@solana/spl-token';
import { BASE_TOKEN_FEE, AUTHORITY_REVOCATION_FEE } from '@/app/config/fees';
import { createMetadataInstructionData } from './createMetadataInstructionData';

// Constants
const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const TREASURY_ADDRESS = new PublicKey('');
const COMPUTE_UNIT_LIMIT = 120_000;
const COMPUTE_UNIT_PRICE = 1.67;

interface TokenConfig {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  amount: bigint;
  revokeFreezeAuthority: boolean;
  revokeMintAuthority: boolean;
  mint: PublicKey;
  // Optional custom treasury fee for promo code discounts
  customTreasuryFee?: number;
  // Optional promo code information for tracking
  promoInfo?: {
    code: string;
    discountPercentage: number;
  };
}

// Helper function to create a token transaction (without creating mint account)
export const createTokenTransactionWithoutMint = async (
  connection: Connection,
  payer: PublicKey,
  config: TokenConfig
): Promise<{ transaction: Transaction; mint: PublicKey }> => {
  console.log('Creating token transaction with config:', config);

  try {
    // Use the provided mint
    const mint = config.mint;
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    
    // Calculate fee amount with any discounts applied
    const feeAmount = config.customTreasuryFee !== undefined
      ? config.customTreasuryFee * LAMPORTS_PER_SOL
      : calculateFee(config.revokeFreezeAuthority, config.revokeMintAuthority);

    // Get the mint rent
    const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    // Create transaction with the payer and latest blockhash
    const transaction = new Transaction({
      feePayer: payer,
      blockhash,
      lastValidBlockHeight,
    });

    // ===== STEP 1: COMPUTE BUDGET INSTRUCTIONS =====
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNIT_LIMIT }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: Math.floor(COMPUTE_UNIT_PRICE * 1_000_000),
      })
    );

    // ===== STEP 2: MINT ACCOUNT CREATION =====
    // Create the mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mint,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // Explicitly add the mint as a signer in the transaction
    transaction.signatures.push({
      publicKey: mint,
      signature: null
    });

    // Initialize the mint with the payer as both mint and freeze authority
    transaction.add(
      createInitializeMintInstruction(
        mint,
        config.decimals,
        payer,  // mint authority
        payer   // freeze authority
      )
    );

    // ===== STEP 3: TOKEN ACCOUNT CREATION AND MINTING =====
    // Get the associated token account
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mint,
      payer,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create the associated token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        associatedTokenAccount,
        payer,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // Mint tokens to the associated token account
    transaction.add(
      createMintToInstruction(
        mint,
        associatedTokenAccount,
        payer,
        config.amount
      )
    );

    // ===== STEP 4: METADATA CREATION =====
    // Create metadata for the token
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );

    console.log("Create metadata accounts:");
    console.log(`- Metadata PDA: ${metadataAddress.toString()}`);
    console.log(`- Mint address: ${mint.toString()}`);
    console.log(`- Payer/Authority: ${payer.toString()}`);

    // Create the metadata instruction
    const createMetadataInstruction = new TransactionInstruction({
      programId: MPL_TOKEN_METADATA_PROGRAM_ID,
      keys: [
        { pubkey: metadataAddress, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: payer, isSigner: true, isWritable: false },
        { pubkey: payer, isSigner: true, isWritable: false },
        { pubkey: payer, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: createMetadataInstructionData(
        config.name,
        config.symbol,
        config.uri
      ),
    });
    transaction.add(createMetadataInstruction);

    // ===== STEP 5: OPTIONAL AUTHORITY REVOCATION =====
    // Option 1: Revoke freeze authority if selected
    if (config.revokeFreezeAuthority) {
      console.log("Adding instruction to revoke freeze authority");
      transaction.add(
        createSetAuthorityInstruction(
          mint,
          payer,
          AuthorityType.FreezeAccount,
          null  // Setting to null revokes the authority
        )
      );
    }
    
    // Option 2: Revoke mint authority if selected
    if (config.revokeMintAuthority) {
      console.log("Adding instruction to revoke mint authority");
      transaction.add(
        createSetAuthorityInstruction(
          mint,
          payer,
          AuthorityType.MintTokens,
          null  // Setting to null revokes the authority
        )
      );
    }

    // ===== STEP 6: TREASURY TRANSFER =====
    if (feeAmount > 0) {
      // Add the transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: TREASURY_ADDRESS,
          lamports: feeAmount,
        })
      );
    }
    
    // Log transaction details for debugging
    console.log('Transaction created with:', {
      numInstructions: transaction.instructions.length,
      hasTransfer: transaction.instructions.some(
        (instr: TransactionInstruction) => instr.programId.toString() === '11111111111111111111111111111111'
      ),
      mintAddress: mint.toString()
    });
    
    return { transaction, mint };
  } catch (error: unknown) {
    console.error('Error creating token transaction:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create token transaction: ${errorMessage}`);
  }
};

// Helper utility functions

// Format token metadata for IPFS according to Metaplex standard
export function formatMetadata(params: {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
}) {
  return {
    name: params.name,
    symbol: params.symbol, 
    description: params.description || `${params.name} token on Solana`,
    image: params.image || '',
    properties: {
      files: [
        {
          uri: params.image || '',
          type: 'image/png'
        }
      ],
      category: 'image',
      creators: []
    }
  };
}

// Calculate fee based on chosen authority revocations
function calculateFee(revokeFreezeAuthority: boolean, revokeMintAuthority: boolean): number {
  let fee = BASE_TOKEN_FEE * LAMPORTS_PER_SOL;
  
  if (revokeFreezeAuthority) {
    fee += AUTHORITY_REVOCATION_FEE * LAMPORTS_PER_SOL;
  }
  
  if (revokeMintAuthority) {
    fee += AUTHORITY_REVOCATION_FEE * LAMPORTS_PER_SOL;
  }
  
  return fee;
}
