'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, Check, Zap } from 'lucide-react';
import Image from 'next/image';
import { useCreateMetadata } from '@utils/createMetadataV3';
import { useWallet } from '@hooks/useWallet';
import { createTokenTransactionWithoutMint } from '@utils/createTokenTransaction';
import { useTransaction } from '@hooks/useTransaction';
import { Keypair, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import { useSearchParams } from 'next/navigation';
import { BASE_TOKEN_FEE, AUTHORITY_REVOCATION_FEE, calculateTotalFee, formatFee } from '@/app/config/fees';
import { validatePromoCode, applyDiscount, PromoCode, recordPromoCodeUsage } from '@/app/config/promoCodes';
import { API_ENDPOINTS } from '@/app/config/apiConfig';

// Add a type declaration for the global window object with gtag
declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: object) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

interface FormData {
  name: string;
  symbol: string;
  decimals: string;
  supply: string;
  description: string;
  image: File | null;
  revokeFreezeAuthority: boolean;
  revokeMintAuthority: boolean;
}

interface FormErrors {
  name?: string;
  symbol?: string;
  decimals?: string;
  supply?: string;
  description?: string;
  image?: string;
  general?: string;
}

interface FormProgress {
  basicInfo: boolean;
  imageUploaded: boolean;
  authoritySet: boolean;
  ready: boolean;
}

const gradientBorder = 'border border-transparent bg-gradient-to-r from-[#9945FF]/40 to-[#14F195]/40 p-[1px]';
const glassBackground = 'backdrop-blur-md bg-[#1B1B1B]/90';
const buttonBaseStyle = `w-full px-4 py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-white`;
const inputBaseStyle = `w-full px-4 py-3.5 rounded-xl bg-[#232323] border border-[#343434] text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#9945FF]/30 hover:border-[#9945FF]/20 transition-all duration-200 shadow-inner autofill:bg-[#232323] autofill:text-white autofill:shadow-inner`;
const labelStyle = `block text-sm font-medium text-white/70 mb-1.5`;

export const TokenCreator = () => {
  const {
    publicKey,
    connected,
    wallet,
    connection
  } = useWallet();
  const { createMetadataV3, isUploading, uploadProgress } = useCreateMetadata();
  const { isProcessing } = useTransaction();
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<string>('');
  // Use a mint keypair for the mint account creation transaction.
  const [mintKeypair, setMintKeypair] = useState(() => Keypair.generate());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [mintAddress, setMintAddress] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [originalFee, setOriginalFee] = useState<number | null>(null);
  // Add these new state variables for transaction retries
  const [lastMetadataUri, setLastMetadataUri] = useState<string>('');
  const [lastSupply, setLastSupply] = useState<bigint>(BigInt(0));
  const [lastTreasuryFee, setLastTreasuryFee] = useState<number>(0);
  const [formProgress, setFormProgress] = useState<FormProgress>({
    basicInfo: false,
    imageUploaded: false,
    authoritySet: false,
    ready: false
  });
  const [recentTokenCount, setRecentTokenCount] = useState<number>(0);
  
  // Move useSearchParams to component top level to comply with React hooks rules
  const searchParams = useSearchParams();

  // Helper function to truncate filename in the middle
  const truncateFilename = (filename: string, maxLength: number = 24): string => {
    if (!filename || filename.length <= maxLength) return filename;
    
    // Get the file extension
    const lastDotIndex = filename.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
    
    // Calculate how much of the filename we can show before and after
    const nameWithoutExt = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
    const halfMaxLength = Math.floor((maxLength - 3 - extension.length) / 2);
    
    // If filename is too short to sensibly truncate, just use regular truncate
    if (halfMaxLength < 3) return `${filename.slice(0, maxLength - 3)}...`;
    
    // Otherwise truncate in the middle
    return `${nameWithoutExt.slice(0, halfMaxLength)}...${nameWithoutExt.slice(-halfMaxLength)}${extension}`;
  };

  const [formData, setFormData] = useState<FormData>({
    name: '',
    symbol: '',
    decimals: '9',
    supply: '',
    description: '',
    image: null,
    revokeFreezeAuthority: true,
    revokeMintAuthority: false,
  });

  // Function to calculate and display the total transaction cost
  const calculateEstimatedFee = useCallback(async () => {
    if (!publicKey || !connected || !connection) return;
    
    try {
      // Calculate base treasury fee
      const baseFee = BASE_TOKEN_FEE; // SOL
      const authorityFee = AUTHORITY_REVOCATION_FEE; // SOL per authority revocation
      
      // Add authority revocation fees if applicable
      let treasuryFee = baseFee;
      if (formData.revokeFreezeAuthority) treasuryFee += authorityFee;
      if (formData.revokeMintAuthority) treasuryFee += authorityFee;
      
      // Store the original fee before discount
      setOriginalFee(treasuryFee);
      
      // Apply promo code discount if one is applied
      if (appliedPromo) {
        treasuryFee = applyDiscount(treasuryFee, appliedPromo);
      }
      
      // Format total treasury fee with 4 decimal places
      const formattedFee = formatFee(treasuryFee);
      setEstimatedFee(formattedFee);
    } catch (error) {
      console.error('Error calculating fee:', error);
    }
  }, [publicKey, connected, connection, formData.revokeFreezeAuthority, formData.revokeMintAuthority, appliedPromo]);

  // Update fee estimation when revocation options change
  useEffect(() => {
    calculateEstimatedFee();
  }, [calculateEstimatedFee]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFormData(prev => ({ ...prev, image: file }));
      
      // Create image preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleToggleFreeze = useCallback(() => {
    setFormData(prev => ({ ...prev, revokeFreezeAuthority: !prev.revokeFreezeAuthority }));
  }, []);

  const handleToggleMint = useCallback(() => {
    setFormData(prev => ({ ...prev, revokeMintAuthority: !prev.revokeMintAuthority }));
  }, []);

  const handleApplyPromoCode = async () => {
    // Reset errors
    setPromoError(null);
    
    // Validate promo code
    const validPromo = await validatePromoCode(promoCode);
    
    if (!validPromo) {
      setPromoError('Invalid promo code');
      return;
    }
    
    // Apply the promo code
    setAppliedPromo(validPromo);
    
    // Recalculate fees with discount
    calculateEstimatedFee();
  };
  
  const handleRemovePromoCode = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError(null);
    calculateEstimatedFee();
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
    } else if (formData.symbol.length > 8) {
      newErrors.symbol = 'Symbol must be 8 characters or less';
    }
    if (!formData.decimals) {
      newErrors.decimals = 'Decimals is required';
    } else {
      const dec = parseInt(formData.decimals);
      if (dec !== 5 && dec !== 9) {
        newErrors.decimals = 'Decimals must be 5 or 9';
      }
    }
    if (!formData.supply) {
      newErrors.supply = 'Supply is required';
    } else {
      const supply = Number(formData.supply);
      if (isNaN(supply) || supply <= 0) {
        newErrors.supply = 'Supply must be a positive number';
      }
    }
    if (!formData.image) {
      newErrors.image = 'Image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm() || !publicKey || !connected) return;

    try {
      setStatus('Preparing your token...');
      if (!formData.image) throw new Error('Image is required');

      // Check RPC endpoint health before proceeding
      setStatus('Checking network connection...');
      try {
        const connectionCheck = await connection.getLatestBlockhash();
        console.log('RPC connection test successful:', connectionCheck.blockhash.substring(0, 8) + '...');
        
        // Check if we can get recent blocks - another good health indicator
        const blocks = await connection.getBlocks(
          connectionCheck.lastValidBlockHeight - 10,
          connectionCheck.lastValidBlockHeight
        );
        console.log(`RPC health check: Retrieved ${blocks.length} recent blocks`);
        
        if (blocks.length === 0) {
          console.warn('RPC health warning: Could not retrieve recent blocks');
        }
      } catch (rpcError) {
        console.error('RPC health check failed:', rpcError);
        setStatus('Warning: RPC connection issues detected. Creating token may fail. Consider trying again later.');
        // Wait for user to see the warning
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // ===== STEP 1: UPLOAD METADATA TO IPFS =====
      setStatus('Uploading metadata to IPFS...');
      const { metadataUri, imageUri } = await createMetadataV3({
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        image: formData.image,
      });

      if (!metadataUri) throw new Error('Failed to generate metadata URI');
      
      // Save these values for potential retries
      setLastMetadataUri(metadataUri);
      
      // Format imageUri to ensure it's a proper gateway URL
      let formattedImageUrl = imageUri;
      
      // Check if it's already a proper URL with http/https
      if (!imageUri.startsWith('http')) {
        // Handle ipfs:/ or ipfs:// protocol format
        if (imageUri.startsWith('ipfs:/')) {
          const cid = imageUri.replace('ipfs:/', '').replace('ipfs://', '').trim();
          formattedImageUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
        } 
        // Handle just the CID (starts with Qm)
        else if (imageUri.startsWith('Qm')) {
          formattedImageUrl = `https://gateway.pinata.cloud/ipfs/${imageUri.trim()}`;
        }
        // If it's a data URL (base64), we'll keep it as is, though this isn't ideal
        else if (imageUri.startsWith('data:')) {
          console.warn('Using base64 data URI instead of IPFS URL - this is not recommended');
          formattedImageUrl = imageUri;
        }
      }
      
      console.log('Using formatted image URL:', formattedImageUrl.substring(0, 60) + '...');

      // ===== STEP 2: CALCULATE FEES =====
      // Calculate the discounted fee if a promo code is applied
      let treasuryFee = calculateTotalFee(formData.revokeFreezeAuthority, formData.revokeMintAuthority);
      if (appliedPromo) {
        treasuryFee = applyDiscount(treasuryFee, appliedPromo);
        console.log(`Applied promo code ${appliedPromo.code} for ${appliedPromo.discountPercentage}% discount`);
        console.log(`Original fee: ${formatFee(originalFee || 0)} SOL, Discounted fee: ${formatFee(treasuryFee)} SOL`);
      }
      
      // Save treasury fee for retries
      setLastTreasuryFee(treasuryFee);

      // ===== STEP 3: CREATE TOKEN TRANSACTION =====
      setStatus('Creating token transaction...');
      const decimals = parseInt(formData.decimals);
      const supply = BigInt(Math.floor(Number(formData.supply) * Math.pow(10, decimals)));
      if (!supply) throw new Error('Invalid supply calculation');
      
      // Save supply for retries
      setLastSupply(supply);

      // Create a single combined transaction that includes:
      // - Mint account creation
      // - Token initialization
      // - Token minting
      // - Metadata creation
      // - Optional authority revocation
      // - Treasury fee transfer
      const { transaction, mint } = await createTokenTransactionWithoutMint(
        connection,
        publicKey,
        {
          name: formData.name,
          symbol: formData.symbol,
          uri: metadataUri,
          decimals,
          amount: supply,
          revokeFreezeAuthority: formData.revokeFreezeAuthority,
          revokeMintAuthority: formData.revokeMintAuthority,
          mint: mintKeypair.publicKey,
          // Pass the discounted treasury fee
          customTreasuryFee: treasuryFee,
          // Include promo info if applicable
          promoInfo: appliedPromo ? {
            code: appliedPromo.code,
            discountPercentage: appliedPromo.discountPercentage
          } : undefined
        }
      );

      // ===== STEP 4: PREPARE TRANSACTION FOR SIGNING =====
      // Set the fee payer and get the latest blockhash
      transaction.feePayer = publicKey;
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;

      // Sign with the mintKeypair first (this is required for mint account creation)
      // Make sure we're correctly signing - pass a clean copy of the keypair
      try {
        // Pre-sign with the mint keypair before wallet signature
        const mintKeypairForSigning = Keypair.fromSecretKey(mintKeypair.secretKey);
        transaction.partialSign(mintKeypairForSigning);
        
        console.log('Transaction signed with mint keypair:', mintKeypair.publicKey.toString());
      } catch (error: unknown) {
        console.error('Error signing with mint keypair:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error('Failed to sign transaction with mint keypair: ' + errorMessage);
      }

      // Log the transaction structure for debugging
      console.log('Transaction structure:', {
        numInstructions: transaction.instructions.length,
        hasMemo: transaction.instructions.some(
          instr => instr.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
        ),
        hasTransfer: transaction.instructions.some(
          instr => instr.programId.toString() === '11111111111111111111111111111111'
        ),
        mintAddress: mint.toString(),
        appliedPromoCode: appliedPromo?.code || 'none'
      });

      // ===== STEP 5: SEND TRANSACTION FOR USER APPROVAL =====
      // This will prompt the user to sign the transaction with their wallet
      // Only one signature is required from the user's wallet
      setStatus('Please approve the token creation transaction...');
      
      // Log config one last time before sending
      console.log('Final transaction configuration:', {
        mintAddress: mintKeypair.publicKey.toString(),
        numInstructions: transaction.instructions.length,
        signaturesLength: transaction.signatures.length,
        mintSignatureIncluded: transaction.signatures.some(s => s.publicKey.equals(mintKeypair.publicKey)),
        hasRequiredSignatures: transaction.signatures.every(s => s.signature !== null || s.publicKey.equals(publicKey))
      });
      
      // Try to send the transaction using the signAndSendTransaction method from the wallet
      let signature;
      try {
        console.log('Sending transaction via wallet adapter...');
        
        // This will both sign with the user wallet and send the transaction in one step
        signature = await wallet?.adapter.sendTransaction(transaction, connection, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 5
        });
        
        if (!signature) {
          throw new Error('Failed to get transaction signature');
        }
        
        console.log('Transaction submitted successfully, signature:', signature);
      } catch (txError) {
        console.error('Error sending transaction through wallet adapter:', txError);
        
        // If that fails, try with a higher compute budget
        console.log('Retrying with higher compute budget...');
        
        // Create a new transaction with higher compute budget
        const retryTx = new Transaction();
        
        // Add a higher compute budget as the first instruction
        retryTx.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: 150000 // Higher limit for retry but more optimal based on actual usage
          })
        );
        
        // Copy all other instructions except compute budget ones
        for (const instr of transaction.instructions) {
          if (instr.programId.toString() !== 'ComputeBudget111111111111111111111111111111') {
            retryTx.add(instr);
          }
        }
        
        // Get a fresh blockhash
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        retryTx.recentBlockhash = blockhash;
        retryTx.feePayer = publicKey;
        
        // Sign with the mint keypair again
        const mintKeypairForSigning = Keypair.fromSecretKey(mintKeypair.secretKey);
        retryTx.partialSign(mintKeypairForSigning);
        
        // Try sending via wallet adapter again
        try {
          signature = await wallet?.adapter.sendTransaction(retryTx, connection, {
            skipPreflight: true, // Skip preflight on retry
            preflightCommitment: 'confirmed',
            maxRetries: 5
          });
          
          if (!signature) {
            throw new Error('Failed to get transaction signature');
          }
          
          console.log('Retry transaction submitted, signature:', signature);
          setStatus('Transaction resubmitted, waiting for confirmation...');
          
          // Check for confirmation (limited attempts)
          let confirmed = false;
          for (let i = 0; i < 10; i++) {
            try {
              await new Promise(r => setTimeout(r, 1000));
              const status = await connection.getSignatureStatus(signature);
              
              if (status && status.value) {
                if (status.value.confirmationStatus === 'confirmed' || 
                    status.value.confirmationStatus === 'finalized') {
                  confirmed = true;
                  break;
                }
                
                if (status.value.err) {
                  throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
                }
              }
            } catch (err) {
              console.warn('Error checking status:', err);
            }
          }
          
          if (confirmed) {
            setStatus('success');
            
            // Record promo code usage if a code was applied
            if (appliedPromo) {
              try {
                await recordPromoCodeUsage(appliedPromo.code);
                console.log('Promo code usage recorded:', appliedPromo.code);
              } catch (e) {
                console.warn('Failed to record promo code usage:', e);
              }
            }
            
            // Enhanced conversion tracking with dataLayer push
            if (typeof window !== 'undefined') {
              // Google Analytics 4 tracking
              if (window.gtag) {
                const deviceType = window.innerWidth <= 768 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop';
                window.gtag('event', 'solana_transaction_submitted', {
                  'send_to': 'AW-16826597392',
                  'value': treasuryFee,
                  'currency': 'USD',
                  'device_category': deviceType,
                  'transaction_id': signature,
                  'items': [{
                    'id': mint.toString(),
                    'name': formData.name,
                    'category': 'SPL Token',
                    'quantity': 1,
                    'price': treasuryFee
                  }]
                });
                console.log('Enhanced conversion event tracked with device:', deviceType);
              }
              
              // Push to dataLayer for Google Tag Manager
              if (window.dataLayer === undefined) {
                window.dataLayer = [];
              }
              window.dataLayer.push({
                'event': 'solana_transaction_submitted',
                'transactionValue': treasuryFee,
                'transactionId': signature,
                'tokenName': formData.name,
                'tokenSymbol': formData.symbol,
                'tokenMint': mint.toString(),
                'walletAddress': publicKey.toString()
              });
              console.log('DataLayer event pushed for GTM tracking');
              
              // Dispatch event to refresh RecentTokens component
              try {
                const tokenCreatedEvent = new Event('tokenCreated');
                window.dispatchEvent(tokenCreatedEvent);
                console.log('Dispatched tokenCreated event to refresh token list');
              } catch (e) {
                console.warn('Could not dispatch tokenCreated event:', e);
              }
            }
          } else {
            setStatus('Transaction resubmitted, but confirmation is still pending.');
          }
        } catch (retryError) {
          console.error('Even retry transaction failed:', retryError);
          throw new Error('Failed to send transaction after multiple attempts');
        }
      }
      
      // If we got here, we have a signature
      if (!signature) {
        throw new Error('No signature returned from transaction');
      }
      
      // Create a result object with the signature
      const result = {
        signature,
        status: 'pending' as const
      };
      
      // Check transaction status
      if (result.status === 'pending') {
        console.log('Transaction is pending confirmation. Signature:', result.signature);
        console.log('Transaction can be viewed at:', `https://explorer.solana.com/tx/${result.signature}`);
        setStatus('Transaction sent! Waiting for confirmation...');
        
        // Add manual confirmation check for the transaction
        let checkAttempts = 0;
        const checkInterval = setInterval(async () => {
          try {
            checkAttempts++;
            console.log(`Manual check for transaction confirmation (attempt ${checkAttempts})...`);
            
            const txStatus = await connection.getSignatureStatus(result.signature);
            
            if (txStatus && txStatus.value) {
              if (txStatus.value.confirmationStatus === 'confirmed' || 
                  txStatus.value.confirmationStatus === 'finalized') {
                clearInterval(checkInterval);
                console.log('Transaction manually confirmed:', txStatus.value.confirmationStatus);
                setStatus('success');
                // Enhanced conversion tracking with dataLayer push
                if (typeof window !== 'undefined') {
                  // Google Analytics 4 tracking
                  if (window.gtag) {
                    const deviceType = window.innerWidth <= 768 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop';
                    window.gtag('event', 'solana_transaction_submitted', {
                      'send_to': 'AW-16826597392',
                      'value': treasuryFee,
                      'currency': 'USD',
                      'device_category': deviceType,
                      'transaction_id': signature,
                      'items': [{
                        'id': mint.toString(),
                        'name': formData.name,
                        'category': 'SPL Token',
                        'quantity': 1,
                        'price': treasuryFee
                      }]
                    });
                    console.log('Enhanced conversion event tracked with device:', deviceType);
                  }
                  
                  // Push to dataLayer for Google Tag Manager
                  if (window.dataLayer === undefined) {
                    window.dataLayer = [];
                  }
                  window.dataLayer.push({
                    'event': 'solana_transaction_submitted',
                    'transactionValue': treasuryFee,
                    'transactionId': signature,
                    'tokenName': formData.name,
                    'tokenSymbol': formData.symbol,
                    'tokenMint': mint.toString(),
                    'walletAddress': publicKey.toString()
                  });
                  console.log('DataLayer event pushed for GTM tracking');
                }
              } else if (txStatus.value.err) {
                clearInterval(checkInterval);
                console.error('Transaction failed on chain:', txStatus.value.err);
                setStatus('error');
                setErrors({ general: 'Transaction failed on chain: ' + JSON.stringify(txStatus.value.err) });
              }
            } else if (checkAttempts > 30) {
              // After 30 attempts (30 seconds), suggest manual check
              clearInterval(checkInterval);
              console.log('Manual confirmation checks exceeded - transaction might be slow to confirm');
              // We don't change the status - leave it as pending_confirmation
            }
          } catch (error) {
            console.warn('Error checking transaction status:', error);
          }
        }, 1000); // Check every second
      } else if (result.status === 'failed') {
        throw new Error('Transaction failed on-chain');
      }

      // ===== STEP 6: SAVE TOKEN DATA =====
      setMintAddress(mint.toString());
      setStatus(result.status === 'pending' ? 'pending_confirmation' : 'success');

      // Save token creation data to localStorage for the recent tokens display
      const newToken = {
        name: formData.name,
        symbol: formData.symbol,
        mintAddress: mint.toString(),
        image: imagePreview, // Store the image preview URL
        timestamp: Date.now()
      };
      
      try {
        // Get existing tokens or initialize empty array
        const existingTokens = JSON.parse(localStorage.getItem('recentTokens') || '[]');
        
        // Add new token to the beginning of the array (most recent first)
        const updatedTokens = [newToken, ...existingTokens].slice(0, 5); // Keep only 5 most recent
        
        // Save back to localStorage
        localStorage.setItem('recentTokens', JSON.stringify(updatedTokens));
        console.log('Token saved to local storage:', newToken);
        
        // Only save to the database if transaction has a signature 
        // This prevents partial/failed transactions from being saved
        if (signature) {
          console.log('Saving token to database with signature:', signature.substring(0, 10) + '...');
          
          // Also save token to the database via API
          fetch(API_ENDPOINTS.saveToken, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mintAddress: mint.toString(),
              creatorWallet: publicKey.toString(),
              ownerAddress: publicKey.toString(), // Set owner address explicitly
              name: formData.name,
              symbol: formData.symbol,
              description: formData.description || `${formData.name} token on Solana`,
              imageUrl: formattedImageUrl, // Use the formatted IPFS URL
              solscanUrl: `https://solscan.io/token/${mint.toString()}`,
              explorerUrl: `https://explorer.solana.com/address/${mint.toString()}`,
              decimals: parseInt(formData.decimals), 
              supply: formData.supply,
              timestamp: new Date().toISOString(),
              hasMintAuthority: !formData.revokeMintAuthority,
              hasFreezeAuthority: !formData.revokeFreezeAuthority
            }),
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              console.log('Token saved to database:', data.message);
            } else {
              console.error('Failed to save token to database:', data.error);
            }
          })
          .catch(error => {
            console.error('Error saving token to database:', error);
          });
        } else {
          console.warn('Not saving to database - missing transaction signature');
        }
      } catch (error) {
        console.error('Error saving token data:', error);
      }

      // ===== STEP 7: RESET FORM =====
      // Reset form and image preview
      setFormData({
        name: '',
        symbol: '',
        decimals: '',
        supply: '',
        description: '',
        image: null,
        revokeFreezeAuthority: true,
        revokeMintAuthority: false,
      });
      setPromoCode('');
      setAppliedPromo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setImagePreview(null);
      setMintKeypair(Keypair.generate());
    } catch (error) {
      console.error('Error creating token:', error);
      setStatus('error');
      setErrors({ general: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
  };

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Replace the problematic useEffect with a fixed version
  useEffect(() => {
    // Check if we're returning from a Solflare deeplink transaction
    if (typeof window !== 'undefined') {
      const session = searchParams.get('session');
      const signature = searchParams.get('signature');
      
      if (session && signature) {
        console.log('Detected Solflare callback with signature:', signature);
        
        // Post message to parent window with signature and session
        if (window.opener) {
          window.opener.postMessage({
            session,
            signature
          }, window.location.origin);
          
          // Close popup window if this is one
          window.close();
        }
      }
    }
  }, [searchParams]);

  // Add progress tracking
  useEffect(() => {
    // Calculate form progress
    const newProgress = {
      basicInfo: !!(formData.name && formData.symbol && formData.decimals && formData.supply),
      imageUploaded: !!formData.image,
      authoritySet: true,
      ready: !!(formData.name && formData.symbol && formData.decimals && formData.supply && formData.image)
    };
    
    // Only update if progress actually changed
    if (JSON.stringify(newProgress) !== JSON.stringify(formProgress)) {
      setFormProgress(newProgress);

      // Track form progress events
      if (typeof window !== 'undefined' && window.gtag) {
        const deviceType = window.innerWidth <= 768 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop';
        
        // Track when basic info is completed
        if (newProgress.basicInfo && !formProgress.basicInfo) {
          window.gtag('event', 'basic_info_completed', {
            'send_to': 'AW-16826597392',
            'device_category': deviceType
          });
        }
        
        // Track when image is uploaded
        if (newProgress.imageUploaded && !formProgress.imageUploaded) {
          window.gtag('event', 'image_uploaded', {
            'send_to': 'AW-16826597392',
            'device_category': deviceType
          });
        }
        
        // Track when form is ready for submission
        if (newProgress.ready && !formProgress.ready) {
          window.gtag('event', 'form_ready', {
            'send_to': 'AW-16826597392',
            'device_category': deviceType
          });
        }
      }
    }
  }, [formData, formProgress]); // Add formProgress to the dependency array

  // Track form engagement time
  useEffect(() => {
    const startTime = Date.now();
    let engaged = false;
    let formElement: HTMLFormElement | null = null;

    const trackEngagement = () => {
      if (!engaged && typeof window !== 'undefined' && window.gtag) {
        engaged = true;
        const deviceType = window.innerWidth <= 768 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop';
        window.gtag('event', 'form_engagement', {
          'send_to': 'AW-16826597392',
          'device_category': deviceType,
          'engagement_time': Math.round((Date.now() - startTime) / 1000)
        });
      }
    };

    // Find form element once and store it
    formElement = document.querySelector('form');
    if (formElement) {
      formElement.addEventListener('input', trackEngagement);
      formElement.addEventListener('click', trackEngagement);
    }

    return () => {
      if (formElement) {
        formElement.removeEventListener('input', trackEngagement);
        formElement.removeEventListener('click', trackEngagement);
      }
    };
  }, []); // Empty dependency array since this should only run once

  // Auto-save draft as user types with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const draftData = {
        name: formData.name,
        symbol: formData.symbol,
        decimals: formData.decimals,
        supply: formData.supply,
        description: formData.description,
        revokeFreezeAuthority: formData.revokeFreezeAuthority,
        revokeMintAuthority: formData.revokeMintAuthority,
      };
      localStorage.setItem('tokenCreatorDraft', JSON.stringify(draftData));
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [formData]);

  // Fetch recent token count
  useEffect(() => {
    const fetchRecentCount = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.getTokenCount);
        const data = await response.json();
        setRecentTokenCount(data.count || 0);
      } catch (error) {
        console.error('Error fetching token count:', error);
      }
    };
    fetchRecentCount();
    const interval = setInterval(fetchRecentCount, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">Creation Progress</span>
              <span className="text-sm text-white/70">{Math.round((Object.values(formProgress).filter(Boolean).length / 4) * 100)}%</span>
            </div>
            <div className="h-2 bg-black/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#9945FF] to-[#14F195] transition-all duration-500"
                style={{ width: `${(Object.values(formProgress).filter(Boolean).length / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Social proof */}
          {recentTokenCount > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-[#9945FF]/10 border border-[#9945FF]/30">
              <div className="flex items-center gap-2">
                <span className="text-[#9945FF] text-sm">🚀 Join 1000+ creators who launched their tokens</span>
              </div>
            </div>
          )}

          <div className={`${gradientBorder} rounded-2xl shadow-xl`}>
            <div className={`${glassBackground} rounded-2xl p-5 sm:p-8`}>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 bg-gradient-to-r from-[#4F6BFF] to-[#14F195] text-transparent bg-clip-text text-center sm:text-left">
                Create Your Token
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="token-name" className={labelStyle}>Token Name</label>
                    <input
                      id="token-name"
                      type="text"
                      placeholder="e.g. Solana Token"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={`${inputBaseStyle} ${errors.name ? 'ring-2 ring-red-500/50' : ''}`}
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="token-symbol" className={labelStyle}>Symbol</label>
                    <input
                      id="token-symbol"
                      type="text"
                      placeholder="e.g. SOL (max 8 chars)"
                      value={formData.symbol}
                      onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                      className={`${inputBaseStyle} ${errors.symbol ? 'ring-2 ring-red-500/50' : ''}`}
                    />
                    {errors.symbol && <p className="mt-1 text-xs text-red-400">{errors.symbol}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="token-decimals" className={labelStyle}>Decimals</label>
                    <input
                      id="token-decimals"
                      type="number"
                      placeholder="5 or 9 recommended"
                      value={formData.decimals}
                      onChange={(e) => setFormData(prev => ({ ...prev, decimals: e.target.value }))}
                      className={`${inputBaseStyle} ${errors.decimals ? 'ring-2 ring-red-500/50' : ''}`}
                    />
                    {errors.decimals && <p className="mt-1 text-xs text-red-400">{errors.decimals}</p>}
                  </div>
                  <div>
                    <label htmlFor="token-supply" className={labelStyle}>Initial Supply</label>
                    <input
                      id="token-supply"
                      type="number"
                      placeholder="e.g. 1000000"
                      value={formData.supply}
                      onChange={(e) => setFormData(prev => ({ ...prev, supply: e.target.value }))}
                      className={`${inputBaseStyle} ${errors.supply ? 'ring-2 ring-red-500/50' : ''}`}
                    />
                    {errors.supply && <p className="mt-1 text-xs text-red-400">{errors.supply}</p>}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="token-description" className={labelStyle}>Description (optional)</label>
                  <textarea
                    id="token-description"
                    placeholder="Tell the world about your token..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className={`${inputBaseStyle} resize-none min-h-[80px]`}
                  />
                </div>
                
                <div className="relative">
                  <label htmlFor="image-upload" className={labelStyle}>Token Image</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                    accept="image/*"
                  />
                  
                  {imagePreview ? (
                    <div className="flex flex-col sm:flex-row gap-4 items-center p-4 rounded-xl bg-black/40 border border-[#9945FF]/30 overflow-hidden">
                      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-[#14F195]/30 shadow-lg">
                        <Image 
                          src={imagePreview} 
                          alt="Token preview" 
                          className="w-full h-full object-cover"
                          width={96}
                          height={96}
                          unoptimized={imagePreview?.startsWith('data:') || false}
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-1 right-1 bg-black/70 rounded-full p-1 hover:bg-red-500/80 transition-colors"
                          aria-label="Remove image"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <div className="flex-1 w-full text-center sm:text-left overflow-hidden">
                        <div className="mb-1 px-2 py-1 bg-black/30 rounded-md">
                          <p className="text-sm text-white/90 font-medium break-all">
                            {truncateFilename(formData.image?.name || '', 18)}
                          </p>
                        </div>
                        <p className="text-xs text-white/60">
                          {formData.image && (formData.image.size / 1024 < 1024 
                            ? `${(formData.image.size / 1024).toFixed(1)} KB` 
                            : `${(formData.image.size / (1024 * 1024)).toFixed(1)} MB`)}
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 text-xs px-3 py-1.5 rounded bg-[#4F6BFF]/30 hover:bg-[#4F6BFF]/40 text-[#4F6BFF] hover:text-white transition-colors"
                        >
                          Choose Different Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="image-upload"
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                      className={`
                        flex flex-col items-center justify-center w-full px-4 py-8 rounded-xl
                        ${glassBackground} border-2 border-dashed border-[#9945FF]/30 cursor-pointer
                        hover:border-[#14F195]/50 transition-all duration-200
                        ${errors.image ? 'ring-2 ring-red-500/50' : ''}
                      `}
                    >
                      <Upload className={`w-8 h-8 mb-3 transition-colors duration-200 ${isHovering ? 'text-[#14F195]' : 'text-white/70'}`} />
                      <div className="flex flex-col items-center">
                        <span className={`transition-colors duration-200 ${isHovering ? 'text-[#14F195]' : 'text-white/80'} font-medium`}>
                          Upload Token Image
                        </span>
                        <span className="text-xs text-white/50 mt-1">
                          PNG, JPG, or SVG (recommended: 512×512px)
                        </span>
                      </div>
                    </label>
                  )}
                  {errors.image && <p className="mt-1 text-xs text-red-400">{errors.image}</p>}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 p-5 rounded-xl bg-black/30 border border-[#343434]">
                  <div className="bg-[#232323]/50 p-4 rounded-lg border border-[#343434]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/90">Revoke Freeze</span>
                      <span className="text-xs text-[#14F195] font-medium">(required)</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1 mb-3">Required to create a liquidity pool</p>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleToggleFreeze}
                        className={`relative w-12 h-6 rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#9945FF]/30 ${formData.revokeFreezeAuthority ? 'bg-gradient-to-r from-[#9945FF] to-[#14F195]' : 'bg-[#343434]'}`}
                        aria-pressed={formData.revokeFreezeAuthority}
                        aria-labelledby="freeze-toggle-label"
                      >
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-200 ${formData.revokeFreezeAuthority ? 'left-[calc(100%-1.5rem)]' : 'left-1'}`}
                        />
                      </button>
                      <span className="text-xs text-white/50 font-mono">({formatFee(AUTHORITY_REVOCATION_FEE)} SOL)</span>
                    </div>
                  </div>
                  
                  <div className="bg-[#232323]/50 p-4 rounded-lg border border-[#343434]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/90">Revoke Mint</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1 mb-3">Prevents future supply increases</p>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleToggleMint}
                        className={`relative w-12 h-6 rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#9945FF]/30 ${formData.revokeMintAuthority ? 'bg-gradient-to-r from-[#9945FF] to-[#14F195]' : 'bg-[#343434]'}`}
                        aria-pressed={formData.revokeMintAuthority}
                        aria-labelledby="mint-toggle-label"
                      >
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-200 ${formData.revokeMintAuthority ? 'left-[calc(100%-1.5rem)]' : 'left-1'}`}
                        />
                      </button>
                      <span className="text-xs text-white/50 font-mono">({formatFee(AUTHORITY_REVOCATION_FEE)} SOL)</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-black/20 border border-[#343434]">
                  <div className="flex items-center mb-2">
                    <Zap className="w-4 h-4 text-[#9945FF] mr-2" />
                    <label htmlFor="promo-code" className={`${labelStyle} mb-0`}>Promo Code</label>
                  </div>
                  
                  {appliedPromo ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center bg-[#14F195]/10 px-3 py-2 rounded-lg">
                        <Check className="w-4 h-4 text-[#14F195] mr-2" />
                        <span className="text-sm text-white font-medium">{appliedPromo.code}</span>
                        <span className="ml-2 text-[#14F195] text-xs font-medium px-2 py-0.5 rounded-full bg-[#14F195]/20 border border-[#14F195]/30">
                          {appliedPromo.discountPercentage}% OFF
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromoCode}
                        className="text-xs px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <input
                          id="promo-code"
                          type="text"
                          placeholder="Enter promo code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.trim())}
                          className={`${inputBaseStyle} py-2.5 ${promoError ? 'ring-2 ring-red-500/50' : ''}`}
                        />
                        {promoError && <p className="mt-1 text-xs text-red-400">{promoError}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyPromoCode}
                        disabled={!promoCode.trim()}
                        className={`${buttonBaseStyle} py-2.5 px-4 sm:w-auto whitespace-nowrap
                          ${!promoCode.trim() 
                            ? 'bg-[#343434] text-white/50'
                            : 'bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-[#8935EE] hover:to-[#13E085]'
                          }`}
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  
                  <p className="text-xs text-white/60 mt-2">
                    Enter a valid promo code to get a discount on token creation fees.
                  </p>
                </div>
                
                {connected && estimatedFee && (
                  <div className="mt-6 p-4 rounded-xl bg-[#4F6BFF]/5 border border-[#4F6BFF]/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                      <span className="text-sm font-medium text-white/90">Total Cost:</span>
                      <div className="flex items-center mt-2 sm:mt-0">
                        {appliedPromo && originalFee && (
                          <span className="text-white/60 line-through font-mono mr-2 text-sm">
                            {formatFee(originalFee)} SOL
                          </span>
                        )}
                        <span className="text-[#14F195] font-mono font-semibold">{estimatedFee} SOL</span>
                      </div>
                    </div>
                    <p className="text-xs text-white/60 mt-2">
                      This covers all-inclusive creation costs on Solana mainnet and ensures your token&apos;s long-term security. 
                      Authority revocation fees support enhanced token protections for your community.
                    </p>
                  </div>
                )}
                
                {/* Submit button - Now INSIDE the card UI */}
                <button
                  type="submit"
                  disabled={isUploading || isProcessing || !connected}
                  className={`${buttonBaseStyle} mt-4 text-base font-semibold shadow-lg ${
                    !connected 
                      ? 'bg-[#343434] text-white/50'
                      : isUploading || isProcessing
                        ? 'bg-gradient-to-r from-[#9945FF]/50 to-[#14F195]/50 cursor-wait'
                        : 'bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-[#8935EE] hover:to-[#13E085] transform hover:-translate-y-0.5'
                  }`}
                >
                  <span className={`flex items-center justify-center gap-2 ${(isUploading || isProcessing) ? 'animate-pulse' : ''}`}>
                    {!connected ? (
                      'Connect Wallet to Create'
                    ) : isUploading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading {uploadProgress.progress}%
                      </>
                    ) : isProcessing ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating Token...
                      </>
                    ) : (
                      'Create Token'
                    )}
                  </span>
                </button>

                {/* Status messages - Now INSIDE the card UI */}
                {status && status.includes('success') ? (
                  <div className="mt-6 p-5 rounded-xl bg-[#14F195]/10 border border-[#14F195]/30 shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[#14F195] font-medium">✨ Token created successfully!</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-white/70 text-sm font-medium">Token Address:</span>
                        <code className="text-[#14F195] text-sm font-mono bg-black/30 px-2 py-1 rounded break-all">
                          {mintAddress}
                        </code>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <a 
                          href={`https://solscan.io/token/${mintAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20 hover:from-[#9945FF]/30 hover:to-[#14F195]/30 text-white transition-colors duration-200 rounded-lg text-sm font-medium border border-[#14F195]/30"
                        >
                          View on Solscan →
                        </a>
                        <a 
                          href={`https://explorer.solana.com/address/${mintAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-[#4F6BFF]/20 text-[#4F6BFF] hover:text-[#14F195] transition-colors duration-200 rounded-lg text-sm font-medium border border-[#4F6BFF]/30"
                        >
                          View on Explorer
                        </a>
                      </div>
                    </div>
                  </div>
                ) : status && status.includes('pending_confirmation') ? (
                  <div className="mt-6 p-5 rounded-xl bg-[#4F6BFF]/10 border border-[#4F6BFF]/30 shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="animate-spin h-5 w-5 text-[#4F6BFF]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-[#4F6BFF] font-medium">Transaction pending confirmation...</span>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-white/70">
                        Your token has been created and the transaction has been submitted to the Solana network. 
                        It may take a few moments to be confirmed.
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-white/70 text-sm font-medium">Token Address:</span>
                        <code className="text-[#4F6BFF] text-sm font-mono bg-black/30 px-2 py-1 rounded break-all">
                          {mintAddress}
                        </code>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <a 
                          href={`https://explorer.solana.com/address/${mintAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-[#4F6BFF]/20 text-[#4F6BFF] hover:text-white transition-colors duration-200 rounded-lg text-sm font-medium border border-[#4F6BFF]/30"
                        >
                          View on Explorer
                        </a>
                        <button
                          onClick={() => window.location.reload()}
                          className="inline-block px-4 py-2 bg-[#9945FF]/20 text-[#9945FF] hover:text-white transition-colors duration-200 rounded-lg text-sm font-medium border border-[#9945FF]/30"
                        >
                          Refresh Page
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              // Let's try to resubmit the transaction with the direct approach
                              setStatus('Preparing to retry transaction...');
                              
                              // Make sure we have the required data
                              if (!lastMetadataUri || !publicKey) {
                                throw new Error('Missing required data for retry');
                              }
                              
                              console.log('Creating a fresh transaction for retry...');
                              
                              // Re-create token transaction from scratch
                              const { transaction: retryTx } = await createTokenTransactionWithoutMint(
                                connection,
                                publicKey,
                                {
                                  name: formData.name,
                                  symbol: formData.symbol,
                                  uri: lastMetadataUri,
                                  decimals: parseInt(formData.decimals),
                                  amount: lastSupply,
                                  revokeFreezeAuthority: formData.revokeFreezeAuthority,
                                  revokeMintAuthority: formData.revokeMintAuthority,
                                  mint: mintKeypair.publicKey,
                                  customTreasuryFee: lastTreasuryFee
                                }
                              );
                              
                              // Add a higher compute budget as the first instruction
                              const originalInstructions = [...retryTx.instructions];
                              retryTx.instructions = [];
                              
                              // Add compute budget first
                              retryTx.add(
                                ComputeBudgetProgram.setComputeUnitLimit({
                                  units: 350000 // Much higher for retry
                                })
                              );
                              
                              // Add all the original instructions back
                              for (const instr of originalInstructions) {
                                if (instr.programId.toString() !== 'ComputeBudget111111111111111111111111111111') {
                                  retryTx.add(instr);
                                }
                              }
                              
                              // Get a fresh blockhash
                              const { blockhash } = await connection.getLatestBlockhash('finalized');
                              retryTx.recentBlockhash = blockhash;
                              
                              // Safely set the fee payer
                              if (!publicKey) {
                                throw new Error('Wallet not connected');
                              }
                              retryTx.feePayer = publicKey;
                              
                              // Sign with the mint keypair
                              const mintKeypairForSigning = Keypair.fromSecretKey(mintKeypair.secretKey);
                              retryTx.partialSign(mintKeypairForSigning);
                              
                              // Send directly via the wallet adapter
                              console.log('Sending retry transaction directly via wallet adapter...');
                              
                              setStatus('Please approve the retry transaction...');
                              
                              // This will both sign with the user wallet and send the transaction in one step
                              const signature = await wallet?.adapter.sendTransaction(retryTx, connection, {
                                skipPreflight: true, // Skip preflight on retry
                                preflightCommitment: 'confirmed',
                                maxRetries: 5
                              });
                              
                              if (!signature) {
                                throw new Error('Failed to get transaction signature');
                              }
                              
                              console.log('Retry transaction submitted, signature:', signature);
                              setStatus('Transaction resubmitted, waiting for confirmation...');
                              
                              // Check for confirmation (limited attempts)
                              let confirmed = false;
                              for (let i = 0; i < 10; i++) {
                                try {
                                  await new Promise(r => setTimeout(r, 1000));
                                  const status = await connection.getSignatureStatus(signature);
                                  
                                  if (status && status.value) {
                                    if (status.value.confirmationStatus === 'confirmed' || 
                                        status.value.confirmationStatus === 'finalized') {
                                      confirmed = true;
                                      break;
                                    }
                                    
                                    if (status.value.err) {
                                      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
                                    }
                                  }
                                } catch (err) {
                                  console.warn('Error checking status:', err);
                                }
                              }
                              
                              if (confirmed) {
                                setStatus('success');
                                
                                // Record promo code usage if a code was applied
                                if (appliedPromo) {
                                  try {
                                    await recordPromoCodeUsage(appliedPromo.code);
                                    console.log('Promo code usage recorded:', appliedPromo.code);
                                  } catch (e) {
                                    console.warn('Failed to record promo code usage:', e);
                                  }
                                }
                              } else {
                                setStatus('Transaction resubmitted, but confirmation is still pending.');
                              }
                            } catch (error) {
                              console.error('Error resubmitting transaction:', error);
                              setStatus('Resubmission error: ' + (error instanceof Error ? error.message : String(error)));
                            }
                          }}
                          className="inline-block px-4 py-2 bg-[#FF6B4F]/20 text-[#FF6B4F] hover:text-white transition-colors duration-200 rounded-lg text-sm font-medium border border-[#FF6B4F]/30"
                        >
                          Retry Transaction
                        </button>
                      </div>
                    </div>
                  </div>
                ) : status && (
                  <div className={`
                    mt-4 p-4 rounded-lg text-sm shadow-lg
                    ${status.includes('Error') 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                      : 'bg-white/5 text-white/70 border border-white/10'
                    }
                  `}>
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {status}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TokenCreator;

