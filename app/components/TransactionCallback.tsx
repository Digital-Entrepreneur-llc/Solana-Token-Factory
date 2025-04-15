'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const TransactionCallback = () => {
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Ensure we're running in the browser
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sig = params.get('signature');
      if (sig) {
        setSignature(sig);
      } else {
        setError('No signature found in the callback URL.');
      }
    }
  }, []);

  const handleContinue = () => {
    // Redirect to your homepage or token creation page after processing
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B1E] text-white p-4">
      {error && (
        <div className="bg-red-500/20 p-4 rounded mb-4">
          <h1 className="text-xl font-bold">Error</h1>
          <p>{error}</p>
        </div>
      )}
      {signature ? (
        <div className="p-6 rounded-lg bg-green-500/20">
          <h1 className="text-2xl font-bold mb-4">Transaction Submitted!</h1>
          <p>Your transaction signature:</p>
          <code className="block mt-2 break-words">{signature}</code>
          <button
            className="mt-6 px-4 py-2 bg-[#9945FF] hover:bg-[#14F195] rounded transition-colors duration-200"
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
      ) : (
        <div>Loading transaction details...</div>
      )}
    </div>
  );
};

export default TransactionCallback;
