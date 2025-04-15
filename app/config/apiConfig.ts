'use client';

/**
 * Configuration for API endpoints
 * This ensures consistent API URL usage throughout the application
 */

// Detect environment (client-side only)
const isDevelopment = process.env.NODE_ENV === 'development';
const isClient = typeof window !== 'undefined';

// Base URL for API calls - now PHP files are used directly in both environments
export const getApiBaseUrl = (): string => {
  // When running on client-side
  if (isClient) {
    const origin = window.location.origin;
    
    if (isDevelopment) {
      // In development, we can use relative paths
      return '/api';
    } else {
      // In production, use direct path to PHP files
      return `${origin}/api`;
    }
  }
  
  // Server-side rendering fallback (though we're using client-side only)
  return '/api';
};

// API endpoints
export const API_ENDPOINTS = {
  getTokens: `${getApiBaseUrl()}/get_tokens.php`,
  saveToken: `${getApiBaseUrl()}/save_token.php`,
  getTokenCount: `${getApiBaseUrl()}/get_tokens.php/count`,
  getPromoCodes: `${getApiBaseUrl()}/get_promo_codes.php`,
  usePromoCode: `${getApiBaseUrl()}/use_promo_code.php`,
};

/**
 * Get API URL with parameters
 * @param endpoint Base endpoint URL
 * @param params Query parameters object
 * @returns Full URL with query parameters
 */
export const getApiUrl = (endpoint: string, params: Record<string, string | number> = {}): string => {
  const url = new URL(endpoint, isClient ? window.location.origin : undefined);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  
  return url.toString();
};

// Create the API object
const apiConfig = { 
  getApiBaseUrl, 
  API_ENDPOINTS, 
  getApiUrl 
};

export default apiConfig; 