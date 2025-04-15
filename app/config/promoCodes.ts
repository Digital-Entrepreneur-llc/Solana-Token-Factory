'use client';

import { API_ENDPOINTS, getApiUrl } from './apiConfig';

/**
 * Promo code configuration for token creation discounts
 */

// Define promo code details
export interface PromoCode {
  code: string;
  discountPercentage: number;
  maxUses?: number;
  usesCount?: number;
  expiryDate?: Date;
  description: string;
  isActive?: boolean;
}

// Response from the API when fetching promo codes
interface PromoCodeApiResponse {
  success: boolean;
  promoCodes: PromoCode[];
  count: number;
  api_version: string;
  message?: string;
}

// Response from the API when using a promo code
interface UsePromoCodeResponse {
  success: boolean;
  message: string;
  code: string;
  remainingUses?: number | null;
  api_version: string;
}

// In-memory cache for valid promo codes to reduce API calls
let cachedPromoCodes: Record<string, PromoCode> = {};
let lastFetchTime = 0;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch promo codes from the API
 * @returns Promise with promo codes record
 */
export const fetchPromoCodes = async (): Promise<Record<string, PromoCode>> => {
  try {
    // Use cache if available and not expired
    const now = Date.now();
    if (Object.keys(cachedPromoCodes).length > 0 && now - lastFetchTime < CACHE_EXPIRY) {
      return cachedPromoCodes;
    }

    // Fetch from API
    const response = await fetch(API_ENDPOINTS.getPromoCodes);
    
    if (!response.ok) {
      console.error('Failed to fetch promo codes:', response.statusText);
      return {};
    }
    
    const data: PromoCodeApiResponse = await response.json();
    
    if (!data.success) {
      console.error('Failed to fetch promo codes:', data.message || 'Unknown error');
      return {};
    }
    
    // Convert array to record
    const promoCodes: Record<string, PromoCode> = {};
    data.promoCodes.forEach((code: PromoCode) => {
      promoCodes[code.code] = code;
    });
    
    // Update cache
    cachedPromoCodes = promoCodes;
    lastFetchTime = now;
    
    return promoCodes;
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    return {};
  }
};

/**
 * Validate a promo code
 * @param code The promo code to validate
 * @returns The promo code details if valid, null otherwise
 */
export const validatePromoCode = async (code: string): Promise<PromoCode | null> => {
  if (!code) return null;
  
  const normalizedCode = code.trim().toUpperCase();
  
  try {
    // Check if we have the code in cache
    if (cachedPromoCodes[normalizedCode]) {
      return cachedPromoCodes[normalizedCode];
    }
    
    // Fetch specific code from API
    const response = await fetch(getApiUrl(API_ENDPOINTS.getPromoCodes, { code: normalizedCode }));
    
    if (!response.ok) {
      console.error('Failed to validate promo code:', response.statusText);
      return null;
    }
    
    const data: PromoCodeApiResponse = await response.json();
    
    if (!data.success || data.promoCodes.length === 0) {
      console.log('Invalid promo code:', normalizedCode);
      return null;
    }
    
    const promoCode = data.promoCodes[0];
    
    // Update cache with this code
    cachedPromoCodes[normalizedCode] = promoCode;
    
    return promoCode;
  } catch (error) {
    console.error('Error validating promo code:', error);
    return null;
  }
};

/**
 * Record usage of a promo code
 * @param code The promo code that was used
 * @returns Whether the usage was successfully recorded
 */
export const recordPromoCodeUsage = async (code: string): Promise<boolean> => {
  if (!code) return false;
  
  try {
    const response = await fetch(API_ENDPOINTS.usePromoCode, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      console.error('Failed to record promo code usage:', response.statusText);
      return false;
    }
    
    const data: UsePromoCodeResponse = await response.json();
    
    if (data.success) {
      // Clear the code from cache so it's re-validated next time
      delete cachedPromoCodes[code];
      return true;
    } else {
      console.error('Failed to record promo code usage:', data.message);
      return false;
    }
  } catch (error) {
    console.error('Error recording promo code usage:', error);
    return false;
  }
};

/**
 * Apply discount to a fee amount
 * @param amount The original fee amount
 * @param promoCode The promo code to apply
 * @returns The discounted amount
 */
export const applyDiscount = (amount: number, promoCode: PromoCode): number => {
  if (!promoCode) return amount;
  
  const discount = (promoCode.discountPercentage / 100) * amount;
  return Math.max(0, amount - discount);
}; 