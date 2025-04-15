'use client';

import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { useWallet } from './useWallet';

interface TokenInfo {
  address: PublicKey;
  symbol: string;
  name: string;
  hasMintAuthority: boolean;
}

// Metaplex metadata structure
const METADATA_PREFIX = Buffer.from('metadata');
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

function decodeMetadata(buffer: Buffer): { name: string; symbol: string } {
  try {
    // The buffer layout for token metadata:
    // 1. Key (1 byte)
    // 2. Update authority (32 bytes)
    // 3. Mint (32 bytes)
    // 4. Data length (4 bytes)
    // 5. Name string length (4 bytes)
    // 6. Name string data
    // 7. Symbol string length (4 bytes)
    // 8. Symbol string data
    // 9. Uri string length (4 bytes)
    // 10. Uri string data
    
    let offset = 1 + 32 + 32; // Skip key, update authority, and mint

    // Read name
    const nameLength = buffer.readUInt32LE(offset);
    offset += 4;
    const name = buffer.slice(offset, offset + nameLength).toString('utf8');
    offset += nameLength;

    // Read symbol
    const symbolLength = buffer.readUInt32LE(offset);
    offset += 4;
    const symbol = buffer.slice(offset, offset + symbolLength).toString('utf8');

    console.log('Decoded raw name:', name);
    console.log('Decoded raw symbol:', symbol);

    return {
      name: name.replace(/\0/g, '').trim(),
      symbol: symbol.replace(/\0/g, '').trim()
    };
  } catch (error) {
    console.error('Metadata decoding error:', error);
    return {
      name: 'Unknown Token',
      symbol: 'UNKNOWN'
    };
  }
}

export const useTokensWithAuthority = () => {
  console.log('useTokensWithAuthority hook initialized'); // Initial log
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { publicKey, connection } = useWallet();

  useEffect(() => {
    const fetchTokens = async () => {
      if (!publicKey || !connection) {
        console.log('No wallet connected');
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching tokens for:', publicKey.toString());

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
        );

        console.log(`Found ${tokenAccounts.value.length} token accounts`);

        const results = await Promise.all(
          tokenAccounts.value.map(async (ta) => {
            try {
              const mintAddress = new PublicKey(ta.account.data.parsed.info.mint);
              console.log('Processing mint:', mintAddress.toString());

              const mintInfo = await getMint(connection, mintAddress);
              const hasMintAuthority = mintInfo.mintAuthority?.equals(publicKey) || false;

              if (!hasMintAuthority) {
                console.log('Skipping token - no mint authority');
                return null;
              }

              const [metadataAddress] = PublicKey.findProgramAddressSync(
                [
                  METADATA_PREFIX,
                  METADATA_PROGRAM_ID.toBuffer(),
                  mintAddress.toBuffer(),
                ],
                METADATA_PROGRAM_ID
              );

              let name = 'Unknown Token';
              let symbol = 'UNKNOWN';

              try {
                const metadataAccount = await connection.getAccountInfo(metadataAddress);
                if (metadataAccount) {
                  console.log('Raw metadata buffer:', Array.from(metadataAccount.data));
                  console.log('Found metadata for:', mintAddress.toString());
                  console.log('Metadata data length:', metadataAccount.data.length);
                  
                  const { name: decodedName, symbol: decodedSymbol } = decodeMetadata(metadataAccount.data);
                  console.log('Decoded name:', decodedName);
                  console.log('Decoded symbol:', decodedSymbol);
                  name = decodedName;
                  symbol = decodedSymbol;
                } else {
                  console.log('No metadata account found for:', mintAddress.toString());
                }
              } catch (error) {
                console.error('Metadata fetch error:', error);
              }

              const tokenInfo: TokenInfo = {
                address: mintAddress,
                symbol,
                name,
                hasMintAuthority,
              };

              console.log('Processed token info:', tokenInfo);
              return tokenInfo;

            } catch (error) {
              console.error('Token processing error:', error);
              return null;
            }
          })
        );

        const validTokens = results.filter((token): token is TokenInfo => token !== null);
        console.log('Valid tokens found:', validTokens.length);
        console.log('Valid tokens:', validTokens);
        setTokens(validTokens);

      } catch (error) {
        console.error('Token fetch error:', error);
        setTokens([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, [publicKey, connection]);

  return { tokens, isLoading };
};
