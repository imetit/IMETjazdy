'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import TabletScreen from '@/components/dochadzka/TabletScreen'
import type { SmerDochadzky } from '@/lib/dochadzka-types'

function DochadzkaContent() {
  const searchParams = useSearchParams()
  const smer = (searchParams.get('smer') || 'prichod') as SmerDochadzky
  const demo = searchParams.get('demo') === '1'

  return <TabletScreen defaultSmer={smer} demoMode={demo} />
}

export default function DochadzkaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Načítavam...</div>}>
      <DochadzkaContent />
    </Suspense>
  )
}
