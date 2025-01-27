import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { WebSocketWrapper } from "@/components/websocket/websocket-wrapper";
import { Preloader } from "@/components/preloader";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "queFork / API Testing",
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
    {
      rel: "apple-touch-icon",
      url: "/favicon.ico",
    },
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "queFork",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e293b" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" }
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
