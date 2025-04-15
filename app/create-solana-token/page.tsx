'use client';

import { TokenCreator } from '@/app/components/TokenCreator';
import { Suspense } from 'react';

export default function CreateSolanaTokenPage() {
  return (
    <div className="min-h-screen py-12 bg-[#0B0B1E]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text mb-4">
            Create Your Solana Token
          </h1>
          <p className="text-lg text-white/70">
            Professional-grade token creation with built-in security features.
            No coding required.
          </p>
        </div>
        
        <Suspense fallback={<div className="p-8 text-center">Loading token creator...</div>}>
          <TokenCreator />
        </Suspense>
        
        <div className="mt-16 prose prose-invert max-w-none">
          <h2 className="text-2xl font-bold text-white mb-4">
            Why Choose Our Solana Token Creator?
          </h2>
          <ul className="space-y-4 text-white/70">
            <li>✨ Easy-to-use interface - create tokens in minutes</li>
            <li>🛡️ Built-in security features and authority management</li>
            <li>💎 Professional-grade token creation standards</li>
            <li>🚀 Instant deployment to Solana mainnet</li>
            <li>📊 Full transaction transparency and fee visibility</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 