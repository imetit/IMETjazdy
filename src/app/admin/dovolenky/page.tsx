// src/app/admin/dovolenky/page.tsx
import { getDovolenkyNaSchvalenie } from '@/actions/dovolenky'
import DovolenkySchvalovanie from '@/components/dochadzka/DovolenkySchvalovanie'
import type { Dovolenka } from '@/lib/dovolenka-types'

export default async function AdminDovolenkyPage() {
  const result = await getDovolenkyNaSchvalenie()
  return <DovolenkySchvalovanie dovolenky={(result.data as Dovolenka[]) || []} />
}
