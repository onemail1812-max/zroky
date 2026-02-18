import type { NextConfig } from "next";

const API_URL = process.env.API_URL || 'http://localhost:8000';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_URL}/:path*`, // Proxy to Python Backend (Root)
      },
      {
        source: '/aaliyah/:path*',
        destination: `${API_URL}/aaliyah/:path*`,
      },
      {
        source: '/assist/:path*',
        destination: `${API_URL}/assist/:path*`,
      },
    ]
  },
};

export default nextConfig;
