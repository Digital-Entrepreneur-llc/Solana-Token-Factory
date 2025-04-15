/**
 * Utility functions to fetch token data from Solscan API
 */

/**
 * Interface for token metadata returned from Solscan
 */
export interface SolscanTokenData {
  success: boolean;
  data?: {
    symbol?: string;
    name?: string;
    decimals?: number;
    icon?: string;
    address?: string;
    totalSupply?: string;
    mintAuthority?: string;
    freezeAuthority?: string;
    supply?: string;
  };
  error?: string;
}

/**
 * Interface for token data from our PHP API
 */
export interface PhpTokenData {
  success: boolean;
  tokens: {
    mintAddress: string;
    name: string;
    symbol: string;
    description?: string;
    imageUrl?: string | null;
    solscanUrl?: string;
    explorerUrl?: string;
    decimals?: number;
    supply?: string;
    creatorWallet?: string;
    hasMintAuthority?: boolean;
    hasFreezeAuthority?: boolean;
    timestamp: number;
  }[];
  count: number;
  api_version: string;
}

/**
 * Interface for token data that will be displayed in the UI
 */
export interface TokenDisplayData {
  // Basic token info
  name: string;
  symbol: string;
  mintAddress: string;
  image?: string | null;
  timestamp: number;
  
  // Extended token info
  description?: string;
  solscanUrl?: string;
  explorerUrl?: string;
  decimals?: number;
  supply?: string;
  creatorWallet?: string;
  hasMintAuthority?: boolean;
  hasFreezeAuthority?: boolean;
  
  // Source tracking
  realData?: boolean;
  fromPhpApi?: boolean;
  fromSolscanApi?: boolean;
}

/**
 * Fetches token data from Solscan API
 * @param tokenAddress The mint address of the token to fetch
 * @returns TokenDisplayData with token information
 */
export async function fetchTokenData(tokenAddress: string): Promise<TokenDisplayData | null> {
  try {
    // Fetch token data from Solscan API
    const response = await fetch(`https://api.solscan.io/token/meta?token=${tokenAddress}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch token data:', response.statusText);
      return null;
    }

    const data: SolscanTokenData = await response.json();
    
    if (!data.success || !data.data) {
      console.error('Invalid token data response:', data.error || 'Unknown error');
      return null;
    }

    // Construct token display data
    return {
      name: data.data.name || 'Unknown Token',
      symbol: data.data.symbol || '???',
      mintAddress: tokenAddress,
      image: data.data.icon || null,
      timestamp: Date.now(),
      decimals: data.data.decimals,
      supply: data.data.supply || data.data.totalSupply,
      hasMintAuthority: !!data.data.mintAuthority,
      hasFreezeAuthority: !!data.data.freezeAuthority,
      solscanUrl: `https://solscan.io/token/${tokenAddress}`,
      explorerUrl: `https://explorer.solana.com/address/${tokenAddress}`,
      realData: true,
      fromSolscanApi: true
    };
  } catch (error) {
    console.error('Error fetching token data:', error);
    return null;
  }
}

/**
 * Fetches token data for multiple tokens
 * @param tokenAddresses Array of token addresses to fetch
 * @returns Array of TokenDisplayData objects
 */
export async function fetchMultipleTokens(tokenAddresses: string[]): Promise<TokenDisplayData[]> {
  const tokenPromises = tokenAddresses.map(address => fetchTokenData(address));
  const tokens = await Promise.all(tokenPromises);
  
  // Filter out any null values (failed fetches)
  return tokens.filter((token): token is TokenDisplayData => token !== null);
}

/**
 * Converts PHP API token data to TokenDisplayData format
 * @param phpToken Token data from PHP API
 * @returns TokenDisplayData object
 */
export function convertPhpTokenToDisplayData(phpToken: PhpTokenData['tokens'][0]): TokenDisplayData {
  // Handle potentially problematic image URLs
  let safeImageUrl = phpToken.imageUrl;
  
  if (safeImageUrl) {
    // Skip extremely long data URLs (likely base64 encoded images)
    if (safeImageUrl.startsWith('data:') && safeImageUrl.length > 1000) {
      console.warn('Skipping oversized data URL image for token:', phpToken.mintAddress);
      safeImageUrl = null;
    }
    
    // Handle ipfs:// protocol URLs
    if (safeImageUrl && safeImageUrl.startsWith('ipfs:/')) {
      const cid = safeImageUrl.replace('ipfs:/', '').replace('ipfs://', '');
      safeImageUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    }
  }
  
  return {
    name: phpToken.name || 'Unknown Token',
    symbol: phpToken.symbol || '???',
    mintAddress: phpToken.mintAddress,
    image: safeImageUrl,
    timestamp: phpToken.timestamp || Date.now(),
    description: phpToken.description,
    solscanUrl: phpToken.solscanUrl || `https://solscan.io/token/${phpToken.mintAddress}`,
    explorerUrl: phpToken.explorerUrl || `https://explorer.solana.com/address/${phpToken.mintAddress}`,
    decimals: phpToken.decimals,
    supply: phpToken.supply,
    creatorWallet: phpToken.creatorWallet,
    hasMintAuthority: phpToken.hasMintAuthority,
    hasFreezeAuthority: phpToken.hasFreezeAuthority,
    realData: true,
    fromPhpApi: true
  };
} 