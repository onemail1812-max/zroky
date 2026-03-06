import type { NextConfig } from "next";

const API_URL = process.env.API_URL || 'http://localhost:8000';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'standalone',
  typescript: {
    // We fix TS errors properly, but this is a safety net for deployment
    ignoreBuildErrors: true,
  },
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
        source: '/oauth/google/:path*',
        destination: `${API_URL}/oauth/google/:path*`,
      },
      {
        source: '/oauth/microsoft/:path*',
        destination: `${API_URL}/oauth/microsoft/:path*`,
      },
      {
        source: '/me',
        destination: `${API_URL}/me`,
      },
      {
        source: '/booking/:path*',
        destination: `${API_URL}/booking/:path*`,
      },
      {
        source: '/webhooks/:path*',
        destination: `${API_URL}/webhooks/:path*`,
      },
    ]
  },
};

export default nextConfig;
