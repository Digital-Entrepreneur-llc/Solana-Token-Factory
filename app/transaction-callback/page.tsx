'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function TransactionCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    try {
      // Get parameters from the URL
      const session = searchParams.get('session');
      const signature = searchParams.get('signature');
      
      if (session && signature) {
        console.log('Processing transaction callback:', { session, signature });
        
        // If there's an opener (same window/tab)
        if (window.opener) {
          // Post message to opener window
          window.opener.postMessage({
            session,
            signature
          }, window.location.origin);
          
          // Close this window/tab if it was opened as a popup
          window.close();
        } else {
          // No opener, redirect back to the main page
          router.push('/?transaction=complete&signature=' + signature);
        }
      } else {
        // If no signature, redirect back to the main page
        router.push('/');
      }
    } catch (error) {
      console.error('Error processing transaction callback:', error);
      router.push('/');
    }
  }, [searchParams, router]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="text-white p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Transaction Processing</h1>
        <p className="mb-4">Processing your transaction...</p>
        <div className="w-16 h-16 border-t-4 border-blue-500 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-sm text-gray-400">You will be redirected automatically.</p>
      </div>
    </div>
  );
}

export default function TransactionCallback() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <div className="text-white p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Transaction</h1>
          <div className="w-16 h-16 border-t-4 border-blue-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <TransactionCallbackContent />
    </Suspense>
  );
} 