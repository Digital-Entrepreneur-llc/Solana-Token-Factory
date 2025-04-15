import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SPL Token Creation - Professional Solana Token Creation | Solana Token Factory',
  description: 'Create SPL tokens on Solana with our professional platform. Secure token creation with built-in authority management. Best practices for Solana Program Library tokens.',
  keywords: 'SPL Token Creation, Solana Program Library, SPL token creator, spl token ui, create token on solana, professional token creation',
};

export default function SPLTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 