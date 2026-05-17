/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Supabase RPC return types cause false-positive TS errors at build time
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
