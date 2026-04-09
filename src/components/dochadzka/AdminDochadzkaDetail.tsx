// src/components/dochadzka/AdminDochadzkaDetail.tsx
'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Modal from '@/components/Modal'
import type { DochadzkaZaznam, DovodDochadzky, SmerDochadzky } from '@/lib/dochadzka-types'
import { DOVOD_LABELS } from '@/lib/dochadzka-types'
import { calculateDenneOdpracovane, formatMinutyNaHodiny, getMesacnyFond } from '@/lib/dochadzka-utils'
import { addManualDochadzka, deleteDochadzkaZaznam } from '@/actions/admin-dochadzka'
import { formatDate } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  userName: string
  fondHodiny: number
  zaznamy: DochadzkaZaznam[]
  mesiac: string
}

const DOVODY: DovodDochadzky[] = ['praca','obed','lekar','lekar_doprovod','sluzobne','sluzobna_cesta','prechod','fajcenie','sukromne','dovolenka']

export default function AdminDochadzkaDetail({ userId, userName, fondHodiny, zaznamy, mesiac }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const [rok, mes] = mesiac.split('-').map(Number)

  // Group by day
  const dny = new Map<string, DochadzkaZaznam[]>()
  for (const z of zaznamy) {
    if (!dny.has(z.datum)) dny.set(z.datum, [])
    dny.get(z.datum)!.push(z)
  }

  let celkoveMin = 0
  const daysInMonth = new Date(rok, mes, 0).getDate()
  const denneData: { datum: string; zaznamy: DochadzkaZaznam[]; odpracovane: number }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${rok}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dz = dny.get(dateStr) || []
    const odpr = calculateDenneOdpracovane(dz)
    celkoveMin += odpr
    if (dz.length > 0) denneData.push({ datum: dateStr, zaznamy: dz, odpracovane: odpr })
  }

  const fondMin = getMesacnyFond(rok, mes - 1, fondHodiny)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.set('user_id', userId)
    const datum = formData.get('datum') as string
    const cas_time = formData.get('cas_time') as string
    formData.set('cas', `${datum}T${cas_time}:00`)
    const result = await addManualDochadzka(formData)
    if (result?.error) { setError(result.error) }
    else { setShowAdd(false) }
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj zmazať tento záznam?')) return
    await deleteDochadzkaZaznam(id, userId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/dochadzka?mesiac=${mesiac}`} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold">{userName}</h1>
            <p className="text-gray-500">Dochádzka za {mesiac}</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium">
          <Plus size={16} /> Pridať záznam
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Odpracované</p>
          <p className="text-xl font-bold">{Math.floor(celkoveMin / 60)}h {celkoveMin % 60}min</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Fond</p>
          <p className="text-xl font-bold">{Math.floor(fondMin / 60)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Rozdiel</p>
          <p className={`text-xl font-bold ${celkoveMin - fondMin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatMinutyNaHodiny(celkoveMin - fondMin)}
          </p>
        </div>
      </div>

      {denneData.map(({ datum, zaznamy: dz, odpracovane }) => (
        <div key={datum} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{formatDate(datum)} <span className="text-gray-400 font-normal text-sm">{new Date(datum).toLocaleDateString('sk-SK', { weekday: 'long' })}</span></h3>
            <span className="text-sm text-gray-500">{Math.floor(odpracovane / 60)}h {odpracovane % 60}min</span>
          </div>
          <div className="space-y-1">
            {dz.sort((a, b) => new Date(a.cas).getTime() - new Date(b.cas).getTime()).map(z => (
              <div key={z.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${z.smer === 'prichod' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {z.smer === 'prichod' ? 'P' : 'O'}
                  </span>
                  <span className="font-mono text-xs">{new Date(z.cas).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-gray-600">{DOVOD_LABELS[z.dovod]}</span>
                  <span className="text-xs text-gray-400">({z.zdroj})</span>
                </div>
                <button onClick={() => handleDelete(z.id)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {denneData.length === 0 && <p className="text-gray-500 text-center py-8">Žiadne záznamy za tento mesiac</p>}

      {showAdd && (
        <Modal title="Pridať manuálny záznam" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dátum *</label>
                <input name="datum" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Čas *</label>
                <input name="cas_time" type="time" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Smer *</label>
                <select name="smer" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="prichod">Príchod</option>
                  <option value="odchod">Odchod</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dôvod *</label>
                <select name="dovod" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {DOVODY.map(d => <option key={d} value={d}>{DOVOD_LABELS[d]}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600">Zrušiť</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                {loading ? 'Ukladám...' : 'Pridať'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
