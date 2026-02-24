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
        destination: `${API_URL}/api/v1/:path*`,
      },
      {
        source: '/health/:path*',
        destination: `${API_URL}/health/:path*`,
      },
      {
        source: '/aaliyah/:path*',
        destination: `${API_URL}/aaliyah/:path*`,
      },
      {
        source: '/assist/:path*',
        destination: `${API_URL}/assist/:path*`,
      },
      {
        source: '/oauth/:path*',
        destination: `${API_URL}/oauth/:path*`,
      },
      {
        source: '/me',
        destination: `${API_URL}/me`,
      },
    ]
  },
};

export default nextConfig;
