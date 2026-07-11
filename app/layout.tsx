import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const body = Inter({ subsets: ['latin'], variable: '--font-body' })
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'NCF-Gradeschool-Voting',
  description: 'NCF Grade School Digital Election System — secure, live, kiosk-ready school voting.',
  icons: {
    icon: '/gradeschool-logo.png',
    apple: '/gradeschool-logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#121030',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${body.variable} ${display.variable} antialiased`}>
        <script
          // Restore saved theme before paint to avoid a flash.
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.theme==='light')document.documentElement.classList.remove('dark')}catch(e){}`,
          }}
        />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
