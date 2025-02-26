import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { WebSocketWrapper } from "@/components/websocket/websocket-wrapper";
import { Preloader } from "@/components/preloader";
import type { Metadata, Viewport } from "next";
import { ConnectionLostBackdrop } from "./components/ConnectionLostBackdrop";
import { Toaster } from "sonner";
import { ServiceWorkerProvider } from "./components/ServiceWorkerRegistration";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://quefork.somrit.in"),
  title: {
    default: "queFork / API Testing",
    template: "%s | queFork",
  },
  description:
    "A modern, open-source API testing tool for developers. Test REST APIs and WebSockets with an intuitive interface.",
  keywords: [
    "API testing",
    "REST client",
    "WebSocket client",
    "API development",
    "developer tools",
    "HTTP client",
    "API documentation",
    "API testing tool",
    "Open-Source API Testing",
    "Serverless API Testing",
  ],
  authors: [
    { name: "Somrit Dasgupta", url: "https://github.com/somritdasgupta" },
  ],
  creator: "Somrit Dasgupta",
  publisher: "queFork",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://quefork.somrit.in",
    title: "queFork / API Testing",
    description:
      "A modern, open-source API testing tool for developers. Test REST APIs and WebSockets with a beautiful, intuitive interface.",
    siteName: "queFork",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "queFork / API Testing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "queFork / API Testing",
    description: "A modern, open-source API testing tool for developers",
    creator: "@somritdasgupta",
    images: ["/twitter-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/public/icons/icon192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/shortcut-icon.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "queFork",
  },
  applicationName: "queFork",
  category: "Development Tools",
  classification: "API Testing Tool",
  verification: {
    google: "i will add this later",
  },
  alternates: {
    canonical: "https://quefork.somrit.in",
    languages: {
      "en-US": "https://quefork.somrit.in",
    },
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "dark",
  interactiveWidget: "resizes-visual",
  height: "device-height",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className="prevent-elastic"
    >
      <head>
        <link rel="canonical" href="https://quefork.somrit.in" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="queFork" />
        <meta name="apple-mobile-web-app-title" content="queFork" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="format-detection" content="telephone=no" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="theme-color" content="#0f172a" />
        {/* Add offline-specific meta */}
        <meta name="offline-ready" content="true" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "queFork",
              applicationCategory: "DeveloperApplication",
              browserRequirements: "Requires JavaScript",
              operatingSystem: "All",
              permissions: "API Testing",
              url: "https://quefork.somrit.in",
            }),
          }}
        />
      </head>
      <body
        className={`${inter.className} antialiased overflow-hidden`}
        suppressHydrationWarning
      >
        <div id="root" className="overflow-hidden" suppressHydrationWarning>
          <ServiceWorkerProvider />
          <Preloader />
          <div className="contents animate-[unblur_200ms_ease-in]">
            <WebSocketWrapper>{children}</WebSocketWrapper>
          </div>
          <ConnectionLostBackdrop />
        </div>
        <Toaster position="top-center" theme="dark" closeButton richColors />
      </body>
    </html>
  );
}
