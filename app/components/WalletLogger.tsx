'use client';

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

// Wallet Logger Component
// Logs: RPC endpoint, adapter name, connection status, pubkey & errors
export default function WalletLogger() {
  const { wallet, publicKey, connecting, connected, disconnecting } = useWallet();

  // adapter name
  useEffect(() => {
    console.log('[Solana] wallet adapter:', wallet?.adapter.name ?? 'none');
  }, [wallet]);

  // status flags
  useEffect(() => {
    console.log('[Solana] status:', { connecting, connected, disconnecting });
  }, [connecting, connected, disconnecting]);

  // pubkey when connected
  useEffect(() => {
    if (publicKey) {
      console.log('[Solana] publicKey:', publicKey.toBase58());
    }
  }, [publicKey]);

  // any adapter errors
  useEffect(() => {
    const adapter = wallet?.adapter;
    if (!adapter) return;
    const onError = (err: Error) =>
      console.error(`[Solana][${adapter.name}] error:`, err);
    adapter.on('error', onError);
    return () => {
      adapter.off('error', onError);
    };
  }, [wallet]);

  return null;
} 