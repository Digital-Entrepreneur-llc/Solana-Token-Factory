import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Providers } from './providers';
import Navbar from '@/app/components/Navbar';
import Breadcrumb from '@/app/components/Breadcrumb';
import Footer from '@/app/components/Footer';
import PromoBanner from '@/app/components/PromoBanner';
import GoogleAnalytics from './components/GoogleAnalytics';

export const metadata: Metadata = {
  title: 'Solana Token Factory - Create SPL Tokens Easily and Securely',
  description: 'Create and manage SPL tokens on Solana with our secure, easy-to-use token factory. Professional token creation with full authority management.',
  keywords: 'Solana token creator, create solana token, spl token creation, solana token factory, launch token on solana, spl token creator, best solana token creator, create a solana token, no code solana token creator, create a token on solana, create spl token, cheapest solana token creator, create a sol token, create solana tokens',
  openGraph: {
    title: 'Solana Token Factory - Create SPL Tokens Easily and Securely',
    description: 'Create and manage SPL tokens on Solana with our secure, easy-to-use token factory. Professional token creation with full authority management.',
    url: 'https://solanatokenfactory.com',
    siteName: 'Solana Token Factory',
    images: [
      {
        url: 'https://solanatokenfactory.com/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>
        <GoogleAnalytics />
        <Providers>
          <div className="flex flex-col min-h-screen bg-[#0B0B1E]">
            <Navbar />
            <div className="pt-16">
              <PromoBanner />
              <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
                <Breadcrumb />
                <main className="flex-grow">
                  {children}
                </main>
              </div>
            </div>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
