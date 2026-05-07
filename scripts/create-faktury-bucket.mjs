import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=')
  if (k && v) acc[k.trim()] = v.trim()
  return acc
}, {})

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { error } = await sb.storage.createBucket('faktury', {
  public: false,
  fileSizeLimit: 25 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
})

if (error && !error.message.includes('already exists')) {
  console.error('Failed:', error.message)
  process.exit(1)
}
console.log('Bucket "faktury" pripravený (25MB, PDF/JPG/PNG/WebP)')
