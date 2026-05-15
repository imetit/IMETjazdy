import type { MetadataRoute } from 'next'
import { brand } from '@/lib/brand'

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
    sitemap: `https://${brand.domain}/sitemap.xml`,
    host: `https://${brand.domain}`,
  }
}
