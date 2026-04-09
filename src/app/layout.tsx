import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IMET Kniha Jázd",
  description: "Interný systém na evidenciu služobných ciest",
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
      <body>{children}</body>
    </html>
  );
}
