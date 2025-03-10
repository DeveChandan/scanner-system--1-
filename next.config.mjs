/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Optimize for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Configure image domains if needed
  images: {
    domains: [],
  },
  // Set environment variables for client
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001',
  },
  // Proxy API requests in development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ]
  },
}

export default nextConfig

