// src/app/(zamestnanec)/dochadzka-prehled/page.tsx
'use client'

import { useState, useEffect } from 'react'
import MojaDochadzka from '@/components/dochadzka/MojaDochadzka'
import type { DochadzkaZaznam } from '@/lib/dochadzka-types'

export default function DochadzkaPrehlad() {
  const now = new Date()
  const [mesiac, setMesiac] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [zaznamy, setZaznamy] = useState<DochadzkaZaznam[]>([])
  const [fondHodiny, setFondHodiny] = useState(8.5)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/moja-dochadzka?mesiac=${mesiac}`)
      const data = await res.json()
      setZaznamy(data.zaznamy || [])
      setFondHodiny(data.fondHodiny || 8.5)
      setLoading(false)
    }
    load()
  }, [mesiac])

  if (loading) return <div className="text-gray-500 p-8">Načítavam...</div>

  return <MojaDochadzka zaznamy={zaznamy} fondHodiny={fondHodiny} mesiac={mesiac} onMesiacChange={setMesiac} />
}
