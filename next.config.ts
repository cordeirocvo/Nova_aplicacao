import type { NextConfig } from "next";

// Fix para certificado SSL do Supabase em ambiente local
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Touch to force restart of Next.js dev server for new Prisma client types
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;