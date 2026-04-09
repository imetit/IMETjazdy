// src/app/(zamestnanec)/sluzobna-cesta/page.tsx
import { getMyCesty } from '@/actions/sluzobne-cesty'
import SluzobnasCestaForm from '@/components/cesty/SluzobnasCestaForm'
import type { SluzobnasCesta } from '@/lib/cesty-types'

export default async function SluzobnasCestaPage() {
  const result = await getMyCesty()
  return <SluzobnasCestaForm cesty={(result.data as SluzobnasCesta[]) || []} />
}
