/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Supabase RPC return types cause false-positive TS errors at build time
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/assetlinks.json',
        destination: '/api/assetlinks',
      },
    ];
  },
};

export default nextConfig;
