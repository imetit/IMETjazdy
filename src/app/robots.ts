import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/privacy', '/terms', '/security'],
        disallow: [
          '/admin/',
          '/fleet/',
          '/api/',
          '/dochadzka',
          '/dochadzka-prehled',
          '/dovolenka',
          '/moja-karta',
          '/moje',
          '/moje-jazdy',
          '/moje-vozidlo',
          '/manual',
          '/nahlasit-problem',
          '/nahlasit-udalost',
          '/notifikacie',
          '/nova-jazda',
          '/profil/',
          '/sluzobna-cesta',
        ],
      },
    ],
    sitemap: 'https://imetjazdy.vercel.app/sitemap.xml',
    host: 'https://imetjazdy.vercel.app',
  }
}
