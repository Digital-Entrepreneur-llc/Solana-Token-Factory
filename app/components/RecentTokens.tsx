'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, ExternalLink, RefreshCw, Sparkle, ShieldCheck, AlertCircle } from 'lucide-react';
import { 
  TokenDisplayData, 
  PhpTokenData,
  convertPhpTokenToDisplayData
} from '@/app/utils/fetchTokenData';
import { API_ENDPOINTS, getApiUrl } from '@/app/config/apiConfig';
import Image from 'next/image';

// Define TokenData type alias based on TokenDisplayData
type TokenData = TokenDisplayData;

// Default tokens to show if no API or localStorage data
const DEFAULT_TOKENS: TokenDisplayData[] = [
  { mintAddress: "EeyVCErJzrLZUDW7W6nWaF8ZwGPZf3SSFSADNf3dh1y4", name: "User Token 1", symbol: "UT1", timestamp: Date.now() - 1000 * 60 * 5 },
  { mintAddress: "CRKJmiS9hrJMGNoVdQTeJhzYyd2fvzQ2rYUBCwo1qeVY", name: "User Token 2", symbol: "UT2", timestamp: Date.now() - 1000 * 60 * 10 },
  { mintAddress: "7xoNJP3ELa2KRfkMvYx2xVDvNpxG1wMXKKVz5wB2fjR5", name: "User Token 3", symbol: "UT3", timestamp: Date.now() - 1000 * 60 * 15 }
];

// Maximum number of tokens to display
const MAX_TOKENS = 5;

// Create a custom event to trigger refresh after token creation
export const tokenCreatedEvent = new Event('tokenCreated');

export const RecentTokens = () => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiMode, setApiMode] = useState<'php' | 'local'>('php');
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  
  // Function to load tokens with proper fallbacks
  const loadTokens = useCallback(async (forceCacheBust = false) => {
    setLoading(true);
    setError(null);
    
    // Load tokens from the PHP API
    const loadTokensFromPhpApi = async (): Promise<TokenData[]> => {
      console.log('Loading tokens from PHP API...');
      
      try {
        // Add timestamp to create a cache-busting effect
        const params: Record<string, string | number> = { limit: 5 };
        if (forceCacheBust) {
          params._t = Date.now();
        }
        
        // Fetch tokens from the PHP API
        const response = await fetch(getApiUrl(API_ENDPOINTS.getTokens, params));
        
        if (!response.ok) {
          console.error('API request failed with status:', response.status);
          throw new Error(`API request failed with status: ${response.status}`);
        }
        
        // Make sure we have a JSON response
        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('API response not in JSON format:', contentType);
          throw new Error('API response not in JSON format');
        }
        
        // Parse the response
        const data: PhpTokenData = await response.json();
        
        if (!data.success || !data.tokens || data.tokens.length === 0) {
          console.error('No tokens returned from API');
          throw new Error('No tokens returned from API');
        }
        
        console.log('Successfully loaded tokens from PHP API:', data.tokens.length);
        
        // Convert PHP token data to our display format
        return data.tokens.map(token => convertPhpTokenToDisplayData(token));
      } catch (error) {
        console.error('Error loading tokens from PHP API:', error);
        throw error;
      }
    };
    
    // Load tokens from localStorage
    const loadTokensFromLocalStorage = (): TokenData[] => {
      console.log('Loading tokens from localStorage...');
      const savedTokens = localStorage.getItem('recentTokens');
      
      if (!savedTokens) {
        console.log('No tokens found in localStorage');
        return [];
      }
      
      try {
        const parsedTokens = JSON.parse(savedTokens);
        
        if (!Array.isArray(parsedTokens) || parsedTokens.length === 0) {
          console.log('Invalid or empty token data in localStorage');
          return [];
        }
        
        console.log('Successfully loaded tokens from localStorage:', parsedTokens.length);
        // Sort by timestamp descending and limit to MAX_TOKENS
        return parsedTokens
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_TOKENS);
      } catch (error) {
        console.error('Error parsing localStorage tokens:', error);
        return [];
      }
    };
    
    try {
      let loadedTokens: TokenData[] = [];
      
      // Try PHP API first if we're in PHP mode
      if (apiMode === 'php') {
        try {
          loadedTokens = await loadTokensFromPhpApi();
          
          if (loadedTokens.length > 0) {
            setTokens(loadedTokens.slice(0, MAX_TOKENS));
            setLoading(false);
            setLastRefresh(Date.now());
            return;
          }
        } catch (apiError) {
          console.error('PHP API error, falling back to localStorage:', apiError);
          setApiMode('local'); // Switch to local mode
        }
      }
      
      // If PHP API failed or we're in local mode, try localStorage
      loadedTokens = loadTokensFromLocalStorage();
      
      if (loadedTokens.length > 0) {
        setTokens(loadedTokens.slice(0, MAX_TOKENS));
        setLoading(false);
        setLastRefresh(Date.now());
        return;
      }
      
      // If no tokens in localStorage, use default tokens
      console.log('Using default token data');
      setTokens(DEFAULT_TOKENS.slice(0, MAX_TOKENS));
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Error loading token data:', error);
      setError('Failed to load token data. Using fallback data.');
      setTokens(DEFAULT_TOKENS.slice(0, MAX_TOKENS));
    } finally {
      setLoading(false);
    }
  }, [apiMode]);

  // Load tokens on component mount
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined') {
      loadTokens(true); // Force cache-busting on initial load
      
      // Register event listener for token creation
      window.addEventListener('tokenCreated', () => {
        console.log('Token created event detected, refreshing token list');
        loadTokens(true);
      });
      
      return () => {
        window.removeEventListener('tokenCreated', () => {
          loadTokens(true);
        });
      };
    }
  }, [loadTokens]);
  
  // Set up automatic refresh interval (every 60 seconds for component-only refresh)
  useEffect(() => {
    if (!isClient) return;
    
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing token list');
      loadTokens(true); // Force cache-busting on auto-refresh
    }, 60000); // Refresh every 60 seconds
    
    return () => clearInterval(refreshInterval);
  }, [isClient, loadTokens]);
  
  const handleRefresh = () => {
    if (!isClient || loading) return;
    
    // Reset API mode on manual refresh to try PHP again
    setApiMode('php');
    
    // Clear localStorage cache
    if (typeof window !== 'undefined') {
      // Clear localStorage cache of tokens
      localStorage.removeItem('recentTokens');
      
      // Force a reload with cache busting
      loadTokens(true);
    }
  };
  
  if (!isClient) {
    return (
      <div className="container mx-auto mt-8 mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Recently Created Tokens</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="overflow-hidden bg-[#1B1B1B] rounded-lg border border-[#343434] p-4">
              <div className="p-4">
                <div className="h-6 w-3/4 bg-[#232323] animate-pulse rounded"></div>
              </div>
              <div className="p-4 pt-0">
                <div className="h-32 w-full mb-4 bg-[#232323] animate-pulse rounded"></div>
                <div className="h-4 w-full mb-2 bg-[#232323] animate-pulse rounded"></div>
                <div className="h-4 w-2/3 bg-[#232323] animate-pulse rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (loading) {
    return <div className="animate-pulse">Loading recent tokens...</div>;
  }
  
  if (error) {
    return <div className="text-red-400 text-sm">Error loading tokens</div>;
  }
  
  if (!tokens || tokens.length === 0) {
    return null; // Don't show anything if no tokens
  }
  
  return (
    <section id="recent-tokens" className="bg-[#1B1B1B]/90 p-6 rounded-2xl shadow-xl border border-transparent bg-gradient-to-r from-[#9945FF]/40 to-[#14F195]/40 bg-origin-border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#4F6BFF] to-[#14F195] text-transparent bg-clip-text flex items-center">
          <Clock className="w-5 h-5 mr-2 text-[#14F195]" />
          Recently Created Tokens
          {apiMode === 'local' && (
            <span className="ml-2 text-xs text-white/60 font-normal bg-red-500/20 px-2 py-0.5 rounded">Local Mode</span>
          )}
        </h2>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-white/40">
            {lastRefresh ? `Updated ${timeAgo(lastRefresh)}` : ''}
          </span>
          <button 
            onClick={handleRefresh} 
            disabled={loading}
            className="p-1.5 rounded-full bg-[#232323] hover:bg-[#343434] transition-colors"
            title="Refresh token data"
          >
            <RefreshCw className={`w-4 h-4 text-[#14F195] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {error && (
        <div className="text-center py-3 text-red-400 text-sm bg-red-900/20 rounded-lg">
          {error} <button onClick={handleRefresh} className="underline ml-1">Retry</button>
        </div>
      )}
      
      <div className="space-y-3">
        {tokens.length > 0 ? (
          tokens.map((token) => (
            <a 
              key={token.mintAddress} 
              href={token.solscanUrl || `https://solscan.io/token/${token.mintAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-3 bg-black/30 rounded-lg hover:bg-black/40 transition-colors group"
            >
              <div className="w-8 h-8 mr-3 rounded-full overflow-hidden bg-[#232323] flex-shrink-0 flex items-center justify-center">
                {token.image ? (
                  <div className="relative w-full h-full">
                    <Image 
                      src={token.image} 
                      alt={token.name}
                      fill
                      sizes="32px"
                      className="object-cover"
                      onError={(e) => {
                        // Replace broken image with the first letter of the symbol
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement?.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white/50 font-bold">${token.symbol.substring(0, 1)}</div>`;
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/50 font-bold">
                    {token.symbol.substring(0, 1)}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <p className="text-white font-medium truncate">{token.name}</p>
                  {token.fromPhpApi && <Sparkle className="w-3 h-3 ml-1 text-[#9945FF]" />}
                </div>
                <div className="flex items-center">
                  <p className="text-white/60 text-xs">{token.symbol}</p>
                  {token.description && (
                    <span className="ml-2 text-xs text-white/40 truncate max-w-[150px]">
                      {token.description}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="text-[#14F195] text-xs ml-2 flex items-center">
                  {timeAgo(token.timestamp)}
                  <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="flex items-center gap-1">
                  {token.hasMintAuthority === false && (
                    <div className="flex items-center text-xs bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3 mr-0.5" /> 
                      No mint
                    </div>
                  )}
                  {token.hasFreezeAuthority === false && (
                    <div className="flex items-center text-xs bg-[#14F195]/20 text-[#14F195] px-1.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3 mr-0.5" /> 
                      No freeze
                    </div>
                  )}
                </div>
              </div>
            </a>
          ))
        ) : (
          <div className="text-center py-6 text-white/60">
            No tokens created yet
          </div>
        )}
      </div>
    </section>
  );
};

// Helper function to format time ago
function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }
  
  return 'just now';
}

export default RecentTokens; 