import type { NextConfig } from "next";

// Fix para certificado SSL do Supabase em ambiente local
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const nextConfig: NextConfig = {};

export default nextConfig;