// src/app/admin/sluzobne-cesty/page.tsx
import { getAllCesty } from '@/actions/sluzobne-cesty'
import SluzobnesCestyTable from '@/components/cesty/SluzobnesCestyTable'
import type { SluzobnasCesta } from '@/lib/cesty-types'

export default async function AdminSluzobnesCestyPage() {
  const result = await getAllCesty()
  return <SluzobnesCestyTable cesty={(result.data as SluzobnasCesta[]) || []} />
}
