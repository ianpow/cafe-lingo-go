import type { Metadata } from "next";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OfflineBanner } from "@/components/OfflineBanner";
import { HelpMeSay } from "@/components/HelpMeSay";
import "./globals.css";

import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "CafeLingo Go — Learn Languages for Your Holiday",
  description:
    "Personalised, deadline-driven language learning with AI-powered conversations and 3D avatar tutoring",
  manifest: "/manifest.json",
  themeColor: "#10b981",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CafeLingo Go",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('cafelingo-go-theme')||'{}');var v=t.state&&t.state.theme||'system';if(v==='system'){v=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',v)}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()`,
          }}
        />
        <Script id="importmap" type="importmap" strategy="beforeInteractive">
          {JSON.stringify({
            imports: {
              "three": "https://cdn.jsdelivr.net/npm/three@0.183.2/build/three.module.js",
              "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.183.2/examples/jsm/",
              "three/": "https://cdn.jsdelivr.net/npm/three@0.183.2/",
            },
          })}
        </Script>
      </head>
      <body className="antialiased min-h-screen">
        <ThemeProvider>
          <OfflineBanner />
          {children}
          <HelpMeSay />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
