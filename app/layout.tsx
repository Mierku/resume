import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants'
import { siteOrigin } from '@/lib/seo'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ['简历', '求职', '投递', '自动填表', '浏览器插件'],
  openGraph: {
    type: 'website',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: siteOrigin,
    siteName: SITE_NAME,
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="font-sans">
      <body className="min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
              })();
            `,
          }}
        />
        {children}
        <Toaster
          position="top-center"
          visibleToasts={1}
          toastOptions={{
            duration: 2000,
            style: {
              background: 'color-mix(in srgb, var(--color-background) 94%, white)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
              borderRadius: '18px',
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.12)',
              padding: '12px 14px',
            },
          }}
        />
      </body>
    </html>
  )
}
