'use client';

import { TokenCreator } from '@/app/components/TokenCreator';
import { Suspense } from 'react';

export default function LaunchSolanaTokenPage() {
  return (
    <div className="min-h-screen py-12 bg-[#0B0B1E]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text mb-4">
            Launch Your Solana Token
          </h1>
          <p className="text-lg text-white/70">
            Professional token launch platform with built-in security features.
            Launch with confidence.
          </p>
        </div>
        
        <Suspense fallback={<div className="p-8 text-center">Loading token creator...</div>}>
          <TokenCreator />
        </Suspense>
        
        <div className="mt-16 prose prose-invert max-w-none">
          <h2 className="text-2xl font-bold text-white mb-4">
            Professional Token Launch Features
          </h2>
          <ul className="space-y-4 text-white/70">
            <li>🚀 One-click token deployment to Solana mainnet</li>
            <li>🛡️ Advanced security features and authority management</li>
            <li>💫 Professional token metadata and branding</li>
            <li>📊 Full transaction transparency</li>
            <li>⚡ Instant token creation and deployment</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 