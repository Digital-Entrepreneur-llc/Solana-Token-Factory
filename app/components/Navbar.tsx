'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const navBackground = 'bg-[#1B1B1B]/80 backdrop-blur-md border-b border-[#343434]';
const gradientText = 'text-transparent bg-clip-text bg-gradient-to-r from-[#9945FF] to-[#14F195]';

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/create-solana-token', label: 'Create Token' },
    { href: '/launch-solana-token', label: 'Launch Token' },
    { href: '/spl-token-creation', label: 'SPL Tokens' },
  ];

  // Add scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 transition-all duration-300 ${scrolled ? 'h-14 shadow-md' : 'h-16'} ${navBackground} z-50`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <Image 
                src="/favicon.ico"
                alt="Logo"
                width={36}
                height={36}
                className="opacity-90"
                priority
              />
              {/* Desktop title with gradient text */}
              <h1 className={`text-xl font-bold ${gradientText} hidden md:block`}>
                Solana Token Factory
              </h1>
              {/* Mobile title with gradient text - single line at smaller size */}
              <h1 className={`text-xs font-bold leading-tight tracking-tight ${gradientText} md:hidden block`}>
                Solana Token Factory
              </h1>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive(link.href)
                      ? 'bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {mounted && <WalletMultiButton />}
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-white/70 hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#9945FF]/50"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="block h-5 w-5" />
              ) : (
                <Menu className="block h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isActive(link.href)
                    ? 'bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {/* Global styles for the wallet button and modal */}
      <style jsx global>{`
        .wallet-adapter-button {
          background: linear-gradient(to right, #9945FF, #14F195) !important;
          transition: all 0.2s ease !important;
          padding: 0 1.25rem !important;
          height: 2.25rem !important;
          border-radius: 0.5rem !important;
          font-weight: 600 !important;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          min-width: 110px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .wallet-adapter-button:hover {
          opacity: 0.85 !important;
          transform: translateY(-1px) !important;
        }

        .wallet-adapter-button:not([disabled]):hover {
          background: linear-gradient(to right, #8935EE, #13E085) !important;
        }

        .wallet-adapter-modal-wrapper {
          background: #1B1B1B !important;
          border: 1px solid #343434 !important;
          border-radius: 1rem !important;
        }

        .wallet-adapter-modal-button-close {
          background: #343434 !important;
        }

        .wallet-adapter-modal-title {
          color: white !important;
        }

        .wallet-adapter-modal-list {
          margin: 0 !important;
        }

        .wallet-adapter-modal-list li {
          background: #232323 !important;
          border: 1px solid #343434 !important;
          border-radius: 0.5rem !important;
          margin: 0.5rem 0 !important;
          padding: 0.75rem 1rem !important;
          transition: all 0.2s ease !important;
        }

        .wallet-adapter-modal-list li:hover {
          background: rgba(153, 69, 255, 0.1) !important;
          border-color: rgba(153, 69, 255, 0.3) !important;
        }

        @media (max-width: 640px) {
          .wallet-adapter-button {
            padding: 0 0.75rem !important;
            height: 1.875rem !important;
            font-size: 0.8125rem !important;
            min-width: 80px;
          }
        }

        @media (max-width: 400px) {
          .wallet-adapter-button {
            padding: 0 0.5rem !important;
            height: 1.75rem !important;
            font-size: 0.75rem !important;
            min-width: 70px;
          }
        }

        @media (max-width: 340px) {
          .wallet-adapter-button {
            padding: 0 0.375rem !important;
            min-width: 65px;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
