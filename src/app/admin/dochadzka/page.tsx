// src/app/admin/dochadzka/page.tsx
'use client'

import { useState, useEffect } from 'react'
import AdminDochadzkaTable from '@/components/dochadzka/AdminDochadzkaTable'
import { getDochadzkaZamestnancov, getDnesVPraci } from '@/actions/admin-dochadzka'
import type { DochadzkaZaznam } from '@/lib/dochadzka-types'

export default function AdminDochadzkaPage() {
  const now = new Date()
  const [mesiac, setMesiac] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [profiles, setProfiles] = useState<any[]>([])
  const [zaznamy, setZaznamy] = useState<DochadzkaZaznam[]>([])
  const [vPraci, setVPraci] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [result, vpResult] = await Promise.all([
        getDochadzkaZamestnancov(mesiac),
        getDnesVPraci(),
      ])
      setProfiles(result.profiles || [])
      setZaznamy(result.zaznamy || [])
      setVPraci(vpResult.data || [])
      setLoading(false)
    }
    load()
  }, [mesiac])

  if (loading) return <div className="text-gray-500 p-8">Načítavam...</div>

  return <AdminDochadzkaTable profiles={profiles} zaznamy={zaznamy} vPraci={vPraci} mesiac={mesiac} onMesiacChange={setMesiac} />
}
