import type { NextConfig } from 'next'

const cdnOrigin = process.env.NEXT_PUBLIC_CDN_ORIGIN || ''
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || ''
const cdnHostname = (() => {
  if (!cdnOrigin) return null
  try {
    return new URL(cdnOrigin).hostname
  } catch {
    return null
  }
})()

const nextConfig: NextConfig = {
  // Enable React strict mode
  reactStrictMode: true,

  allowedDevOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],

  assetPrefix: assetPrefix || undefined,

  // Allow images from any domain for favicons
  images: {
    localPatterns: [
      {
        pathname: '/templates/**',
      },
      {
        pathname: '/icons/**',
      },
      {
        pathname: '/home/**',
      },
    ],
    remotePatterns: [
      ...(cdnHostname
        ? [
            {
              protocol: 'https' as const,
              hostname: cdnHostname,
            },
          ]
        : []),
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
