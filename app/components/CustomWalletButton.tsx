'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useEffect, useState } from 'react';

const CustomWalletButton = () => {
  const { wallets, select, connected, disconnect, publicKey } = useWallet();
  const [isMobile, setIsMobile] = useState(false);
  const [isVerySmallScreen, setIsVerySmallScreen] = useState(false);

  // Check if device is mobile or very small screen
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsVerySmallScreen(window.innerWidth < 400);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Allow all wallet adapters
  const allowedWallets = wallets;

  const handleConnect = useCallback(() => {
    if (allowedWallets.length > 0) {
      // Show wallet selection modal instead of auto-selecting
      // This will let users choose any wallet including Phantom
      const walletModal = document.querySelector('.wallet-adapter-modal-wrapper');
      if (walletModal) {
        // If the modal element exists, it means the modal component is mounted
        // Set the modal to be visible
        document.querySelector('.wallet-adapter-modal')?.classList.add('wallet-adapter-modal-fade-in');
        document.querySelector('.wallet-adapter-modal')?.setAttribute('aria-hidden', 'false');
      } else {
        console.warn('Wallet modal not found, falling back to first wallet');
        select(allowedWallets[0].adapter.name);
      }
    } else {
      console.warn('No wallet found');
    }
  }, [allowedWallets, select]);

  // Format wallet address for display
  const formattedAddress = publicKey 
    ? isVerySmallScreen
      ? publicKey.toBase58().slice(0, 2) + '..' + publicKey.toBase58().slice(-2)
      : publicKey.toBase58().slice(0, 4) + '...' + publicKey.toBase58().slice(-4)
    : '';

  return (
    <div>
      {connected ? (
        <button 
          onClick={disconnect} 
          className="wallet-adapter-button"
          aria-label="Disconnect wallet"
        >
          {isMobile ? 'Disc' : 'Disconnect'}{' '}
          {formattedAddress}
        </button>
      ) : (
        <button 
          onClick={handleConnect} 
          className="wallet-adapter-button"
          aria-label="Connect wallet"
        >
          {isMobile ? 'Connect' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
};

export default CustomWalletButton;
