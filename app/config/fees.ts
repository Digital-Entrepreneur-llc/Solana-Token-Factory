/**
 * Centralized fee configuration
 * All fee-related constants should be defined here and imported by other components
 */

// Base fee for token creation
export const BASE_TOKEN_FEE = 0.3; // SOL

// Fee for revoking each authority
export const AUTHORITY_REVOCATION_FEE = 0.1; // SOL 

// Calculate total fee based on authority revocations
export const calculateTotalFee = (revokeFreezeAuthority: boolean, revokeMintAuthority: boolean): number => {
  let totalFee = BASE_TOKEN_FEE;
  if (revokeFreezeAuthority) totalFee += AUTHORITY_REVOCATION_FEE;
  if (revokeMintAuthority) totalFee += AUTHORITY_REVOCATION_FEE;
  return totalFee;
};

// Format fee to display with 4 decimal places but remove trailing zeros
export const formatFee = (fee: number): string => {
  // First convert to 4 decimal places
  const formatted = fee.toFixed(4);
  // Then remove trailing zeros after decimal point
  return formatted.replace(/\.?0+$/, '');
}; 