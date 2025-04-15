import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Solana Token - Easy SPL Token Creation | Solana Token Factory',
  description: 'Create your Solana token easily with our professional token factory. Step-by-step SPL token creation with built-in security features. No coding required.',
  keywords: 'Create Solana Token, SPL Token Creation, Solana Token Creator, create token on solana, solana token generator',
};

export default function CreateTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 