# Correctly Using Phantom & Solflare Wallet Providers

## Key Requirements for Transaction Success

When sending transactions through Phantom or Solflare wallets, there are several critical requirements:

1. **Use the injected provider directly**
   - For Phantom: `window.solana`
   - For Solflare: `window.solflare`

2. **Extract signature correctly from response object**
   - Both providers return: `{ signature: string, publicKey: PublicKey }`
   - Always use `response.signature` to get the transaction signature

3. **Never use the wallet adapter's sendTransaction method**
   - While the adapter works for connecting, it may fail for transactions
   - Always fall back to the direct provider for transaction signing/sending

## Correct Implementation Pattern

```typescript
// Get a signature based on wallet type
let signature: string;
if (wallet.adapter.name === 'Phantom') {
  // Use Phantom's injected provider
  const provider = (window as any).solana;
  if (!provider || !provider.isPhantom) {
    throw new Error('Phantom provider not found');
  }
  // IMPORTANT: The response object contains the signature
  const response = await provider.signAndSendTransaction(transaction);
  signature = response.signature;
} else if (wallet.adapter.name === 'Solflare') {
  // Use Solflare's injected provider
  const provider = (window as any).solflare;
  if (!provider) {
    throw new Error('Solflare provider not found');
  }
  // IMPORTANT: The response object contains the signature
  const response = await provider.signAndSendTransaction(transaction);
  signature = response.signature;
} else {
  // Fallback to adapter method for other wallets
  signature = await wallet.adapter.sendTransaction(transaction, connection);
}
```

## Transaction Status Monitoring

After sending a transaction, it's important to monitor its status:

```typescript
// Poll for status with limited attempts
const MAX_ATTEMPTS = 30;
const POLL_INTERVAL = 1000; // 1 second

let confirmed = false;
let attempts = 0;

while (!confirmed && attempts < MAX_ATTEMPTS) {
  attempts++;
  const { value } = await connection.getSignatureStatus(signature);
  
  if (value) {
    const status = value.confirmationStatus;
    console.log(`Status: ${status || 'processing'}`);
    
    if (status === 'confirmed' || status === 'finalized') {
      confirmed = true;
      break;
    }
    
    if (value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(value.err)}`);
    }
  }
  
  // Wait before next poll
  await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
}
```

## Common Issues & Solutions

1. **"Provider not found" error**
   - Make sure Phantom/Solflare extension is installed and properly connected
   - Check if `window.solana` or `window.solflare` exists before trying to use it

2. **Transaction not confirming**
   - Implement proper polling for transaction status
   - Set a reasonable timeout (30 seconds) to avoid waiting indefinitely

3. **"Cannot read property 'signature' of undefined"**
   - This often indicates a problem with extracting the signature from the provider response
   - Always ensure you're using `response.signature` correctly

4. **"Transaction simulation failed" errors**
   - Check transaction parameters (e.g., fees, account validation)
   - Consider adding `{ skipPreflight: true }` as an option when calling `signAndSendTransaction` 