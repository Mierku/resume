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

  // Allow local dev hosts to access Next.js dev resources (HMR, chunks, etc.)
  allowedDevOrigins: ['localhost', '127.0.0.1', 'gbe362f6.natappfree.cc'],

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
