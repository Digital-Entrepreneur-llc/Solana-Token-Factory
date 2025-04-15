/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only set output: 'export' in production
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  // Adding images config for static export
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
  },
  // These headers are ignored in static export, but kept here for reference
  // You'll need to configure these on your hosting platform
  async headers() {
    return [
      {
        source: '/.well-known/wallet-config.json',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Content-Type',
            value: 'application/json'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig; 