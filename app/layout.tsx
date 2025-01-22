import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { WebSocketWrapper } from "@/components/websocket/websocket-wrapper";
import { Preloader } from "@/components/preloader";
import type { Metadata } from 'next';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'queFork • REST API Testing',
  icons: [{
    rel: 'icon',
    url: '/favicon.ico',
  }, {
    rel: 'apple-touch-icon',
    url: '/favicon.ico',
  }]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Preloader />
        <div className="contents animate-unblur">
          <WebSocketWrapper>{children}</WebSocketWrapper>
        </div>
      </body>
    </html>
  );
}
