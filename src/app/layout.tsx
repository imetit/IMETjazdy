import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import SWRProvider from "@/components/SWRProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://imetjazdy.vercel.app'),
  title: {
    default: 'IMET Jazdy — HR a vozový park v jednom systéme',
    template: '%s · IMET Jazdy',
  },
  description: 'Komplexný systém pre dochádzku, knihu jázd, mzdové podklady, faktúry, dovolenky a vozový park. Multi-firma, GDPR-ready, 2FA, EU hosting.',
  applicationName: 'IMET Jazdy',
  authors: [{ name: 'IMET, a.s.' }],
  generator: 'Next.js',
  keywords: ['kniha jazd', 'dochádzka', 'fleet management', 'HR systém', 'mzdové podklady', 'faktúry', 'GDPR', 'Slovensko'],
  robots: { index: true, follow: true },
  themeColor: '#0d9488',
  icons: { icon: '/icon.ico', apple: '/icon-192.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d9488" />
      </head>
      <body><SWRProvider><ToastProvider>{children}</ToastProvider></SWRProvider></body>
    </html>
  );
}
