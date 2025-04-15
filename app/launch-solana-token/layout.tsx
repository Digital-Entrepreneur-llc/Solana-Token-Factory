import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch Solana Token - Professional Token Launch Platform | Solana Token Factory',
  description: 'Launch your Solana token with confidence. Professional token launch platform with built-in security features and authority management. Easy token deployment.',
  keywords: 'Launch Solana Token, Solana Token Launch, Token Deployment, launch token on solana, solana token launcher, professional token launch',
};

export default function LaunchTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 