'use client';

import Script from 'next/script';

const GA_MEASUREMENT_ID = 'G-735TSTZVSK'; // Replace with your actual GA4 ID when you have it

export default function GoogleAnalytics() {
  return (
    <>
      {/* Google Analytics */}
      <Script 
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
} 