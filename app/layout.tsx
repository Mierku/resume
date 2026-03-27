import type { Metadata } from 'next'
import Script from 'next/script'
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
    <html lang="zh-CN" suppressHydrationWarning className="font-sans" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function () {
            const theme = localStorage.getItem('theme')
              || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', theme);
          })();`}
        </Script>
        {children}
        <Toaster
          position="top-center"
          visibleToasts={1}
          toastOptions={{
            duration: 2000,
            style: {
              background: 'var(--toast-bg)',
              border: '1px solid var(--toast-border)',
              color: 'var(--toast-text)',
              borderRadius: '18px',
              boxShadow: 'var(--toast-shadow)',
              padding: '12px 14px',
            },
          }}
        />
      </body>
    </html>
  )
}
