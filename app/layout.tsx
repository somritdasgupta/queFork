import '@/styles/globals.css'
import { Inter } from 'next/font/google'
import { WebSocketWrapper } from '@/components/websocket/websocket-wrapper'
import { Preloader } from '@/components/preloader'
import { Favicon } from '@/components/favicon'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>queFork • REST API Testing</title>
        <Favicon />
      </head>
      <body className={inter.className}>
        <Preloader />
        <div className="contents animate-unblur">
          <WebSocketWrapper>
            {children}
          </WebSocketWrapper>
        </div>
      </body>
    </html>
  )
}