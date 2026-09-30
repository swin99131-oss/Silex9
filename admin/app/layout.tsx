import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { Fraunces, Inter, Tajawal } from 'next/font/google'
import type { Metadata, Viewport } from 'next'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const tajawal = Tajawal({ subsets: ['arabic'], weight: ['400', '500', '700'], variable: '--font-tajawal' })
import './globals.css'

export const metadata: Metadata = {
  title: 'سالِكس — لوحة الإدارة',
  description: 'لوحة تحكم عربية لإدارة المنصة.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${fraunces.variable} ${inter.variable} ${tajawal.variable} antialiased`}>
        {children}
        <Toaster dir="rtl" position="top-left" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
