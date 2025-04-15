'use client';

import { TokenCreator } from '@/app/components/TokenCreator';
import { Suspense } from 'react';

export default function SPLTokenCreationPage() {
  return (
    <div className="min-h-screen py-12 bg-[#0B0B1E]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text mb-4">
            Professional SPL Token Creation
          </h1>
          <p className="text-lg text-white/70">
            Create Solana Program Library tokens with industry-standard security features.
            Built for professionals.
          </p>
        </div>
        
        <Suspense fallback={<div className="p-8 text-center">Loading token creator...</div>}>
          <TokenCreator />
        </Suspense>
        
        <div className="mt-16 prose prose-invert max-w-none">
          <h2 className="text-2xl font-bold text-white mb-4">
            SPL Token Creation Features
          </h2>
          <ul className="space-y-4 text-white/70">
            <li>🏆 Industry-standard SPL token implementation</li>
            <li>🔐 Advanced authority management</li>
            <li>📋 Comprehensive metadata support</li>
            <li>⚡ Optimized for performance</li>
            <li>🛡️ Built-in security best practices</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-white mb-4 mt-12">
            About SPL Tokens
          </h2>
          <p className="text-white/70">
            SPL (Solana Program Library) tokens are the standard for creating tokens on the Solana blockchain.
            Our platform ensures your tokens follow all best practices and security standards required for
            professional token deployment.
          </p>
        </div>
      </div>
    </div>
  );
} 