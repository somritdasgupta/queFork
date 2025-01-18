import '@/styles/globals.css'
import { Inter } from 'next/font/google'
import WebSocketHandler from '@/components/WebSocketHandler'

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
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <WebSocketHandler />
        {children}
      </body>
    </html>
  )
}