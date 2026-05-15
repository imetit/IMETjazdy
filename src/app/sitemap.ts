import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://imetjazdy.vercel.app'
  const now = new Date()
  return [
    { url: `${base}/`,        lastModified: now, changeFrequency: 'monthly',  priority: 1.0 },
    { url: `${base}/login`,   lastModified: now, changeFrequency: 'yearly',   priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly',   priority: 0.4 },
    { url: `${base}/terms`,   lastModified: now, changeFrequency: 'yearly',   priority: 0.4 },
    { url: `${base}/security`, lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
  ]
}
