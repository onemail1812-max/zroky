
const API_URL = process.env.API_URL || 'http://localhost:8000';

/** @type {import('next').NextConfig} */
const nextConfig = {
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
        ]
    },
};

export default nextConfig;
