import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Dochádzka',
  description: 'Dochádzkový terminál',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Dochádzka',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#031457',
}

export default function DochadzkaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-slate-900 select-none overscroll-none"
      style={{ touchAction: 'manipulation', WebkitUserSelect: 'none' }}
    >
      {children}
    </div>
  )
}
