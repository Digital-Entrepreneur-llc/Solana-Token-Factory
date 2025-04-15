'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import dynamic from 'next/dynamic';
import { useMemo, useEffect, useState } from 'react';
import PromoBanner from './components/PromoBanner';

import '@solana/wallet-adapter-react-ui/styles.css';
import '@/app/globals.css';

const Navbar = dynamic(() => import('@components/Navbar'), { ssr: false });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_RPC_ENDPOINT!;
  const [mounted, setMounted] = useState(false);

  // This ensures wallet adapter runs on client side only
  useEffect(() => {
    setMounted(true);
  }, []);

  // Support multiple wallet adapters including Phantom
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter()
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true} localStorageKey="solana-token-factory-wallet">
        <WalletModalProvider>
          {mounted && (
            <div className="min-h-screen bg-[#0B0B1E]">
              <Navbar />
              {/* Space for navbar */}
              <div className="pt-16">
                <PromoBanner />
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
                  <main>{children}</main>
                </div>
              </div>
            </div>
          )}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
