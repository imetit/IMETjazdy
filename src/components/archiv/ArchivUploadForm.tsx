// src/components/archiv/ArchivUploadForm.tsx
'use client'

import { useState, useRef } from 'react'
import { Upload, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { TypDokumentuArchiv } from '@/lib/archiv-types'
import { TYP_DOKUMENTU_ARCHIV_LABELS } from '@/lib/archiv-types'
import { uploadDokumentArchiv } from '@/actions/archiv'
import { useRouter } from 'next/navigation'

export default function ArchivUploadForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [typ, setTyp] = useState<TypDokumentuArchiv>('faktura')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const result = await uploadDokumentArchiv(formData)

    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/admin/archiv'), 1500)
    }
    setLoading(false)
  }

  const isFaktura = typ === 'faktura'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/archiv" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
        <h2 className="text-2xl font-bold">Nahrať dokument</h2>
      </div>

      {success && <p className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">Dokument nahraný. Presmerovanie...</p>}
      {error && <p className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Súbor *</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">{fileName || 'Kliknite alebo pretiahnite súbor'}</p>
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOCX, XLSX — max 25MB</p>
            <input
              ref={fileRef}
              type="file"
              name="file"
              required
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              onChange={e => setFileName(e.target.files?.[0]?.name || '')}
              className="hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Názov dokumentu *</label>
            <input name="nazov" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ *</label>
            <select name="typ" value={typ} onChange={e => setTyp(e.target.value as TypDokumentuArchiv)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {(Object.keys(TYP_DOKUMENTU_ARCHIV_LABELS) as TypDokumentuArchiv[]).map(t => (
                <option key={t} value={t}>{TYP_DOKUMENTU_ARCHIV_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>

        {isFaktura && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dodávateľ</label>
              <input name="dodavatel" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Číslo faktúry</label>
              <input name="cislo_faktury" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suma (€)</label>
              <input name="suma" type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Splatnosť</label>
              <input name="datum_splatnosti" type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tagy (oddelené čiarkou)</label>
          <input name="tagy" placeholder="napr. energie, IT, kancelária" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Popis</label>
          <textarea name="popis" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Oddelenie</label>
          <input name="oddelenie" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/admin/archiv" className="px-4 py-2 text-sm text-gray-600">Zrušiť</Link>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
            {loading ? 'Nahrávam...' : 'Nahrať'}
          </button>
        </div>
      </form>
    </div>
  )
}
