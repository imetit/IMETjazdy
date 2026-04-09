// src/app/(zamestnanec)/dovolenka/page.tsx
import { getMyDovolenky, getMyDovolenkaNarok } from '@/actions/dovolenky'
import DovolenkaForm from '@/components/dochadzka/DovolenkaForm'
import type { Dovolenka } from '@/lib/dovolenka-types'

export default async function DovolenkaPage() {
  const [dovolenkyResult, narokResult] = await Promise.all([
    getMyDovolenky(),
    getMyDovolenkaNarok(),
  ])

  return (
    <DovolenkaForm
      dovolenky={(dovolenkyResult.data as Dovolenka[]) || []}
      narok={narokResult.data || { narok: 20, cerpane: 0, zostatok: 20 }}
    />
  )
}
